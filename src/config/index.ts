/**
 * Configuration management for SearXNG MCP server
 * Handles environment variables and configuration validation
 */

export interface Config {
  searxng: {
    url: string;
    auth?: {
      username: string;
      password: string;
    };
  };
  transport: {
    type: "stdio" | "http";
    host?: string;
    port?: number;
  };
  debug: boolean;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const searxngUrl = process.env.SEARXNG_URL;
  if (!searxngUrl) {
    throw new Error("SEARXNG_URL environment variable is required");
  }

  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  
  // Validate Basic Auth configuration
  const auth = username && password ? { username, password } : undefined;
  if ((username && !password) || (!username && password)) {
    throw new Error("Both USERNAME and PASSWORD must be provided for Basic Auth");
  }

  const transport = process.env.TRANSPORT as "stdio" | "http" || "stdio";
  const host = process.env.HOST || "0.0.0.0";
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const debug = process.env.DEBUG === "true";

  // Validate HTTP transport configuration
  if (transport === "http") {
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error("Invalid PORT value. Must be a number between 1 and 65535");
    }
  }

  return {
    searxng: {
      url: searxngUrl,
      auth,
    },
    transport: {
      type: transport,
      host: transport === "http" ? host : undefined,
      port: transport === "http" ? port : undefined,
    },
    debug,
  };
}

/**
 * Validate configuration object
 */
export function validateConfig(config: Config): void {
  if (!config.searxng.url) {
    throw new Error("SearXNG URL is required");
  }

  try {
    new URL(config.searxng.url);
  } catch (error) {
    throw new Error("Invalid SearXNG URL format");
  }

  if (!["stdio", "http"].includes(config.transport.type)) {
    throw new Error("Transport type must be either 'stdio' or 'http'");
  }

  if (config.transport.type === "http") {
    if (!config.transport.host || !config.transport.port) {
      throw new Error("Host and port are required for HTTP transport");
    }
  }
}
