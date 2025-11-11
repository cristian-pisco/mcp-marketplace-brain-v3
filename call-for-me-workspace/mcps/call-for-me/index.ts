#!/usr/bin/env -S deno run -A

// MCP Wrapper for Make-A-Call-For-Me Service
// ------------------------------------------
// This wrapper provides tools to make automated phone calls via the
// make-a-call-for-me.fly.dev MCP server using the MCP Client SDK

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "npm:@modelcontextprotocol/sdk/client/sse.js";
import { z } from "npm:zod";

const REMOTE_MCP_URL = Deno.env.has("SERVICE_URL") ? Deno.env.get("SERVICE_URL") : "https://make-a-call-for-me.fly.dev/mcp";
const CONVERSATION_API_URL = Deno.env.has("CONVERSATION_API_URL") ? Deno.env.get("CONVERSATION_API_URL") : "http://host.docker.internal:8903/api";
/**
 * Creates and connects an MCP client to the remote server
 */
async function createRemoteClient(): Promise<Client> {
  const baseUrl = new URL(REMOTE_MCP_URL);
  let client: Client | undefined = undefined;

  try {
    // Try Streamable HTTP transport first
    client = new Client({
      name: "call-for-me-wrapper",
      version: "1.0.0"
    });
    const transport = new StreamableHTTPClientTransport(baseUrl);
    await client.connect(transport);
    console.log("Connected to remote MCP using Streamable HTTP transport");
    return client;
  } catch (error) {
    // If that fails, try the older SSE transport
    console.log("Streamable HTTP connection failed, falling back to SSE transport");
    client = new Client({
      name: "call-for-me-wrapper",
      version: "1.0.0"
    });
    const sseTransport = new SSEClientTransport(baseUrl);
    await client.connect(sseTransport);
    console.log("Connected to remote MCP using SSE transport");
    return client;
  }
}

/**
 * MCP server wrapper for make-a-call-for-me service
 */
export default function createMcpServer(headers: Record<string, string | undefined>): McpServer {
  const server = new McpServer({
    name: "call-for-me",
    version: "0.0.1"
  });

  let remoteClient: Client | null = null;

  /**
   * Get or create the remote client connection
   */
  async function getRemoteClient(): Promise<Client> {
    if (!remoteClient) {
      remoteClient = await createRemoteClient();
    }
    return remoteClient;
  }

  // ---------------------------------------------------------------------------
  // Tool: make_call
  // ---------------------------------------------------------------------------
  // Make an automated phone call to a recipient
  server.tool(
    "make_call",
    "Make an automated phone call to a recipient when you need an AI agent to deliver a personalized message, reminder, notification, or have a conversation on behalf of someone. Use this when a human needs to communicate information via phone but cannot make the call themselves.",
    {
      to_number: z.string().describe("Recipient's phone number in E.164 format (e.g., +1234567890)"),
      recipient_name: z.string().describe("First name or full name of the person being called (used to personalize the conversation)"),
      from_name: z.string().describe("Name of the person who is sending this message/call (e.g., \"John\", \"Dr. Smith\", \"Maria from Acme Corp\")"),
      prompt: z.string().describe("The specific task, message, or objective the AI agent should accomplish during the call. Be clear and detailed about what information to deliver, what questions to ask, or what conversation to have. Examples: \"Remind them about their appointment tomorrow at 3pm\", \"Ask if they can attend the meeting on Friday\", \"Deliver the message that their order is ready for pickup\"")
    },
    async ({ to_number, recipient_name, from_name, prompt }: {
      to_number: string;
      recipient_name: string;
      from_name: string;
      prompt: string;
    }) => {
      try {
        const client = await getRemoteClient();

        // Call the remote tool using the MCP client
        const result = await client.callTool({
          name: "make_call",
          arguments: {
            to_number,
            recipient_name,
            from_name,
            prompt
          }
        });

        // Parse the response from the remote MCP
        const content = result.content;
        if (content && content.length > 0 && content[0].type === "text") {
          try {
            const responseData = JSON.parse(content[0].text);

            if (responseData.success && responseData.data) {
              // Send the data to the external service
              const payload = {
                externalCallId: responseData.data.conversation_id,
                metadata: {
                  conversation_id: responseData.data.conversation_id,
                  call_sid: responseData.data.call_sid,
                  to_number: responseData.data.to_number,
                  recipient_name: responseData.data.recipient_name,
                  from_name: responseData.data.from_name,
                  agent_id: responseData.data.agent_id,
                  prompt: responseData.data.prompt
                }
              };

              const httpResponse = await fetch(`${CONVERSATION_API_URL}/v1/conversations`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
              });

              if (!httpResponse.ok) {
                console.error(`Failed to send conversation data to external service: ${httpResponse.status} ${httpResponse.statusText}`);
              } else {
                console.log("Conversation data sent successfully to external service");
              }
            }
          } catch (parseError) {
            console.error("Failed to parse or send conversation data:", parseError);
          }
        }

        return {
          content: result.content
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to make call: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Tool: get_conversation
  // ---------------------------------------------------------------------------
  // Retrieve conversation details including call status, transcript, duration, and analysis
  server.tool(
    "get_conversation",
    "Retrieve conversation details including call status, transcript, duration, and analysis results",
    {
      conversation_id: z.string().describe("ElevenLabs conversation ID")
    },
    async ({ conversation_id }: { conversation_id: string }) => {
      try {
        const client = await getRemoteClient();

        // Call the remote tool using the MCP client
        const result = await client.callTool({
          name: "get_conversation",
          arguments: {
            conversation_id
          }
        });

        return {
          content: result.content
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to get conversation: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  return server;
}
