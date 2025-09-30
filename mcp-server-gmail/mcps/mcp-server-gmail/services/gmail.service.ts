import { google } from 'npm:googleapis@160.0.0';
import { EmailRequest, EmailResponse, GmailConfig, SearchPeopleRequest, SearchPeopleResponse, Person } from "../types/email.ts";
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

    async searchPeople(searchRequest: SearchPeopleRequest): Promise<SearchPeopleResponse> {
        try {
            const { query, pageSize = 10, readMask = 'names,emailAddresses,phoneNumbers,organizations' } = searchRequest;

            // Warmup cache with empty query as recommended by Google
            try {
                await this.people.people.searchContacts({
                    query: '',
                    readMask: 'names',
                    pageSize: 1
                });
            } catch (warmupError) {
                console.warn('Warmup request failed, continuing with search:', warmupError);
            }

            // Wait a moment after warmup
            // await new Promise(resolve => setTimeout(resolve, 500));

            // Perform actual search
            console.log(query);
            let response = await this.people.people.searchContacts({
                query,
                pageSize: Math.min(pageSize, 30), // Max 30 as per API docs
                readMask
            });
            console.log('searchContacts API Response:', JSON.stringify(response, null, 2));

            response = await this.people.people.connections.list({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses',
            });
            console.log('connectionsList API Response:', JSON.stringify(response, null, 2));

            if (!response.data) {
                return {
                    success: false,
                    error: 'No data returned from People API',
                    details: 'The search may not have been executed successfully'
                };
            }

            const people: Person[] = response.data.results?.map((result: any) => ({
                resourceName: result.person?.resourceName,
                names: result.person?.names,
                emailAddresses: result.person?.emailAddresses,
                phoneNumbers: result.person?.phoneNumbers,
                organizations: result.person?.organizations
            })) || [];

            return {
                success: true,
                people,
                nextPageToken: response.data.nextPageToken,
                totalPeople: response.data.totalPeople || people.length,
                details: `Found ${people.length} contacts matching "${query}"`
            };

        } catch (error: any) {
            // console.error('Error searching people:', error);
            console.log(error.message);
            console.log(error.name);
            console.log(error.code);
            console.log(error.response?.status);
            console.log(error.response?.data);
            return {
                success: false,
                error: error.message || 'Failed to search people',
                details: error.response?.data?.error?.message || 'Unknown error occurred while searching contacts'
            };
        }
    }
}
