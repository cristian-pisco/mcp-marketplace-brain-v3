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
import { z } from "npm:zod";
import { createDocsService, type AuthContext } from "./utils/auth.helper.ts";

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
 *
 * Note: AuthContext is now exported from utils/auth.helper.ts
 */

/**
 * MCP Server Factory Function
 *
 * This function creates and configures your MCP server instance.
 *
 * @param auth - Authentication context (provided by jelou-cli in production)
 *               - In local development: only contains headers
 *               - In production: contains userId, accessToken, and authentication status
 *
 * Edit this file to add your own tools and logic!
 */
export default function createMcpServer(auth?: AuthContext): McpServer {
  // Create the MCP server instance with basic metadata
  const server = new McpServer({
    name: "google-docs", // Name your server
    version: "0.0.1"        // Version of your server
  });

  // ---------------------------------------------------------------------------
  // Tool: create_document
  // ---------------------------------------------------------------------------
  // Creates a new Google Docs document with optional initial content and folder placement
  server.tool(
    "create_document",
    "Create a new Google Docs document with optional initial content and folder placement",
    {
      title: z.string().describe("Title of the document"),
      content: z.string().optional().describe("Optional initial content for the document"),
      folder_id: z.string().optional().describe("Optional Google Drive folder ID where the document should be created"),
    },
    async ({ title, content, folder_id }) => {
      console.log("======== CREATE DOCUMENT");
      console.log(JSON.stringify({ title, content, folder_id }, null, 2));

      // Validate authentication and create service instance
      const docsService = createDocsService(auth);
      if ('error' in docsService) {
        return {
          content: [{ type: "text", text: docsService.error }]
        };
      }

      // Create the document
      const result = await docsService.createDocument({ title, content, folder_id });

      // Return formatted response
      if (result.success) {
        const response = {
          message: "Document created successfully",
          document_id: result.document_id,
          title: result.title,
          url: result.url,
          details: result.details
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(response),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to create document: ${result.error}\nDetails: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: get_document_content
  // ---------------------------------------------------------------------------
  // Retrieves the text content from a Google Docs document
  server.tool(
    "get_document_content",
    "Retrieve the text content from a Google Docs document with optional range filtering",
    {
      document_id: z.string().describe("ID of the document to read"),
      range: z.string().optional().describe("Optional range in format 'start:end' for character indices"),
    },
    async ({ document_id, range }) => {
      console.log("======== GET DOCUMENT CONTENT");
      console.log(JSON.stringify({ document_id, range }, null, 2));

      const docsService = createDocsService(auth);
      if ('error' in docsService) {
        return {
          content: [{ type: "text", text: docsService.error }]
        };
      }

      const result = await docsService.getDocumentContent({ document_id, range });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to get document content: ${result.error}\nDetails: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: append_text
  // ---------------------------------------------------------------------------
  // Appends text to the end of a Google Docs document
  server.tool(
    "append_text",
    "Append text to the end of a Google Docs document or at a specific location",
    {
      document_id: z.string().describe("ID of the document to modify"),
      text: z.string().describe("Text to append to the document"),
      location: z.number().optional().describe("Optional character index where to insert the text (default: end of document)"),
    },
    async ({ document_id, text, location }) => {
      console.log("======== APPEND TEXT");
      console.log(JSON.stringify({ document_id, text, location }, null, 2));

      const docsService = createDocsService(auth);
      if ('error' in docsService) {
        return {
          content: [{ type: "text", text: docsService.error }]
        };
      }

      const result = await docsService.appendText({ document_id, text, location });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to append text: ${result.error}\nDetails: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: replace_text
  // ---------------------------------------------------------------------------
  // Finds and replaces text in a Google Docs document
  server.tool(
    "replace_text",
    "Find and replace text in a Google Docs document (case-insensitive)",
    {
      document_id: z.string().describe("ID of the document to modify"),
      find_text: z.string().describe("Text to find in the document"),
      replace_text: z.string().describe("Text to replace with"),
    },
    async ({ document_id, find_text, replace_text }) => {
      console.log("======== REPLACE TEXT");
      console.log(JSON.stringify({ document_id, find_text, replace_text }, null, 2));

      const docsService = createDocsService(auth);
      if ('error' in docsService) {
        return {
          content: [{ type: "text", text: docsService.error }]
        };
      }

      const result = await docsService.replaceText({ document_id, find_text, replace_text });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to replace text: ${result.error}\nDetails: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: copy_document
  // ---------------------------------------------------------------------------
  // Creates a copy of an existing Google Docs document
  server.tool(
    "copy_document",
    "Create a copy of an existing Google Docs document (useful for templates)",
    {
      source_document_id: z.string().describe("ID of the source document to copy"),
      new_title: z.string().describe("Title for the new copied document"),
      folder_id: z.string().optional().describe("Optional Google Drive folder ID where the copy should be placed"),
    },
    async ({ source_document_id, new_title, folder_id }) => {
      console.log("======== COPY DOCUMENT");
      console.log(JSON.stringify({ source_document_id, new_title, folder_id }, null, 2));

      const docsService = createDocsService(auth);
      if ('error' in docsService) {
        return {
          content: [{ type: "text", text: docsService.error }]
        };
      }

      const result = await docsService.copyDocument({ source_document_id, new_title, folder_id });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to copy document: ${result.error}\nDetails: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Tool: share_document
  // ---------------------------------------------------------------------------
  // Shares a Google Docs document with specific permissions
  server.tool(
    "share_document",
    "Share a Google Docs document with specific permissions and get a shareable link",
    {
      document_id: z.string().describe("ID of the document to share"),
      role: z.enum(['viewer', 'commenter', 'writer', 'editor']).describe("Permission role (viewer, commenter, writer, or editor)"),
      email: z.string().optional().describe("Optional email address to share with (if not provided, creates a link anyone can access)"),
    },
    async ({ document_id, role, email }) => {
      console.log("======== SHARE DOCUMENT");
      console.log(JSON.stringify({ document_id, role, email }, null, 2));

      const docsService = createDocsService(auth);
      if ('error' in docsService) {
        return {
          content: [{ type: "text", text: docsService.error }]
        };
      }

      const result = await docsService.shareDocument({ document_id, role, email });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to share document: ${result.error}\nDetails: ${result.details || 'No additional details'}`,
          }],
        };
      }
    } 
  );
  // ---------------------------------------------------------------------------

  // Return the configured server instance
  return server;
}
