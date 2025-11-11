import { google } from 'npm:googleapis@160.0.0';
import { EmailRequest, EmailResponse, GmailConfig, SearchPeopleRequest, SearchPeopleResponse, OtherContactSearchResponse, GmailMessagePart, EmailContent, EmailAttachment, GetEmailResponse, SearchEmailsRequest, SearchEmailsResponse, EmailSearchResult, GmailMessageRequest, ModifyEmailRequest, ModifyEmailResponse } from "../types/email.ts";
import { validateEmail, encodeEmailHeader } from "../utils/email.helper.ts";

export class GmailService {
    private gmail: any;
    private people: any;
    private userEmail: string | null = null;

    constructor(config: GmailConfig) {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({
            access_token: config.accessToken
        });
        google.options({
          headers: { 'Accept-Encoding': 'identity' },
          fetchImplementation: fetch,
          retry: true,
          retryConfig: { retries: 3, retryDelay: (n) => 300 * (2 ** (n - 1)) },
        });

        this.gmail = google.gmail({ version: 'v1', auth });
        this.people = google.people({ version: 'v1', auth });

        // Debug: Log the structure of the people client
        console.log('🔧 People client structure:', Object.keys(this.people));
        console.log('🔧 People client has people property:', 'people' in this.people);
        if (this.people.people) {
            console.log('🔧 People.people structure:', Object.keys(this.people.people));
            console.log('🔧 People.people has otherContacts:', 'otherContacts' in this.people.people);
        }
    }

    async validateConnection(): Promise<boolean> {
        try {
            await this.gmail.users.getProfile({ userId: 'me' });
            return true;
        } catch (error: any) {
            // console.error('Gmail connection validation failed:', error);
            console.log(error.message);
            console.log(error.name);
            console.log(error.code);
            console.log(error.response?.status);
            console.log(error.response?.data);

            // Check if it's a permissions error for contacts
            if (error.response?.status === 403 && error.response?.data?.error?.message?.includes('contacts')) {
                console.log('🚫 Contacts permission missing - need to reauthorize with contacts scopes');
            }

            return false;
        }
    }

    private async setUserEmail(): Promise<void> {
        try {
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            this.userEmail = profile.data.emailAddress;
            console.log('User email:', this.userEmail);
        } catch (error: any) {
            // console.error('Failed to get user email:', error);
            console.log(error.message);
            console.log(error.name);
            console.log(error.code);
            console.log(error.response?.status);
            console.log(error.response?.data);
            this.userEmail = null;
        }
    }

    async sendEmail(emailRequest: EmailRequest): Promise<EmailResponse> {
        try {
            if (!this.userEmail) {
                await this.setUserEmail();
            }

            const message = this.createEmailMessage(emailRequest);
            console.log('=== EMAIL MESSAGE ===');
            console.log(message);
            console.log('=== END MESSAGE ===');

            const encodedMessage = Buffer.from(message).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const requestBody: GmailMessageRequest = {
                raw: encodedMessage,
            };

            if (emailRequest.threadId) {
                requestBody.threadId = emailRequest.threadId;
            }

            const response = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody
            });

            console.log('Gmail API Response:', JSON.stringify(response.data, null, 2));

            if (!response.data || !response.data.id) {
                return {
                    success: false,
                    error: 'Gmail API did not return a message ID',
                    details: 'The email may not have been sent successfully'
                };
            }

