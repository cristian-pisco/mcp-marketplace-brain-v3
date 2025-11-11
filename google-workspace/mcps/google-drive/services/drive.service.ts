import { google } from 'npm:googleapis@160.0.0';
import type {
  DriveConfig,
  UploadFileRequest,
  UploadFileResponse,
  ListFilesRequest,
  ListFilesResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  DeleteFileResponse,
  GetFileMetadataResponse,
  DownloadFileResponse,
  UpdateFileRequest,
  UpdateFileResponse,
  CopyFileRequest,
  CopyFileResponse,
  ShareFileRequest,
  ShareFileResponse,
  DriveFile,
} from '../types/drive.ts';
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

export class DriveService {
  private drive: any;

  constructor(config: DriveConfig) {
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

    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Validate Drive API connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.drive.about.get({ fields: 'user' });
      return true;
    } catch (error: any) {
      console.error('Drive connection validation failed:', error.message);
      return false;
    }
  }

  /**
   * Upload a file to Google Drive
   * Supports uploading from URL or base64 encoded content
   */
  async uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
    try {
      const { name, mimeType, source, content, folderId, description } = request;

      // Get file content based on source type
      let fileContent: Uint8Array;
      
      if (source === 'url') {
        // Download file from URL
        console.log(`Downloading file from URL: ${content}`);
        const response = await fetch(content);
        
        if (!response.ok) {
          return {
            success: false,
            error: 'Failed to download file from URL',
            details: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        
        const arrayBuffer = await response.arrayBuffer();
        fileContent = new Uint8Array(arrayBuffer);
      } else {
        // Decode base64 content
        fileContent = decodeBase64(content);
      }

      const fileMetadata: any = {
        name,
        mimeType,
      };

      if (description) {
        fileMetadata.description = description;
      }

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType,
        body: new Blob([fileContent]),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, mimeType',
      });

      if (!response.data || !response.data.id) {
        return {
          success: false,
          error: 'Failed to upload file',
          details: 'Drive API did not return file information',
        };
      }

      return {
        success: true,
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * List files in Google Drive
   */
  async listFiles(request: ListFilesRequest = {}): Promise<ListFilesResponse> {
    try {
      const {
        pageSize = 10,
        pageToken,
        folderId,
        query,
        orderBy = 'modifiedTime desc',
      } = request;
      console.log('Listing files with request:', request);

      let q = "trashed = false";
      
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }

      if (query) {
        q += ` and ${query}`;
      }

      const response = await this.drive.files.list({
        pageSize: Math.min(pageSize, 100),
        pageToken,
        q,
        orderBy,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, owners, parents, shared, trashed)',
      });

      const files: DriveFile[] = response.data.files || [];

      return {
        success: true,
        files,
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error: any) {
      console.error('Error listing files:', error);
      return {
        success: false,
        error: error.message || 'Failed to list files',
      };
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(request: CreateFolderRequest): Promise<CreateFolderResponse> {
    try {
      const { name, parentFolderId, description } = request;

      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (description) {
        fileMetadata.description = description;
      }

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
      });

      if (!response.data || !response.data.id) {
        return {
          success: false,
          error: 'Failed to create folder',
          details: 'Drive API did not return folder information',
        };
      }

      return {
        success: true,
        folderId: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error: any) {
      console.error('Error creating folder:', error);
      return {
        success: false,
        error: error.message || 'Failed to create folder',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete a file or folder from Google Drive
   */
  async deleteFile(fileId: string): Promise<DeleteFileResponse> {
    try {
      await this.drive.files.delete({
        fileId,
      });

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete file',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<GetFileMetadataResponse> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, owners, parents, shared, trashed',
      });

      if (!response.data) {
        return {
          success: false,
          error: 'File not found',
        };
      }

      return {
        success: true,
        metadata: response.data as DriveFile,
      };
    } catch (error: any) {
      console.error('Error getting file metadata:', error);
      return {
        success: false,
        error: error.message || 'Failed to get file metadata',
      };
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<DownloadFileResponse> {
    try {
      // First get file metadata
      const metadataResponse = await this.drive.files.get({
        fileId,
        fields: 'name, mimeType',
      });

      const { name, mimeType } = metadataResponse.data;

      // Download file content
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      if (!response.data) {
        return {
          success: false,
          error: 'Failed to download file',
        };
      }

      // Convert to base64
      const uint8Array = new Uint8Array(response.data);
      const encoder = new TextEncoder();
      const base64Content = btoa(String.fromCharCode(...uint8Array));

      return {
        success: true,
        content: base64Content,
        mimeType,
        fileName: name,
      };
    } catch (error: any) {
      console.error('Error downloading file:', error);
      return {
        success: false,
        error: error.message || 'Failed to download file',
      };
    }
  }

  /**
   * Update a file in Google Drive
   */
  async updateFile(request: UpdateFileRequest): Promise<UpdateFileResponse> {
    try {
      const { fileId, name, description, content, mimeType } = request;

      const fileMetadata: any = {};
      
      if (name) {
        fileMetadata.name = name;
      }

      if (description) {
        fileMetadata.description = description;
      }

      let media;
      if (content && mimeType) {
        const decodedContent = decodeBase64(content);
        media = {
          mimeType,
          body: new Blob([decodedContent]),
        };
      }

      const response = await this.drive.files.update({
        fileId,
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      if (!response.data || !response.data.id) {
        return {
          success: false,
          error: 'Failed to update file',
          details: 'Drive API did not return file information',
        };
      }

      return {
        success: true,
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error: any) {
      console.error('Error updating file:', error);
      return {
        success: false,
        error: error.message || 'Failed to update file',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Copy a file in Google Drive
   */
  async copyFile(request: CopyFileRequest): Promise<CopyFileResponse> {
    try {
      const { fileId, name, folderId } = request;

      const fileMetadata: any = {};
      
      if (name) {
        fileMetadata.name = name;
      }

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const response = await this.drive.files.copy({
        fileId,
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
      });

      if (!response.data || !response.data.id) {
        return {
          success: false,
          error: 'Failed to copy file',
          details: 'Drive API did not return file information',
        };
      }

      return {
        success: true,
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error: any) {
      console.error('Error copying file:', error);
      return {
        success: false,
        error: error.message || 'Failed to copy file',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Share a file with a user or make it public
   */
  async shareFile(request: ShareFileRequest): Promise<ShareFileResponse> {
    try {
      const { fileId, role, type, emailAddress, domain, sendNotificationEmail = true } = request;

      const permission: any = {
        role,
        type,
      };

      if (type === 'user' || type === 'group') {
        if (!emailAddress) {
          return {
            success: false,
            error: 'Email address is required for user or group permissions',
          };
        }
        permission.emailAddress = emailAddress;
      }

      if (type === 'domain') {
        if (!domain) {
          return {
            success: false,
            error: 'Domain is required for domain permissions',
          };
        }
        permission.domain = domain;
      }

      const response = await this.drive.permissions.create({
        fileId,
        requestBody: permission,
        sendNotificationEmail,
        fields: 'id',
      });

      if (!response.data || !response.data.id) {
        return {
          success: false,
          error: 'Failed to share file',
          details: 'Drive API did not return permission information',
        };
      }

      return {
        success: true,
        permissionId: response.data.id,
      };
    } catch (error: any) {
      console.error('Error sharing file:', error);
      return {
        success: false,
        error: error.message || 'Failed to share file',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }
}
