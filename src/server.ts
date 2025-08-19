/**
 * MCP server core logic for SearXNG integration
 * Handles tool registration and execution
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { SearXNGSearchTool } from "./tools/searxng.js";
import { Config } from "./config/index.js";
import { Logger } from "./utils/logger.js";

/**
 * MCP server for SearXNG search functionality
 */
export class SearXNGMCPServer {
  private server: Server;
  private searchTool: SearXNGSearchTool;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.logger = logger;
    this.searchTool = new SearXNGSearchTool(config);

    // Initialize MCP server
    this.server = new Server(
      {
        name: "searxng-mul-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug("Received list_tools request");
      return {
        tools: tools,
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.info(`Executing tool: ${name}`, args);

      try {
        switch (name) {
          case "search":
            return await this.handleSearchTool(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Tool execution failed: ${name}`, error);
        throw error;
      }
    });
  }

  /**
   * Handle search tool execution
   */
  private async handleSearchTool(args: any) {
    // Validate required parameters
    if (
      !args.queries ||
      !Array.isArray(args.queries) ||
      args.queries.length === 0
    ) {
      throw new Error(
        "queries parameter is required and must be a non-empty array"
      );
    }

    // Validate query strings
    for (const query of args.queries) {
      if (typeof query !== "string" || query.trim().length === 0) {
        throw new Error("All queries must be non-empty strings");
      }
    }

    // Extract optional parameters
    const engines =
      args.engines && Array.isArray(args.engines) ? args.engines : undefined;
    const categories =
      args.categories && Array.isArray(args.categories)
        ? args.categories
        : undefined;
    const safesearch =
      typeof args.safesearch === "number" ? args.safesearch : undefined;
    const language =
      typeof args.language === "string" ? args.language : undefined;

    // Validate safesearch parameter
    if (safesearch !== undefined && (safesearch < 0 || safesearch > 2)) {
      throw new Error("safesearch must be between 0 and 2");
    }

    this.logger.info(`Searching ${args.queries.length} queries`, {
      queries: args.queries,
      engines,
      categories,
      safesearch,
      language,
    });

    try {
      // Execute search
      const result = await this.searchTool.executeSearch(
        args.queries,
        engines,
        categories,
        safesearch,
        language
      );

      this.logger.info("Search completed successfully", {
        total_queries: result.summary.total_queries,
        successful: result.summary.successful_queries,
        failed: result.summary.failed_queries,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error("Search execution failed", error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Test SearXNG connection
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.info("Testing SearXNG connection...");
      const isConnected = await this.searchTool.testConnection();

      if (isConnected) {
        this.logger.info("SearXNG connection test successful");
      } else {
        this.logger.warn("SearXNG connection test failed");
      }

      return isConnected;
    } catch (error) {
      this.logger.error("SearXNG connection test error", error);
      return false;
    }
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): Server {
    return this.server;
  }
}
