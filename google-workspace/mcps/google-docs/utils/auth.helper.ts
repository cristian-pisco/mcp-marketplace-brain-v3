import { DocsService } from "../services/docs.service.ts";

/**
 * Authentication Context Interface
 * Provided by OAuth2 middleware in production
 */
export interface AuthContext {
  headers: Record<string, string | undefined>;
  userId?: string;
  accessToken?: string;
  authUrl?: string;
  valid?: boolean;
  error?: string;
}

/**
 * Result type for DocsService creation
 * Either returns a DocsService instance or an error object
 */
export type DocsServiceResult = DocsService | { error: string; authUrl?: string };

/**
 * Create a DocsService instance with authentication validation
 *
 * @param auth - Authentication context from OAuth2 middleware
 * @returns DocsService instance or error object with authentication URL
 */
export function createDocsService(auth?: AuthContext): DocsServiceResult {
  const accessToken = auth?.accessToken;
  const userId = auth?.userId;

  console.log("User ID from auth context:", userId);
  console.log("Access token available:", !!accessToken);

  // Check if auth failed and return error with auth URL
  if (auth?.valid === false && auth?.authUrl) {
    return {
      error: `Authentication required. Please visit this URL to authorize Google Docs access: ${auth.authUrl}`,
      authUrl: auth.authUrl
    };
  }

  // Validate access token exists
  if (!accessToken) {
    return {
      error: 'Authentication failed: No access token available. Please ensure you are authenticated with Google.'
    };
  }

  // Create and return DocsService instance
  return new DocsService({ accessToken });
}
