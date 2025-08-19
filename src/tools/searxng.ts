/**
 * SearXNG search tool implementation
 * Handles the search tool execution and result formatting
 */

import { SearXNGApiClient, SearchOptions, MultiSearchResult } from '../services/searxng-api.js';
import { Config } from '../config/index.js';

/**
 * Simplified search result for MCP response
 */
export interface SearchResult {
  /** Search result title */
  title: string;
  /** Search result URL */
  link: string;
  /** Search result snippet/summary */
  snippet: string;
}

/**
 * Search response for a single query
 */
export interface SearchResponse {
  /** Search query */
  query: string;
  /** Search results list */
  results: SearchResult[];
  /** Number of results found */
  total_results: number;
  /** Whether the search was successful */
  success: boolean;
  /** Error message if search failed */
  error?: string;
}

/**
 * Multi-search response for MCP
 */
export interface MultiSearchResponse {
  /** Multiple search results */
  searches: SearchResponse[];
  /** Summary statistics */
  summary: {
    total_queries: number;
    successful_queries: number;
    failed_queries: number;
  };
}

/**
 * SearXNG search tool handler
 */
export class SearXNGSearchTool {
  private apiClient: SearXNGApiClient;

  constructor(config: Config) {
    this.apiClient = new SearXNGApiClient(
      config.searxng.url,
      config.searxng.auth
    );
  }

  /**
   * Execute search with multiple queries
   */
  async executeSearch(
    queries: string[],
    engines?: string[],
    categories?: string[],
    safesearch?: number,
    language?: string
  ): Promise<MultiSearchResponse> {
    const options: SearchOptions = {
      engines,
      categories,
      safesearch,
      language,
    };

    try {
      const multiResult = await this.apiClient.search(queries, options);
      return this.formatResponse(multiResult);
    } catch (error) {
      throw new Error(`Search execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format API response for MCP client
   */
  private formatResponse(multiResult: MultiSearchResult): MultiSearchResponse {
    const searches: SearchResponse[] = multiResult.results.map(result => {
      if (result.success && result.data) {
        // Convert SearXNG results to simplified format
        const results: SearchResult[] = result.data.results.map(item => ({
          title: item.title,
          link: item.url,
          snippet: item.content,
        }));

        return {
          query: result.query,
          results,
          total_results: result.data.number_of_results,
          success: true,
        };
      } else {
        return {
          query: result.query,
          results: [],
          total_results: 0,
          success: false,
          error: result.error || 'Unknown error',
        };
      }
    });

    return {
      searches,
      summary: {
        total_queries: multiResult.summary.total,
        successful_queries: multiResult.summary.successful,
        failed_queries: multiResult.summary.failed,
      },
    };
  }

  /**
   * Test connection to SearXNG instance
   */
  async testConnection(): Promise<boolean> {
    return await this.apiClient.testConnection();
  }
}
