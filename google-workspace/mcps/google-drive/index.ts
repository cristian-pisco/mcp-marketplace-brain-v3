#!/usr/bin/env -S deno run -A

// Google Drive MCP Server
// --------------------------------------
// This server provides tools to interact with Google Drive API
//
// For more info, see: https://github.com/modelcontext/modelcontextprotocol

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "npm:zod@3.25.1";
import { createDriveService } from "./utils/auth.helper.ts";

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
 * Google Drive MCP Server Factory Function
 *
 * @param auth - Authentication context (provided by jelou-cli in production)
 *               - In local development: only contains headers
 *               - In production: contains userId, accessToken, and authentication status
 */
export default function createMcpServer(auth?: AuthContext): McpServer {
  console.log("======== CREATING GOOGLE DRIVE MCP SERVER");
  console.log("Auth Context:", JSON.stringify(auth, null, 2));

  // Create the MCP server instance with basic metadata
  const server = new McpServer({
    name: "google-drive",
    version: "0.0.1"
  });

  // ---------------------------------------------------------------------------
  // Tool: upload_file
  // ---------------------------------------------------------------------------
  server.tool(
    "upload_file",
    "Upload a file to Google Drive from URL or base64 content. Supports folders and descriptions. Ideal for saving WhatsApp attachments or documents.",
    {
      name: z.string().describe("Name of the file"),
      mimeType: z.string().describe("MIME type of the file (e.g., 'text/plain', 'image/png', 'application/pdf')"),
      source: z.enum(['url', 'base64']).describe("Source type: 'url' to download from URL or 'base64' for base64 encoded content"),
      content: z.string().describe("URL to download file from (if source='url') or base64 encoded file content (if source='base64')"),
      folderId: z.string().optional().describe("Optional folder ID where the file should be uploaded"),
      description: z.string().optional().describe("Optional file description"),
    },
    async ({ name, mimeType, source, content, folderId, description }) => {
      console.log("======== UPLOAD FILE");
      console.log(JSON.stringify({ name, mimeType, source, folderId, description }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.uploadFile({
        name,
        mimeType,
        source,
        content,
        folderId,
        description,
      });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: `File uploaded successfully!\nFile ID: ${result.fileId}\nView: ${result.webViewLink}`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to upload file: ${result.error}. Details: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: list_files
  // ---------------------------------------------------------------------------
  server.tool(
    "list_files",
    "List files in Google Drive with filtering and pagination support",
    {
      pageSize: z.number().optional().describe("Number of files to return (default: 10, max: 100)"),
      pageToken: z.string().optional().describe("Token for pagination to get the next page of results"),
      folderId: z.string().optional().describe("Filter files by folder ID"),
      query: z.string().optional().describe("Custom query string (e.g., \"name contains 'report'\")"),
      orderBy: z.string().optional().describe("Sort order (default: 'modifiedTime desc')"),
    },
    async ({ pageSize, pageToken, folderId, query, orderBy }) => {
      console.log("======== LIST FILES");
      console.log(JSON.stringify({ pageSize, pageToken, folderId, query, orderBy }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.listFiles({
        pageSize,
        pageToken,
        folderId,
        query,
        orderBy,
      });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              files: result.files,
              nextPageToken: result.nextPageToken,
            }, null, 2),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to list files: ${result.error}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: create_folder
  // ---------------------------------------------------------------------------
  server.tool(
    "create_folder",
    "Create a new folder in Google Drive",
    {
      name: z.string().describe("Name of the folder"),
      parentFolderId: z.string().optional().describe("Optional parent folder ID"),
      description: z.string().optional().describe("Optional folder description"),
    },
    async ({ name, parentFolderId, description }) => {
      console.log("======== CREATE FOLDER");
      console.log(JSON.stringify({ name, parentFolderId, description }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.createFolder({
        name,
        parentFolderId,
        description,
      });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: `Folder created successfully!\nFolder ID: ${result.folderId}\nView: ${result.webViewLink}`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to create folder: ${result.error}. Details: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: delete_file
  // ---------------------------------------------------------------------------
  server.tool(
    "delete_file",
    "Delete a file or folder from Google Drive",
    {
      fileId: z.string().describe("ID of the file or folder to delete"),
    },
    async ({ fileId }) => {
      console.log("======== DELETE FILE");
      console.log(JSON.stringify({ fileId }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.deleteFile(fileId);

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: "File deleted successfully!",
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to delete file: ${result.error}. Details: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: get_file_metadata
  // ---------------------------------------------------------------------------
  server.tool(
    "get_file_metadata",
    "Get detailed metadata for a file or folder",
    {
      fileId: z.string().describe("ID of the file or folder"),
    },
    async ({ fileId }) => {
      console.log("======== GET FILE METADATA");
      console.log(JSON.stringify({ fileId }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.getFileMetadata(fileId);

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result.metadata, null, 2),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to get file metadata: ${result.error}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: download_file
  // ---------------------------------------------------------------------------
  server.tool(
    "download_file",
    "Download a file from Google Drive (returns base64 encoded content)",
    {
      fileId: z.string().describe("ID of the file to download"),
    },
    async ({ fileId }) => {
      console.log("======== DOWNLOAD FILE");
      console.log(JSON.stringify({ fileId }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.downloadFile(fileId);

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              fileName: result.fileName,
              mimeType: result.mimeType,
              content: result.content,
            }, null, 2),
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to download file: ${result.error}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: update_file
  // ---------------------------------------------------------------------------
  server.tool(
    "update_file",
    "Update a file's metadata or content in Google Drive",
    {
      fileId: z.string().describe("ID of the file to update"),
      name: z.string().optional().describe("New name for the file"),
      description: z.string().optional().describe("New description for the file"),
      content: z.string().optional().describe("New base64 encoded content"),
      mimeType: z.string().optional().describe("MIME type (required if updating content)"),
    },
    async ({ fileId, name, description, content, mimeType }) => {
      console.log("======== UPDATE FILE");
      console.log(JSON.stringify({ fileId, name, description }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.updateFile({
        fileId,
        name,
        description,
        content,
        mimeType,
      });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: `File updated successfully!\nFile ID: ${result.fileId}\nView: ${result.webViewLink}`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to update file: ${result.error}. Details: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: copy_file
  // ---------------------------------------------------------------------------
  server.tool(
    "copy_file",
    "Create a copy of a file in Google Drive",
    {
      fileId: z.string().describe("ID of the file to copy"),
      name: z.string().optional().describe("Name for the copied file (default: 'Copy of [original name]')"),
      folderId: z.string().optional().describe("Folder ID where the copy should be placed"),
    },
    async ({ fileId, name, folderId }) => {
      console.log("======== COPY FILE");
      console.log(JSON.stringify({ fileId, name, folderId }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.copyFile({
        fileId,
        name,
        folderId,
      });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: `File copied successfully!\nNew File ID: ${result.fileId}\nView: ${result.webViewLink}`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to copy file: ${result.error}. Details: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: share_file
  // ---------------------------------------------------------------------------
  server.tool(
    "share_file",
    "Share a file or folder with users, groups, or make it public",
    {
      fileId: z.string().describe("ID of the file or folder to share"),
      role: z.enum(['reader', 'writer', 'commenter', 'owner']).describe("Permission level to grant"),
      type: z.enum(['user', 'group', 'domain', 'anyone']).describe("Type of grantee"),
      emailAddress: z.string().optional().describe("Email address (required for user or group type)"),
      domain: z.string().optional().describe("Domain name (required for domain type)"),
      sendNotificationEmail: z.boolean().optional().describe("Send notification email to the grantee (default: true)"),
    },
    async ({ fileId, role, type, emailAddress, domain, sendNotificationEmail }) => {
      console.log("======== SHARE FILE");
      console.log(JSON.stringify({ fileId, role, type, emailAddress, domain, sendNotificationEmail }, null, 2));

      const driveService = createDriveService(auth);
      if ('error' in driveService) {
        return {
          content: [{ type: "text", text: driveService.error }]
        };
      }

      const result = await driveService.shareFile({
        fileId,
        role,
        type,
        emailAddress,
        domain,
        sendNotificationEmail,
      });

      if (result.success) {
        return {
          content: [{
            type: "text",
            text: `File shared successfully! Permission ID: ${result.permissionId}`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to share file: ${result.error}. Details: ${result.details || 'No additional details'}`,
          }],
        };
      }
    }
  );

  // Return the configured server instance
  return server;
}
