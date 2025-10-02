import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "npm:express@4.18.2";
import type { Request, Response, NextFunction } from "npm:express@4.18.2";

const JSONRPC = { VERSION: "2.0" } as const;

interface AuthContext {
  headers: Record<string, string | undefined>;
}

// import { createServer } from "node:http";
// import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk/server/streamableHttp.js";
// import { randomUUID } from "node:crypto";
// import createMcpServer from "./index.ts";

// if (import.meta.main) {
//   const server = createMcpServer();
//   const transport = new StreamableHTTPServerTransport({
//     sessionIdGenerator: () => randomUUID()
//   });

//   await server.connect(transport);

//   const port = Number(Deno.env.get("PORT") ?? 3333);

//   const httpServer = createServer(async (req, res) => {
//     try {
//       await transport.handleRequest(req, res);
//     } catch (error) {
//       console.error("Failed to handle request", error);
//       res.writeHead(500).end();
//     }
//   });

//   httpServer.listen(port, () => {
//     console.log(`MCP Streamable HTTP server running on port ${port}`);
//   });

//   const shutdown = () => {
//     httpServer.close();
//     transport.close?.();
//   };

//   Deno.addSignalListener("SIGINT", shutdown);
//   Deno.addSignalListener("SIGTERM", shutdown);
// }

type McpFactoryFn = (auth?: AuthContext) => McpServer | Promise<McpServer>;

interface McpServerModule {
  default?: McpFactoryFn;
  createMcpServer?: McpFactoryFn;
}

async function createMcpServer(auth?: AuthContext): Promise<McpServer> {
  try {
    console.log("📦 Loading MCP server implementation...");
    const mcpModule = await import("./index.ts") as unknown as McpServerModule;

    if (typeof mcpModule.default === "function") {
      console.log("🎯 Using default exported MCP server function");
      const server = mcpModule.default(auth); // <-- pass auth here
      return server instanceof Promise ? await server : server;
    }

    if (mcpModule.createMcpServer && typeof mcpModule.createMcpServer === "function") {
      console.log("🎯 Using named export createMcpServer function");
      const server = mcpModule.createMcpServer(auth); // <-- pass auth here
      return server instanceof Promise ? await server : server;
    }

        throw new Error("No valid MCP server factory function found. Expected either a default export or createMcpServer named export.");
  } catch (err) {
    console.error("❌ Failed to import MCP server:", err);
    throw new Error("Failed to load MCP server: " + (err instanceof Error ? err.message : "Unknown error"));
  }
}

async function handleMcpPost(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Collect all headers into an object
    console.log("📦 Collecting headers...");
    console.log("📦 Headers collected:", req.headers);
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
          headers[key] = value.join(", ");
      } else if (typeof value === "string") {
          headers[key] = value;
      } else {
          headers[key] = undefined;
      }
    }

    // Pass headers as "authContext" to the inner MCP
    const authContext: AuthContext = { headers };
    const server = await createMcpServer(authContext);
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      // Best-effort cleanup; ignore errors on close
      Promise.resolve(transport.close()).catch(() => {});
      Promise.resolve(server.close()).catch(() => {});
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("💥 Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: JSONRPC.VERSION,
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
}

function createExpressApp(): express.Application {
  const app = express();

  // Middleware setup
  app.use(express.json());

  // CORS configuration for cross-origin requests
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // CORS preflight handler
  app.options("/mcp", (_req: Request, res: Response) => {
    res.status(200).end();
  });

  // Main MCP endpoint for client-to-server communication
  app.post("/mcp", (req: Request, res: Response) => handleMcpPost(req, res));

  // SSE notifications and session termination are not supported in stateless mode
  app.get("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: JSONRPC.VERSION,
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });
  app.delete("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: JSONRPC.VERSION,
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });

  // Health check / status endpoint
  app.get("/", (_req: Request, res: Response): void => {
    const message = APP.NAME + " running. Available at /mcp endpoint.";
    res.status(200).json({
      jsonrpc: JSONRPC.VERSION,
      id: null,
      result: { message },
    });
  });

  return app;
}

async function main(): Promise<void> {
  try {
    const port = Number(Deno.env.get("PORT") ?? 3333);
    const hostname = Deno.env.get("HOSTNAME") || "0.0.0.0";

    const app = createExpressApp();

    app.listen(port, hostname, () => {
      console.log("🚀 HTTP server listening on " + hostname + ":" + port);
      console.log("🔗 Connect to: http://" + hostname + ":" + port + "/mcp");
      console.log("📋 MCP server ready!");
    });
  } catch (error) {
    console.error("💥 Fatal error during startup:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}