import { GmailService } from "../services/gmail.service.ts";
import type { AuthContext } from "../index.ts";

/**
 * Result type for Gmail service creation
 */
export type GmailServiceResult = GmailService | { error: string; authUrl?: string };

/**
 * Helper function to validate authentication and create Gmail service
 *
 * @param auth - Authentication context from OAuth2 middleware
 * @returns GmailService instance or error object
 */
export function createGmailService(auth?: AuthContext): GmailServiceResult {
  // Extract accessToken from auth context (provided by jelou-cli OAuth2 middleware)
  const accessToken = auth?.accessToken;
  const userId = auth?.userId;

  console.log("User ID from auth context:", userId);
  console.log("Access token available:", !!accessToken);

  // If auth context indicates authentication failed, return error info
  if (auth?.valid === false && auth?.authUrl) {
    return {
      error: `Authentication required. Please visit this URL to authorize Gmail access: ${auth.authUrl}`,
      authUrl: auth.authUrl
    };
  }

  // Validate we have an access token
  if (!accessToken) {
    return {
      error: 'Authentication failed: No access token available. Please ensure you are authenticated.'
    };
  }

  return new GmailService({ accessToken });
}
