import { google } from 'npm:googleapis@160.0.0';
import type {
  DocsConfig,
  CreateDocumentRequest,
  CreateDocumentResponse,
  GetDocumentContentRequest,
  GetDocumentContentResponse,
  AppendTextRequest,
  AppendTextResponse,
  ReplaceTextRequest,
  ReplaceTextResponse,
  CopyDocumentRequest,
  CopyDocumentResponse,
  ShareDocumentRequest,
  ShareDocumentResponse,
} from '../types/docs.ts';

export class DocsService {
  private docs: any;
  private drive: any;

  constructor(config: DocsConfig) {
    // Create OAuth2 client with access token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: config.accessToken
    });

    // Configure global Google API options
    google.options({
      headers: { 'Accept-Encoding': 'identity' },
      fetchImplementation: fetch,
      retry: true,
      retryConfig: {
        retries: 3,
        retryDelay: (n) => 300 * (2 ** (n - 1))  // Exponential backoff
      },
    });

    // Initialize Google Docs and Drive API clients
    this.docs = google.docs({ version: 'v1', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Create a new Google Docs document
   * @param request - CreateDocumentRequest with title, optional content, and optional folder_id
   * @returns CreateDocumentResponse with document details or error
   */
  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    try {
      const { title, content, folder_id } = request;

      console.log('Creating document with title:', title);

      // Step 1: Create the document
      const createResponse = await this.docs.documents.create({
        requestBody: {
          title: title,
        },
      });

      if (!createResponse.data || !createResponse.data.documentId) {
        return {
          success: false,
          error: 'Failed to create document',
          details: 'Docs API did not return document information',
        };
      }

      const documentId = createResponse.data.documentId;
      const documentTitle = createResponse.data.title || title;

      console.log('Document created with ID:', documentId);

      // Step 2: Add content if provided
      if (content && content.trim()) {
        console.log('Adding initial content to document');
        try {
          await this.docs.documents.batchUpdate({
            documentId: documentId,
            requestBody: {
              requests: [{
                insertText: {
                  location: { index: 1 },
                  text: content,
                },
              }],
            },
          });
          console.log('Content added successfully');
        } catch (contentError: any) {
          console.error('Error adding content:', contentError.message);
          // Don't fail the whole operation if content insertion fails
          // The document was already created
        }
      }

      // Step 3: Move to folder if folder_id is provided
      if (folder_id && folder_id.trim()) {
        console.log('Moving document to folder:', folder_id);
        try {
          await this.drive.files.update({
            fileId: documentId,
            addParents: folder_id,
            removeParents: 'root',
            fields: 'id, parents',
          });
          console.log('Document moved to folder successfully');
        } catch (folderError: any) {
          console.error('Error moving to folder:', folderError.message);
          // Don't fail the whole operation if folder move fails
          // The document was already created
        }
      }

      // Step 4: Return success response
      const webViewLink = `https://docs.google.com/document/d/${documentId}/edit`;

      return {
        success: true,
        document_id: documentId,
        title: documentTitle,
        url: webViewLink,
      };

    } catch (error: any) {
      console.error('Error creating document:', error);
      return {
        success: false,
        error: error.message || 'Failed to create document',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get document content (text extraction)
   * @param request - GetDocumentContentRequest with document_id and optional range
   * @returns GetDocumentContentResponse with text content or error
   */
  async getDocumentContent(request: GetDocumentContentRequest): Promise<GetDocumentContentResponse> {
    try {
      const { document_id, range } = request;

      console.log('Getting content for document:', document_id);

      // Get the document
      const response = await this.docs.documents.get({
        documentId: document_id,
      });

      if (!response.data || !response.data.body) {
        return {
          success: false,
          error: 'Failed to retrieve document',
          details: 'Document body not found',
        };
      }

      // Extract text from document body
      let fullText = '';
      const content = response.data.body.content || [];

      for (const element of content) {
        if (element.paragraph) {
          const paragraphElements = element.paragraph.elements || [];
          for (const paragraphElement of paragraphElements) {
            if (paragraphElement.textRun && paragraphElement.textRun.content) {
              fullText += paragraphElement.textRun.content;
            }
          }
        } else if (element.table) {
          // Extract text from tables
          const tableRows = element.table.tableRows || [];
          for (const row of tableRows) {
            const cells = row.tableCells || [];
            for (const cell of cells) {
              const cellContent = cell.content || [];
              for (const cellElement of cellContent) {
                if (cellElement.paragraph) {
                  const paragraphElements = cellElement.paragraph.elements || [];
                  for (const paragraphElement of paragraphElements) {
                    if (paragraphElement.textRun && paragraphElement.textRun.content) {
                      fullText += paragraphElement.textRun.content;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Apply range filter if specified (simple implementation)
      let textContent = fullText;
      if (range && range.trim()) {
        // Range format could be "start:end" for character indices
        const rangeParts = range.split(':');
        if (rangeParts.length === 2) {
          const start = parseInt(rangeParts[0]) || 0;
          const end = parseInt(rangeParts[1]) || fullText.length;
          textContent = fullText.substring(start, end);
        }
      }

      console.log('Content extracted successfully, length:', textContent.length);

      return {
        success: true,
        text_content: textContent,
      };

    } catch (error: any) {
      console.error('Error getting document content:', error);
      return {
        success: false,
        error: error.message || 'Failed to get document content',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Append text to document
   * @param request - AppendTextRequest with document_id, text, and optional location
   * @returns AppendTextResponse with success status or error
   */
  async appendText(request: AppendTextRequest): Promise<AppendTextResponse> {
    try {
      const { document_id, text, location } = request;

      console.log('Appending text to document:', document_id);

      // Get document to find the end location if not specified
      let insertIndex = location;
      if (insertIndex === undefined) {
        const doc = await this.docs.documents.get({
          documentId: document_id,
        });

        if (!doc.data || !doc.data.body || !doc.data.body.content) {
          return {
            success: false,
            error: 'Failed to retrieve document for append',
            details: 'Document body not found',
          };
        }

        // Find the last index in the document
        const content = doc.data.body.content || [];
        insertIndex = 1; // Default to beginning
        for (const element of content) {
          if (element.endIndex) {
            insertIndex = element.endIndex;
          }
        }
        // Insert before the last character (usually a newline)
        insertIndex = Math.max(1, insertIndex - 1);
      }

      console.log('Inserting text at index:', insertIndex);

      // Append the text
      await this.docs.documents.batchUpdate({
        documentId: document_id,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: insertIndex },
              text: text,
            },
          }],
        },
      });

      console.log('Text appended successfully');

      return {
        success: true,
        updated: true,
      };

    } catch (error: any) {
      console.error('Error appending text:', error);
      return {
        success: false,
        error: error.message || 'Failed to append text',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Replace text in document
   * @param request - ReplaceTextRequest with document_id, find_text, and replace_text
   * @returns ReplaceTextResponse with success status, replacements count, or error
   */
  async replaceText(request: ReplaceTextRequest): Promise<ReplaceTextResponse> {
    try {
      const { document_id, find_text, replace_text } = request;

      console.log('Replacing text in document:', document_id);
      console.log('Find:', find_text, '-> Replace:', replace_text);

      // Use replaceAllText API
      const response = await this.docs.documents.batchUpdate({
        documentId: document_id,
        requestBody: {
          requests: [{
            replaceAllText: {
              containsText: {
                text: find_text,
                matchCase: false, // Case-insensitive by default
              },
              replaceText: replace_text,
            },
          }],
        },
      });

      // Count replacements
      let replacementsCount = 0;
      if (response.data && response.data.replies) {
        for (const reply of response.data.replies) {
          if (reply.replaceAllText && reply.replaceAllText.occurrencesChanged) {
            replacementsCount += reply.replaceAllText.occurrencesChanged;
          }
        }
      }

      console.log('Text replaced successfully, replacements:', replacementsCount);

      return {
        success: true,
        updated: replacementsCount > 0,
        replacements_count: replacementsCount,
      };

    } catch (error: any) {
      console.error('Error replacing text:', error);
      return {
        success: false,
        error: error.message || 'Failed to replace text',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Copy/duplicate a document
   * @param request - CopyDocumentRequest with source_document_id, new_title, and optional folder_id
   * @returns CopyDocumentResponse with new document details or error
   */
  async copyDocument(request: CopyDocumentRequest): Promise<CopyDocumentResponse> {
    try {
      const { source_document_id, new_title, folder_id } = request;

      console.log('Copying document:', source_document_id, 'to:', new_title);

      // Copy the document using Drive API
      const copyResponse = await this.drive.files.copy({
        fileId: source_document_id,
        requestBody: {
          name: new_title,
          parents: folder_id ? [folder_id] : undefined,
        },
      });

      if (!copyResponse.data || !copyResponse.data.id) {
        return {
          success: false,
          error: 'Failed to copy document',
          details: 'Drive API did not return new document information',
        };
      }

      const newDocumentId = copyResponse.data.id;
      const webViewLink = `https://docs.google.com/document/d/${newDocumentId}/edit`;

      console.log('Document copied successfully, new ID:', newDocumentId);

      return {
        success: true,
        new_document_id: newDocumentId,
        url: webViewLink,
      };

    } catch (error: any) {
      console.error('Error copying document:', error);
      return {
        success: false,
        error: error.message || 'Failed to copy document',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Share document with permissions
   * @param request - ShareDocumentRequest with document_id, role, and optional email
   * @returns ShareDocumentResponse with share link and permission ID or error
   */
  async shareDocument(request: ShareDocumentRequest): Promise<ShareDocumentResponse> {
    try {
      const { document_id, role, email } = request;

      console.log('Sharing document:', document_id, 'with role:', role);

      // Map role to Google Drive role
      const driveRole = role === 'editor' ? 'writer' : role;

      let permissionId: string | undefined;

      if (email) {
        // Share with specific email
        console.log('Sharing with email:', email);
        const permissionResponse = await this.drive.permissions.create({
          fileId: document_id,
          requestBody: {
            type: 'user',
            role: driveRole,
            emailAddress: email,
          },
          sendNotificationEmail: true,
          fields: 'id',
        });

        permissionId = permissionResponse.data.id || undefined;
      } else {
        // Share with anyone with the link
        console.log('Sharing with anyone with the link');
        const permissionResponse = await this.drive.permissions.create({
          fileId: document_id,
          requestBody: {
            type: 'anyone',
            role: driveRole,
          },
          fields: 'id',
        });

        permissionId = permissionResponse.data.id || undefined;
      }

      // Get the shareable link
      const fileResponse = await this.drive.files.get({
        fileId: document_id,
        fields: 'webViewLink',
      });

      const shareLink = fileResponse.data.webViewLink ||
                       `https://docs.google.com/document/d/${document_id}/edit`;

      console.log('Document shared successfully');

      return {
        success: true,
        share_link: shareLink,
        permission_id: permissionId,
      };

    } catch (error: any) {
      console.error('Error sharing document:', error);
      return {
        success: false,
        error: error.message || 'Failed to share document',
        details: error.response?.data?.error?.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate connection to Google Docs API
   * @returns true if connection is valid, false otherwise
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Test API connection with a minimal request
      // This will fail gracefully if credentials are invalid
      await this.docs.documents.get({ documentId: 'test-validation' });
      return true;
    } catch (error: any) {
      // Expected to fail with 404 or permission error, but that means API is reachable
      if (error.code === 404 || error.code === 403) {
        return true;
      }
      console.error('Docs connection validation failed:', error.message);
      return false;
    }
  }
}
