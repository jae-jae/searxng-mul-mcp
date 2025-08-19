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
    throw new Error(`
❌ SEARXNG_URL environment variable is required!

Please set the SEARXNG_URL environment variable to your SearXNG instance URL.

Examples:
  export SEARXNG_URL="https://search.example.com"
  export SEARXNG_URL="http://localhost:8080"

You can also create a .env file in the project root:
  SEARXNG_URL=https://search.example.com
  USERNAME=your_username (optional)
  PASSWORD=your_password (optional)
`);
  }

  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  
  // Validate Basic Auth configuration
  const auth = username && password ? { username, password } : undefined;
  if ((username && !password) || (!username && password)) {
    throw new Error(`
❌ Invalid Basic Auth configuration!

Both USERNAME and PASSWORD must be provided together for Basic Auth.
Current state:
  USERNAME: ${username ? 'set' : 'not set'}
  PASSWORD: ${password ? 'set' : 'not set'}

Please either:
1. Set both USERNAME and PASSWORD environment variables
2. Or remove both to disable authentication
`);
  }

  const transport = process.env.TRANSPORT as "stdio" | "http" || "stdio";
  const host = process.env.HOST || "0.0.0.0";
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const debug = process.env.DEBUG === "true";

  // Validate HTTP transport configuration
  if (transport === "http") {
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`
❌ Invalid PORT configuration!

PORT must be a valid number between 1 and 65535.
Current PORT value: ${process.env.PORT}

Examples:
  export PORT=3000
  export PORT=8080
`);
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
    throw new Error("❌ SearXNG URL is required");
  }

  try {
    new URL(config.searxng.url);
  } catch (error) {
    throw new Error(`
❌ Invalid SearXNG URL format!

The provided URL is not valid: ${config.searxng.url}

Please provide a valid URL format:
  https://search.example.com
  http://localhost:8080
`);
  }

  if (!["stdio", "http"].includes(config.transport.type)) {
    throw new Error(`
❌ Invalid transport type!

Transport type must be either 'stdio' or 'http'.
Current value: ${config.transport.type}
`);
  }

  if (config.transport.type === "http") {
    if (!config.transport.host || !config.transport.port) {
      throw new Error(`
❌ Incomplete HTTP transport configuration!

Host and port are required for HTTP transport.
Current configuration:
  Host: ${config.transport.host || 'not set'}
  Port: ${config.transport.port || 'not set'}
`);
    }
  }
}
