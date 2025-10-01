export interface EmailRequest {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: string;
}

export interface GmailConfig {
  accessToken: string;
  userId: string;
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
  userId: string;
}

export type SearchPeopleResponse<T> =
  | { success: true;  data: T;       error?: null }
  | { success: false; data?: undefined; error: string };