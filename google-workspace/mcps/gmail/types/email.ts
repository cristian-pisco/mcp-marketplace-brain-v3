export interface EmailRequest {
  to: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  mimeType?: 'text/plain' | 'text/html' | 'multipart/alternative';
  cc?: string[];
  bcc?: string[];
  threadId?: string;
  inReplyTo?: string;
}

export interface GmailMessageRequest {
  raw: string;
  threadId?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: string;
}

export interface GmailConfig {
  accessToken: string;
  // userId: string;
}

export interface SendEmailToolArgs {
  to: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string;
  bcc?: string;
  userId: string;
}

export interface AuthTokenValidateRequest {
  userId: string;
  toolkit: string;
}

export interface AuthTokenRequest {
  userId: string;
  authConfigId: string;
  toolkit: string;
}

export interface AuthTokenResponse {
  valid: boolean;
  accessToken?: string;
  error?: string;
}

// People Search Types
export interface PersonMetadata {
  sources?: PersonSource[];
  objectType?: string;
}

export interface PersonSource {
  type?: string;
  id?: string;
  etag?: string;
  updateTime?: string;
}

export interface PersonNameMetadata {
  primary?: boolean;
  source?: PersonSource;
  sourcePrimary?: boolean;
}

export interface PersonName {
  metadata?: PersonNameMetadata;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  displayNameLastFirst?: string;
  unstructuredName?: string;
}

export interface PersonEmailMetadata {
  primary?: boolean;
  source?: PersonSource;
  sourcePrimary?: boolean;
}

export interface PersonEmailAddress {
  metadata?: PersonEmailMetadata;
  value?: string;
  type?: string;
}

export interface PersonPhoneNumber {
  metadata?: PersonNameMetadata;
  value?: string;
  type?: string;
}

export interface PersonOrganization {
  name?: string;
  title?: string;
}

export interface Person {
  resourceName?: string;
  etag?: string;
  metadata?: PersonMetadata;
  names?: PersonName[];
  emailAddresses?: PersonEmailAddress[];
  phoneNumbers?: PersonPhoneNumber[];
  organizations?: PersonOrganization[];
}

export interface OtherContactSearchResult {
  person?: Person;
}

export interface OtherContactSearchResponse {
  results?: OtherContactSearchResult[];
}

export interface SearchPeopleRequest {
  query: string;
  pageSize?: number;
  readMask?: string;
  // userId: string;
}

export type SearchPeopleResponse<T> =
  | { success: true;  data: T;       error?: null }
  | { success: false; data?: undefined; error: string };


export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{
      name: string;
      value: string;
  }>;
  body?: {
      attachmentId?: string;
      size?: number;
      data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface EmailContent {
  text: string;
  html: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface GetEmailResponse {
  success: boolean;
  responseContent?: string;
  error?: string;
}

// Email Search Types
export interface SearchEmailsRequest {
  query: string;
  maxResults?: number;
}

export interface EmailSearchResult {
  id: string;
  subject: string;
  from: string;
  date: string;
}

export interface SearchEmailsResponse {
  success: boolean;
  results?: EmailSearchResult[];
  error?: string;
}

// Email Modify Types
export interface ModifyEmailRequest {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface ModifyEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}