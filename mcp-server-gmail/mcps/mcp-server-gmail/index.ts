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
import { AuthService } from "./services/auth.service.ts";
import { GmailService } from "./services/gmail.service.ts";
import { EmailRequest, SearchPeopleRequest } from "./types/email.ts";

const AUTH_SERVER_URL: string = Deno.env.has("AUTH_SERVER_URL") ? Deno.env.get("AUTH_SERVER_URL")! : "http://localhost:8901";
const AUTH_ID: string = Deno.env.has("AUTH_ID") ? Deno.env.get("AUTH_ID")! : undefined;
if (!AUTH_ID) {
  throw new Error("AUTH_ID environment variable is not set");
}

const authService = new AuthService(AUTH_SERVER_URL);

/**
 * Minimal MCP server with a single example tool.
 *
 * Edit this file to add your own tools and logic!
 */
export default function createMcpServer(): McpServer {
  // Create the MCP server instance with basic metadata
  const server = new McpServer({
    name: "mcp-server-gmail", // Name your server
    version: "0.0.1"        // Version of your server
  });

  server.tool(
    "gmail_send_email",
    "Send an email via Gmail with support for HTML content, CC, and BCC recipients",
    {
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body content (plain text)"),
      html: z.string().optional().describe("Optional HTML content for the email"),
      cc: z.string().optional().describe("Optional CC email addresses (comma-separated)"),
      bcc: z.string().optional().describe("Optional BCC email addresses (comma-separated)"),
      userId: z.string().describe("User ID for authentication"),
    },
    async ({ to, subject, body, html, cc, bcc, userId }, extra) => {
      const headers = extra?.requestInfo?.headers ?? {};
      console.log(JSON.stringify({ to, subject, body, html, cc, bcc, userId }, null, 2));
      console.log(JSON.stringify(headers, null, 2));

      const authResult = await authService.getValidToken(userId);

      if (!authResult.valid) {
        const authUrlResult = await authService.requestAuthorization(userId, AUTH_ID);
        return {
          content: [
            {
              type: 'text',
              text: `Authentication required. Please visit this URL to authorize Gmail access: ${authUrlResult.authUrl || 'Unable to generate authorization URL'}`,
            },
          ],
        };
      }

      if (!authResult.accessToken) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication failed: No access token available',
            },
          ],
        };
      }

      const gmailService = new GmailService({
        accessToken: authResult.accessToken,
        // userId,
      });

      const isConnected = await gmailService.validateConnection();
      if (!isConnected) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to connect to Gmail. Please check your authentication.',
            },
          ],
        };
      }

      const emailRequest: EmailRequest = {
        to,
        subject,
        body,
        html,
        cc: cc ? cc.split(',').map(email => email.trim()) : undefined,
        bcc: bcc ? bcc.split(',').map(email => email.trim()) : undefined,
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
    "gmail_search_people",
    "Search for people/contacts in Gmail using Google People API with support for names, emails, and phone numbers. Requires contacts permission scope.",
    {
      query: z.string().describe("Search query to find people (matches names, emails, phone numbers, organizations)"),
      pageSize: z.number().optional().describe("Number of results to return (default: 10, max: 30)"),
      readMask: z.string().optional().describe("Comma-separated fields to return (default: names,emailAddresses,phoneNumbers,organizations)"),
      userId: z.string().describe("User ID for authentication"),
    },
    async ({ query, pageSize, readMask, userId }, extra) => {
      const headers = extra?.requestInfo?.headers ?? {};
      console.log(JSON.stringify({ query, pageSize, readMask, userId }, null, 2));
      console.log(JSON.stringify(headers, null, 2));

      const authResult = await authService.getValidToken(userId);

      if (!authResult.valid) {
        const authUrlResult = await authService.requestAuthorization(userId, AUTH_ID);
        return {
          content: [
            {
              type: 'text',
              text: `Authentication required. Please visit this URL to authorize Gmail access: ${authUrlResult.authUrl || 'Unable to generate authorization URL'}`,
            },
          ],
        };
      }

      if (!authResult.accessToken) {
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication failed: No access token available',
            },
          ],
        };
      }

      const gmailService = new GmailService({
        accessToken: authResult.accessToken,
      });

      const isConnected = await gmailService.validateConnection();
      if (!isConnected) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to connect to Gmail. Please check your authentication.',
            },
          ],
        };
      }

      const searchRequest: SearchPeopleRequest = {
        query,
        pageSize,
        readMask,
      };

      const result = await gmailService.searchPeople(searchRequest);

      if (result.success) {
        const text = result.data ? JSON.stringify(result.data, null, 2) : JSON.stringify({ results: [] }, null, 2);

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

  // Return the configured server instance
  return server;
}