            return {
                success: true,
                messageId: response.data.id,
                details: 'Email sent successfully'
            };
        } catch (error: any) {
            console.error('Error sending email:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
                details: error.response?.data?.error?.message || 'Unknown error occurred'
            };
        }
    }

    private createEmailMessage(emailRequest: EmailRequest): string {
        const { to: recipients, subject, body, htmlBody, cc, bcc, inReplyTo } = emailRequest;
        const encodedSubject = encodeEmailHeader(subject);

        let mimeType: string;
        if (emailRequest.mimeType) {
            mimeType = emailRequest.mimeType;
        } else if (htmlBody && body) {
            mimeType = 'multipart/alternative';
        } else if (htmlBody) {
            mimeType = 'text/html';
        } else {
            mimeType = 'text/plain';
        }

        // Generate a random boundary string for multipart messages
        const boundary = `----=_NextPart_${Math.random().toString(36).substring(2)}`;

        // Validate email addresses
        (recipients as string[]).forEach(email => {
            if (!validateEmail(email)) {
                throw new Error(`Recipient email address is invalid: ${email}`);
            }
        });

        if (cc) {
            cc.forEach(email => {
                if (!validateEmail(email)) {
                    throw new Error(`CC email address is invalid: ${email}`);
                }
            });
        }

        if (bcc) {
            bcc.forEach(email => {
                if (!validateEmail(email)) {
                    throw new Error(`BCC email address is invalid: ${email}`);
                }
            });
        }

        // Common email headers
        const emailParts = [
            'From: me',
            `To: ${recipients.join(', ')}`,
            cc ? `Cc: ${cc.join(', ')}` : '',
            bcc ? `Bcc: ${bcc.join(', ')}` : '',
            `Subject: ${encodedSubject}`,
            // Add thread-related headers if specified
            inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
            inReplyTo ? `References: ${inReplyTo}` : '',
            'MIME-Version: 1.0',
        ].filter(Boolean);

        // Construct the email based on the content type
        if (mimeType === 'multipart/alternative') {
            // Multipart email with both plain text and HTML
            emailParts.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
            emailParts.push('');

            // Plain text part
            emailParts.push(`--${boundary}`);
            emailParts.push('Content-Type: text/plain; charset=UTF-8');
            emailParts.push('Content-Transfer-Encoding: 7bit');
            emailParts.push('');
            emailParts.push(body);
            emailParts.push('');

            // HTML part
            emailParts.push(`--${boundary}`);
            emailParts.push('Content-Type: text/html; charset=UTF-8');
            emailParts.push('Content-Transfer-Encoding: 7bit');
            emailParts.push('');
            emailParts.push(htmlBody || body);
            emailParts.push('');

            // Close the boundary
            emailParts.push(`--${boundary}--`);
        } else if (mimeType === 'text/html') {
            // HTML-only email
            emailParts.push('Content-Type: text/html; charset=UTF-8');
            emailParts.push('Content-Transfer-Encoding: 7bit');
            emailParts.push('');
            emailParts.push(htmlBody || body);
        } else {
            // Plain text email (default)
            emailParts.push('Content-Type: text/plain; charset=UTF-8');
            emailParts.push('Content-Transfer-Encoding: 7bit');
            emailParts.push('');
            emailParts.push(body);
        }

        return emailParts.join('\r\n');
    }

    async searchPeople(searchRequest: SearchPeopleRequest): Promise<SearchPeopleResponse<OtherContactSearchResponse>> {
        try {
            const { query, pageSize = 10, readMask = 'names,emailAddresses,phoneNumbers,organizations' } = searchRequest;

            console.log(`🔍 Searching for people with query: "${query}"`);
            console.log(`📋 Page size: ${pageSize}, Read mask: ${readMask}`);
            console.log('🔄 No results from searchContacts, trying otherContacts.search as fallback...');

            const otherContactsResult = await this.people.otherContacts.search({
                query: query.trim(),
                pageSize: Math.min(pageSize, 30),
                readMask: 'names,emailAddresses,phoneNumbers,metadata'
            });

            if (otherContactsResult.status >= 200 && otherContactsResult.status < 300 && otherContactsResult.data) {
                const result = otherContactsResult.data as OtherContactSearchResponse;
                return {
                    success: true,
                    data: result,
                }
            }

            return {
                success: false,
                error: `Failed to search contacts: ${otherContactsResult.statusText || 'Unknown error'}`,
            }
        } catch (error: any) {
            console.error('❌ Error searching people:', error);
            console.error('❌ Error details:', {
                message: error.message,
                name: error.name,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data
            });

            if (error.response?.status === 403) {
                const errorMessage = error.response?.data?.error?.message || '';
                if (errorMessage.includes('contacts') || errorMessage.includes('people')) {
                    return {
                        success: false,
                        error: 'You need to re-authorize with contacts permissions. Please visit the authorization URL again to grant access to your Google contacts.',
                    };
                }
            }

            return {
                success: false,
                error: error.message || 'Unknown error occurred while searching contacts',
            };
        }
    }

    /**
     * Recursively extract email body content from MIME message parts
     * Handles complex email structures with nested parts
     */
    private extractEmailContent(messagePart: GmailMessagePart): EmailContent {
        // Initialize containers for different content types
        let textContent = '';
        let htmlContent = '';

        // If the part has a body with data, process it based on MIME type
        if (messagePart.body && messagePart.body.data) {
            const rawData = messagePart.body.data.replace(/-/g, '+').replace(/_/g, '/');
            const content = Buffer.from(rawData, 'base64').toString('utf8');

            // Store content based on its MIME type
            if (messagePart.mimeType === 'text/plain') {
                textContent = content;
            } else if (messagePart.mimeType === 'text/html') {
                htmlContent = content;
            }
        }

        // If the part has nested parts, recursively process them
        if (messagePart.parts && messagePart.parts.length > 0) {
            for (const part of messagePart.parts) {
                const { text, html } = this.extractEmailContent(part);
                if (text) textContent += text;
                if (html) htmlContent += html;
            }
        }

        // Return both plain text and HTML content
        return { text: textContent, html: htmlContent };
    }

    async getEmail(messageId: string): Promise<GetEmailResponse> {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });

            const headers = response.data.payload?.headers || [];
            const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
            const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
            const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
            const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
            const threadId = response.data.threadId || '';

            // Extract email content using the recursive function
            const { text, html } = this.extractEmailContent(response.data.payload as GmailMessagePart || {});

            // Use plain text content if available, otherwise use HTML content
            let body = text || html || '';

            // If only have HTML content, add a note for the user
            const contentTypeNote = !text && html ?
                '[Note: This email is HTML-formatted. Plain text version not available.]\n\n' : '';

            // Get attachment information
            const attachments: EmailAttachment[] = [];
            const processAttachmentParts = (part: GmailMessagePart, path: string = '') => {
                if (part.body && part.body.attachmentId) {
                    const filename = part.filename || `attachment-${part.body.attachmentId}`;
                    attachments.push({
                        id: part.body.attachmentId,
                        filename: filename,
                        mimeType: part.mimeType || 'application/octet-stream',
                        size: part.body.size || 0
                    });
                }

                if (part.parts) {
                    part.parts.forEach((subpart: GmailMessagePart) =>
                        processAttachmentParts(subpart, `${path}/parts`)
                    );
                }
            };

            if (response.data.payload) {
                processAttachmentParts(response.data.payload as GmailMessagePart);
            }

            // Add attachment info to output if any are present
            const attachmentInfo = attachments.length > 0 ?
                `\n\nAttachments (${attachments.length}):\n` +
                attachments.map(a => `- ${a.filename} (${a.mimeType}, ${Math.round(a.size/1024)} KB, ID: ${a.id})`).join('\n') : '';

            return {
                success: true,
                responseContent: `Thread ID: ${threadId}\nSubject: ${subject}\nFrom: ${from}\nTo: ${to}\nDate: ${date}\n\n${contentTypeNote}${body}${attachmentInfo}`,
            }
        }
        catch (error: any) {
            console.error('❌ Error getting email:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred while getting email',
            };
        }
    }

    async searchEmails(searchRequest: SearchEmailsRequest): Promise<SearchEmailsResponse> {
        try {
            const { query, maxResults = 10 } = searchRequest;

            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: maxResults,
            });

            const messages = response.data.messages || [];

            if (messages.length === 0) {
                return {
                    success: true,
                    results: [],
                };
            }

            const results = await Promise.all(
                messages.map(async (msg: any) => {
                    const detail = await this.gmail.users.messages.get({
                        userId: 'me',
                        id: msg.id!,
                        format: 'metadata',
                        metadataHeaders: ['Subject', 'From', 'Date']
                    });

                    const headers = detail.data.payload?.headers || [];
                    return {
                        id: msg.id,
                        subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
                        from: headers.find((h: any) => h.name === 'From')?.value || '',
                        date: headers.find((h: any) => h.name === 'Date')?.value || ''
                    } as EmailSearchResult;
                })
            );

            return {
                success: true,
                results: results,
            };
        } catch (error: any) {
            console.error('❌ Error searching emails:', error);
            console.error('❌ Error details:', {
                message: error.message,
                name: error.name,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data
            });

            return {
                success: false,
                error: error.message || 'Unknown error occurred while searching emails',
            };
        }
    }

    async modifyEmail(modifyRequest: ModifyEmailRequest): Promise<ModifyEmailResponse> {
        try {
            const { messageId, addLabelIds, removeLabelIds } = modifyRequest;

            const requestBody: any = {};

            if (addLabelIds && addLabelIds.length > 0) {
                requestBody.addLabelIds = addLabelIds;
            }

            if (removeLabelIds && removeLabelIds.length > 0) {
                requestBody.removeLabelIds = removeLabelIds;
            }

            // At least one of addLabelIds or removeLabelIds must be provided
            if (!requestBody.addLabelIds && !requestBody.removeLabelIds) {
                return {
                    success: false,
                    error: 'At least one of addLabelIds or removeLabelIds must be provided',
                };
            }

            await this.gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: requestBody,
            });

            return {
                success: true,
                messageId: messageId,
            };
        } catch (error: any) {
            console.error('❌ Error modifying email:', error);
            console.error('❌ Error details:', {
                message: error.message,
                name: error.name,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data
            });

            return {
                success: false,
                error: error.message || 'Unknown error occurred while modifying email',
            };
        }
    }
}
