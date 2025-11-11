#!/usr/bin/env -S deno run -A

// Minimal MCP Server Boilerplate Example
// --------------------------------------
// This file demonstrates the simplest possible custom MCP server setup.
//
// 1. Rename this file to mcp-server.ts (optional)
// 2. Run with: deno run -A mcp-server.ts
//
// For more info, see: https://github.com/modelcontext/modelcontextprotocol

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "npm:zod@3.25.1";
import { EmailRequest, SearchPeopleRequest, ModifyEmailRequest } from "./types/email.ts";
import { createGmailService } from "./utils/auth.helper.ts";

/**
 * Authentication Context
 *
 * When deployed via jelou-cli to production, this context is provided by the
 * OAuth2 middleware and contains validated user authentication information.
 *
 * Fields:
 * - headers: Always present - contains all HTTP request headers
 * - userId: Optional - authenticated user ID (only in production with auth enabled)
 * - accessToken: Optional - valid OAuth2 access token (only in production with auth enabled)
 * - authUrl: Optional - authorization URL if authentication failed
 * - valid: Optional - whether authentication was successful
 * - error: Optional - error message if authentication failed
 */
export interface AuthContext {
  headers: Record<string, string | undefined>;  // Required - always present
  userId?: string;                               // Optional - only if authenticated
  accessToken?: string;                          // Optional - only if authenticated
  authUrl?: string;                             // Optional - only if auth failed
  valid?: boolean;                              // Optional - only if auth was attempted
  error?: string;                               // Optional - only if there was an error
}

/**
 * Gmail MCP Server Factory
 *
 * @param auth - Authentication context from OAuth2 middleware containing:
 *   - headers: HTTP request headers (always present)
 *   - userId: Authenticated user ID (only if auth is enabled and successful)
 *   - accessToken: Valid OAuth2 access token (only if auth is enabled and successful)
 *   - authUrl: Authorization URL if authentication failed
 *   - valid: Whether authentication was successful
 *
 * When deployed via jelou-cli with marketplace integration, this function receives
 * the auth context automatically. In development mode, it may be undefined.
 */
