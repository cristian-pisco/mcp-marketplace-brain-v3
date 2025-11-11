// Configuration
export interface DocsConfig {
  accessToken: string;
}

// Create Document
export interface CreateDocumentRequest {
  title: string;
  content?: string;
  folder_id?: string;
}

export interface CreateDocumentResponse {
  success: boolean;
  document_id?: string;
  title?: string;
  url?: string;
  error?: string;
  details?: string;
}

// Get Document Content
export interface GetDocumentContentRequest {
  document_id: string;
  range?: string;
}

export interface GetDocumentContentResponse {
  success: boolean;
  text_content?: string;
  error?: string;
  details?: string;
}

// Append Text
export interface AppendTextRequest {
  document_id: string;
  text: string;
  location?: number;
}

export interface AppendTextResponse {
  success: boolean;
  updated?: boolean;
  error?: string;
  details?: string;
}

// Replace Text
export interface ReplaceTextRequest {
  document_id: string;
  find_text: string;
  replace_text: string;
}

export interface ReplaceTextResponse {
  success: boolean;
  updated?: boolean;
  replacements_count?: number;
  error?: string;
  details?: string;
}

// Copy Document
export interface CopyDocumentRequest {
  source_document_id: string;
  new_title: string;
  folder_id?: string;
}

export interface CopyDocumentResponse {
  success: boolean;
  new_document_id?: string;
  url?: string;
  error?: string;
  details?: string;
}

// Share Document
export interface ShareDocumentRequest {
  document_id: string;
  role: 'viewer' | 'commenter' | 'writer' | 'editor';
  email?: string;
}

export interface ShareDocumentResponse {
  success: boolean;
  share_link?: string;
  permission_id?: string;
  error?: string;
  details?: string;
}

// Google API Types
export interface GoogleDocument {
  documentId?: string;
  title?: string;
  body?: any;
  revisionId?: string;
  documentStyle?: any;
}
