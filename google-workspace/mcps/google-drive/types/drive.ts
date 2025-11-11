// Google Drive Types and Interfaces

export interface DriveConfig {
  accessToken: string;
}

// File Upload Types
export interface UploadFileRequest {
  name: string;
  mimeType: string;
  source: 'url' | 'base64';
  content: string; // URL or Base64 encoded content depending on source
  folderId?: string;
  description?: string;
}

export interface UploadFileResponse {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
  details?: string;
}

// File List Types
export interface ListFilesRequest {
  pageSize?: number;
  pageToken?: string;
  folderId?: string;
  query?: string;
  orderBy?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  owners?: FileOwner[];
  parents?: string[];
  shared?: boolean;
  trashed?: boolean;
}

export interface FileOwner {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
}

export interface ListFilesResponse {
  success: boolean;
  files?: DriveFile[];
  nextPageToken?: string;
  error?: string;
}

// Folder Creation Types
export interface CreateFolderRequest {
  name: string;
  parentFolderId?: string;
  description?: string;
}

export interface CreateFolderResponse {
  success: boolean;
  folderId?: string;
  webViewLink?: string;
  error?: string;
  details?: string;
}

// File Deletion Types
export interface DeleteFileResponse {
  success: boolean;
  error?: string;
  details?: string;
}

// File Metadata Types
export interface GetFileMetadataResponse {
  success: boolean;
  metadata?: DriveFile;
  error?: string;
}

// File Download Types
export interface DownloadFileResponse {
  success: boolean;
  content?: string; // Base64 encoded
  mimeType?: string;
  fileName?: string;
  error?: string;
}

// File Update Types
export interface UpdateFileRequest {
  fileId: string;
  name?: string;
  description?: string;
  content?: string; // Base64 encoded
  mimeType?: string;
}

export interface UpdateFileResponse {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
  details?: string;
}

// File Copy Types
export interface CopyFileRequest {
  fileId: string;
  name?: string;
  folderId?: string;
}

export interface CopyFileResponse {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
  details?: string;
}

// File Share/Permission Types
export interface ShareFileRequest {
  fileId: string;
  role: 'reader' | 'writer' | 'commenter' | 'owner';
  type: 'user' | 'group' | 'domain' | 'anyone';
  emailAddress?: string;
  domain?: string;
  sendNotificationEmail?: boolean;
}

export interface ShareFileResponse {
  success: boolean;
  permissionId?: string;
  error?: string;
  details?: string;
}

// Search Types
export interface SearchFilesRequest {
  query: string;
  pageSize?: number;
  pageToken?: string;
  includeItemsFromAllDrives?: boolean;
}