export default function createMcpServer(auth?: AuthContext): McpServer {
  console.log("======== CREATING GMAIL MCP SERVER");
  console.log("Auth Context:", JSON.stringify(auth, null, 2));

  // Create the MCP server instance with basic metadata
  const server = new McpServer({
    name: "gmail",
    version: "0.0.1"
  });

  server.tool(
    "send_email",
    "Send an email via Gmail with support for HTML content, CC, BCC recipients, and threading (replies to existing conversations)",
    {
      to: z.array(z.string()).describe("List of recipient email addresses"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body content (used for text/plain or when htmlBody not provided)"),
      htmlBody: z.string().optional().describe("HTML version of the email body"),
      mimeType: z.enum(['text/plain', 'text/html', 'multipart/alternative']).optional().default('text/plain').describe("Email content type"),
      cc: z.array(z.string()).optional().describe("List of CC recipients"),
      bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
      threadId: z.string().optional().describe("Thread ID to reply to"),
      inReplyTo: z.string().optional().describe("Message ID being replied to"),
    },
    async ({ to, subject, body, htmlBody, mimeType, cc, bcc, threadId, inReplyTo }) => {
      console.log("======== GMAIL SEND EMAIL");
      console.log(JSON.stringify({ to, subject, body, htmlBody, mimeType, cc, bcc, threadId, inReplyTo }, null, 2));

      const gmailService = createGmailService(auth);
      if ('error' in gmailService) {
        return {
          content: [{ type: "text", text: gmailService.error }]
        };
      }

      // Prepare and send email
      const emailRequest: EmailRequest = {
        to,
        subject,
        body,
        htmlBody,
        mimeType,
        cc,
        bcc,
        threadId,
        inReplyTo,
      };

      const result = await gmailService.sendEmail(emailRequest);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully! Message ID: ${result.messageId}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to send email: ${result.error}. Details: ${result.details || 'No additional details'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "get_people",
    "Search for people/contacts in Gmail using Google People API with support for names, emails, and phone numbers. Requires contacts permission scope.",
    {
      query: z.string().describe("Search query to find people (matches names, emails, phone numbers, organizations)"),
      pageSize: z.number().optional().describe("Number of results to return (default: 10, max: 30)"),
      readMask: z.string().optional().describe("Comma-separated fields to return (default: names,emailAddresses,phoneNumbers,organizations)"),
    },
    async ({ query, pageSize, readMask }) => {
      console.log("======== GMAIL SEARCH PEOPLE");
      console.log(JSON.stringify({ query, pageSize, readMask }, null, 2));

      const gmailService = createGmailService(auth);
      if ('error' in gmailService) {
        return {
          content: [{ type: "text", text: gmailService.error }]
        };
      }

      // Search people/contacts
      const searchRequest: SearchPeopleRequest = {
        query,
        pageSize,
        readMask,
      };

      const result = await gmailService.searchPeople(searchRequest);

      if (result.success) {
        const text = result.data ? JSON.stringify(result.data, null, 2) : JSON.stringify({ results: [] }, null, 2);
        console.log('======== GMAIL SEARCH PEOPLE RESULT');
        console.log(text);
        console.log('======== END GMAIL SEARCH PEOPLE RESULT');
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to search people: ${result.error}.`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "get_email",
    "Retrieves the content of a specific email",
    {
      messageId: z.string().describe("ID of the email message to retrieve"),
    },
    async ({ messageId }) => {
      console.log("======== GMAIL GET EMAIL");
      console.log(JSON.stringify({ messageId }, null, 2));

      const gmailService = createGmailService(auth);
      if ('error' in gmailService) {
        return {
          content: [{ type: "text", text: gmailService.error }]
        };
      }

      const responseEmail = await gmailService.getEmail(messageId);
      if (responseEmail.success) {
        return {
          content: [{ type: "text", text: responseEmail.responseContent }]
        };
      } else {
        return {
          content: [{ type: "text", text: `Failed to get email: ${responseEmail.error}.` }]
        };
      }
    }
  );

  server.tool(
    "search_emails",
    "Search for emails in Gmail using Gmail search query syntax (e.g., 'from:example@gmail.com', 'subject:meeting', 'is:unread')",
    {
      query: z.string().describe("Gmail search query (e.g., 'from:example@gmail.com', 'subject:meeting', 'is:unread')"),
      maxResults: z.number().optional().describe("Maximum number of results to return (default: 10)"),
    },
    async ({ query, maxResults }) => {
      console.log("======== GMAIL SEARCH EMAILS");
      console.log(JSON.stringify({ query, maxResults }, null, 2));

      const gmailService = createGmailService(auth);
      if ('error' in gmailService) {
        return {
          content: [{ type: "text", text: gmailService.error }]
        };
      }

      const searchResponse = await gmailService.searchEmails({ query, maxResults });

      if (searchResponse.success) {
        const results = searchResponse.results || [];

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No emails found matching the query." }]
          };
        }

        const text = results
          .map(r => `ID: ${r.id}\nSubject: ${r.subject}\nFrom: ${r.from}\nDate: ${r.date}\n`)
          .join('\n');

        return {
          content: [{ type: "text", text }]
        };
      } else {
        return {
          content: [{ type: "text", text: `Failed to search emails: ${searchResponse.error}.` }]
        };
      }
    }
  );

  server.tool(
    "modify_email",
    "Modifies email labels to mark as read/unread, archive, move to folders, mark as important/spam, etc. Common Gmail labels: UNREAD, INBOX, IMPORTANT, SPAM, TRASH, STARRED",
    {
      messageId: z.string().describe("ID of the email message to modify"),
      addLabelIds: z.array(z.string()).optional().describe("List of label IDs to add to the message (e.g., ['UNREAD'] to mark as unread, ['IMPORTANT'] to mark as important)"),
      removeLabelIds: z.array(z.string()).optional().describe("List of label IDs to remove from the message (e.g., ['UNREAD'] to mark as read, ['INBOX'] to archive)"),
    },
    async ({ messageId, addLabelIds, removeLabelIds }) => {
      console.log("======== GMAIL MODIFY EMAIL");
      console.log(JSON.stringify({ messageId, addLabelIds, removeLabelIds }, null, 2));

      const gmailService = createGmailService(auth);
      if ('error' in gmailService) {
        return {
          content: [{ type: "text", text: gmailService.error }]
        };
      }

      const modifyRequest: ModifyEmailRequest = {
        messageId,
        addLabelIds,
        removeLabelIds,
      };

      const modifyResponse = await gmailService.modifyEmail(modifyRequest);

      if (modifyResponse.success) {
        const actions: string[] = [];
        if (addLabelIds && addLabelIds.length > 0) {
          actions.push(`Added labels: ${addLabelIds.join(', ')}`);
        }
        if (removeLabelIds && removeLabelIds.length > 0) {
          actions.push(`Removed labels: ${removeLabelIds.join(', ')}`);
        }

        return {
          content: [
            {
              type: "text",
              text: `Email ${messageId} modified successfully.\n${actions.join('\n')}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to modify email: ${modifyResponse.error}`,
            },
          ],
        };
      }
    }
  );

  // Return the configured server instance
  return server;
}
