#!/usr/bin/env -S deno run -A

// Minimal MCP Server Boilerplate Example
// --------------------------------------
// This file demonstrates the simplest possible custom MCP server setup.
//
// 1. Rename this file to mcp-server.ts (optional)
// 2. Run with: deno run -A mcp-server.ts
//
// For more info, see: https://github.com/modelcontext/modelcontextprotocol

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "npm:zod";

/**
 * Minimal MCP server with a single example tool.
 *
 * Edit this file to add your own tools and logic!
 */
export default function createMcpServer(headers: Record<string, string | undefined>): McpServer {
  // Create the MCP server instance with basic metadata
  const server = new McpServer({
    name: "mcp-caller-wrapper", // Name your server
    version: "0.0.1"        // Version of your server
  });

  // ---------------------------------------------------------------------------
  // Example Tool: greet
  // ---------------------------------------------------------------------------
  // This tool returns a greeting for a given name.
  // You can add more tools by copying this pattern and changing the logic.
  server.tool(
    "greet", // Tool name (used to call this tool)
    {
      name: z.string().describe("Name of the person to greet") // Tool input schema
    },
    // Tool implementation: receives an object with the input parameters
    ({ name }: { name: string }) => {
      // Return a simple greeting as the tool's output
      return {
        content: [{
          type: "text",
          text: `Hello, ${name}!`
        }]
      };
    }
  );
  // ---------------------------------------------------------------------------

  // Return the configured server instance
  return server;
}
