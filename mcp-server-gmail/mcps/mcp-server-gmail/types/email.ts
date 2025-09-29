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
export interface PersonName {
  displayName?: string;
  givenName?: string;
  familyName?: string;
}

export interface PersonEmailAddress {
  value?: string;
  type?: string;
}

export interface PersonPhoneNumber {
  value?: string;
  type?: string;
}

export interface PersonOrganization {
  name?: string;
  title?: string;
}

export interface Person {
  resourceName?: string;
  names?: PersonName[];
  emailAddresses?: PersonEmailAddress[];
  phoneNumbers?: PersonPhoneNumber[];
  organizations?: PersonOrganization[];
}

export interface SearchPeopleRequest {
  query: string;
  pageSize?: number;
  readMask?: string;
  userId: string;
}

export interface SearchPeopleResponse {
  success: boolean;
  people?: Person[];
  nextPageToken?: string;
  totalPeople?: number;
  error?: string;
  details?: string;
}