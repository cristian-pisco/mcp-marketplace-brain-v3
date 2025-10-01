import { google } from 'npm:googleapis@160.0.0';
import { EmailRequest, EmailResponse, GmailConfig, SearchPeopleRequest, SearchPeopleResponse, OtherContactSearchResponse } from "../types/email.ts";
import { encodeBase64Url } from "https://deno.land/std@0.224.0/encoding/base64url.ts";

export class GmailService {
    private gmail: any;
    private people: any;
    private userEmail: string | null = null;

    constructor(config: GmailConfig) {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({
            access_token: config.accessToken
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

            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(message);
            const encodedMessage = encodeBase64Url(uint8Array);

            const response = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                raw: encodedMessage
                }
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
        const { to, subject, body, html, cc, bcc } = emailRequest;

        const toAddresses = Array.isArray(to) ? to.join(', ') : to;
        const ccAddresses = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : '';
        const bccAddresses = bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : '';

        let headers = [
            `To: ${toAddresses}`,
            `Subject: ${subject}`,
            `From: ${this.userEmail || 'me'}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: <${Date.now()}.${Math.random().toString(36)}@gmail.com>`
        ];

        if (ccAddresses) {
            headers.push(`Cc: ${ccAddresses}`);
        }

        if (bccAddresses) {
            headers.push(`Bcc: ${bccAddresses}`);
        }

        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (html) {
            headers.push('Content-Type: multipart/alternative; boundary=' + boundary);
            headers.push('');

            const emailBody = [
                `--${boundary}`,
                'Content-Type: text/plain; charset=UTF-8',
                '',
                body,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=UTF-8',
                '',
                html,
                '',
                `--${boundary}--`
            ].join('\r\n');

            return headers.join('\r\n') + '\r\n' + emailBody;
        } else {
            headers.push('Content-Type: text/plain; charset=UTF-8');
            headers.push('');
            headers.push(body);

            return headers.join('\r\n');
        }
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
}
