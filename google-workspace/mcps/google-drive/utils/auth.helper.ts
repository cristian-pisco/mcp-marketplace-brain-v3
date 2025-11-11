import { DriveService } from "../services/drive.service.ts";
import type { AuthContext } from "../index.ts";

/**
 * Result type for Drive service creation
 */
export type DriveServiceResult = DriveService | { error: string; authUrl?: string };

/**
 * Helper function to validate authentication and create Drive service
 *
 * @param auth - Authentication context from OAuth2 middleware
 * @returns DriveService instance or error object
 */
export function createDriveService(auth?: AuthContext): DriveServiceResult {
  // Extract accessToken from auth context (provided by jelou-cli OAuth2 middleware)
  const accessToken = auth?.accessToken;
  const userId = auth?.userId;

  console.log("User ID from auth context:", userId);
  console.log("Access token available:", !!accessToken);

  // If auth context indicates authentication failed, return error info
  if (auth?.valid === false && auth?.authUrl) {
    return {
      error: `Authentication required. Please visit this URL to authorize Google Drive access: ${auth.authUrl}`,
      authUrl: auth.authUrl
    };
  }

  // Validate we have an access token
  if (!accessToken) {
    return {
      error: 'Authentication failed: No access token available. Please ensure you are authenticated.'
    };
  }

  return new DriveService({ accessToken });
}
