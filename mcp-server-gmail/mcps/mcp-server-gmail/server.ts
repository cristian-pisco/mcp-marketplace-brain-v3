import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import createMcpServer from "./index.ts";

if (import.meta.main) {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  await server.connect(transport);

  const port = Number(Deno.env.get("PORT") ?? 3333);

  const httpServer = createServer(async (req, res) => {
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Failed to handle request", error);
      res.writeHead(500).end();
    }
  });

  httpServer.listen(port, () => {
    console.log(`MCP Streamable HTTP server running on port ${port}`);
  });

  const shutdown = () => {
    httpServer.close();
    transport.close?.();
  };

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);
}
