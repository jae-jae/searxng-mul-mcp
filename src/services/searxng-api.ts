/**
 * SearXNG API client implementation
 * Provides interface to SearXNG search API with Basic Auth support
 */

/**
 * Valid language codes supported by SearXNG
 * Based on official SearXNG sxng_locales.py
 */
const VALID_LANGUAGE_CODES = new Set([
  // Basic language codes
  'af', 'ar', 'be', 'bg', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi',
  'fr', 'ga', 'gd', 'gl', 'he', 'hi', 'hr', 'hu', 'id', 'is', 'it', 'ja', 'kn', 'ko', 'lt', 'lv',
  'ml', 'mr', 'nb', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sq', 'sv', 'ta', 'te', 'th', 'tr',
  'uk', 'ur', 'vi', 'zh',
  // Language codes with regions
  'ar-sa', 'bg-bg', 'cs-cz', 'da-dk', 'de-at', 'de-be', 'de-ch', 'de-de', 'el-gr', 'en-au', 'en-ca',
  'en-gb', 'en-ie', 'en-in', 'en-nz', 'en-ph', 'en-pk', 'en-sg', 'en-us', 'en-za', 'es-ar', 'es-cl',
  'es-co', 'es-es', 'es-mx', 'es-pe', 'et-ee', 'fi-fi', 'fr-be', 'fr-ca', 'fr-ch', 'fr-fr', 'hu-hu',
  'id-id', 'it-ch', 'it-it', 'ja-jp', 'ko-kr', 'nb-no', 'nl-be', 'nl-nl', 'pl-pl', 'pt-br', 'pt-pt',
  'ro-ro', 'ru-ru', 'sv-se', 'th-th', 'tr-tr', 'vi-vn', 'zh-cn', 'zh-hk', 'zh-tw'
]);

/**
 * Validates if a language code is supported by SearXNG
 */
function isValidLanguageCode(language: string): boolean {
  if (!language || typeof language !== 'string') {
    return false;
  }
  
  // Remove whitespace and convert to lowercase
  const cleanLanguage = language.trim().toLowerCase();
  
  // Check if it's a valid language code format (2-3 letters, optionally followed by dash and 2 letters)
  if (!/^[a-z]{2,3}(-[a-z]{2})?$/.test(cleanLanguage)) {
    return false;
  }
  
  return VALID_LANGUAGE_CODES.has(cleanLanguage);
}

export interface SearchOptions {
  /** List of search engines to use (optional) */
  engines?: string[];
  /** Search categories like general, images, news (optional) */
  categories?: string[];
  /** Response format, always json for API usage */
  format?: "json";
  /** Safe search level (0-2) */
  safesearch?: number;
  /** Search language code */
  language?: string;
}

export interface SearchResultItem {
  /** Complete URL of the result page */
  url: string;
  /** Page title */
  title: string;
  /** Page content summary */
  content: string;
  /** Thumbnail URL (may be null) */
  thumbnail?: string | null;
  /** Search engine that provided this result */
  engine: string;
  /** Result template type */
  template: string;
  /** Parsed URL components [protocol, domain, path, query, fragment, other] */
  parsed_url: [string, string, string, string, string, string];
  /** Image source URL */
  img_src?: string;
  /** Result priority */
  priority?: string;
  /** List of all search engines that provided this result */
  engines: string[];
  /** Ranking positions in various search engines */
  positions: number[];
  /** Relevance score */
  score: number;
  /** Search category */
  category: string;
}

export interface AnswerItem {
  /** Answer source URL */
  url: string;
  /** Answer template type */
  template: string;
  /** Search engine that provided the answer */
  engine: string;
  /** Parsed URL components */
  parsed_url: [string, string, string, string, string, string];
  /** Answer content */
  answer: string;
}

export interface InfoboxItem {
  /** Infobox title */
  infobox: string;
  /** Infobox unique identifier */
  id: string;
  /** Infobox content description */
  content: string;
  /** Infobox image URL */
  img_src?: string;
  /** Related links list */
  urls: Array<{
    /** Link title */
    title: string;
    /** Link URL */
    url: string;
    /** Whether this is an official link */
    official?: boolean;
  }>;
  /** Attribute information list */
  attributes: Array<{
    /** Attribute label */
    label: string;
    /** Attribute value */
    value: string;
    /** Entity identifier */
    entity: string;
  }>;
  /** Search engine that provided the information */
  engine: string;
  /** Associated URL for the infobox */
  url: string | null;
  /** Infobox template type */
  template: string;
  /** Parsed URL components */
  parsed_url: [string, string, string, string, string, string] | null;
  /** Infobox title */
  title: string;
  /** Thumbnail URL */
  thumbnail: string;
  /** Priority */
  priority: string;
  /** List of search engines */
  engines: string[];
  /** Ranking position */
  positions: string | number;
  /** Relevance score */
  score: number;
  /** Search category */
  category: string;
}

export interface SearchResult {
  /** Search query string */
  query: string;
  /** Total number of search results */
  number_of_results: number;
  /** List of search results */
  results: SearchResultItem[];
  /** Direct answers (like Wikipedia summaries) */
  answers?: AnswerItem[];
  /** Spelling correction suggestions */
  corrections?: string[];
  /** Infobox data */
  infoboxes?: InfoboxItem[];
  /** Search suggestions */
  suggestions?: string[];
  /** Unresponsive engines with error messages */
  unresponsive_engines?: [string, string][];
}

export interface MultiSearchResult {
  /** List of search queries */
  queries: string[];
  /** Results for each query */
  results: Array<{
    query: string;
    success: boolean;
    data: SearchResult | null;
    error: string | null;
  }>;
  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * SearXNG API client with Basic Auth support
 */
export class SearXNGApiClient {
  private baseUrl: string;
  private auth?: { username: string; password: string };
  private timeout: number;

  constructor(
    baseUrl: string,
    auth?: { username: string; password: string },
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.auth = auth;
    this.timeout = timeout;
  }

  /**
   * Generate Basic Auth headers if credentials are provided
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.auth) return {};

    const credentials = Buffer.from(
      `${this.auth.username}:${this.auth.password}`
    ).toString("base64");

    return {
      Authorization: `Basic ${credentials}`,
    };
  }

  /**
   * Execute a single search query
   */
  private async searchSingle(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult> {
    const searchParams = new URLSearchParams({
      q: query,
      format: "json",
    });

    // Add optional parameters
    if (options?.engines?.length) {
      searchParams.append("engines", options.engines.join(","));
    }
    if (options?.categories?.length) {
      searchParams.append("categories", options.categories.join(","));
    }
    if (options?.safesearch !== undefined) {
      searchParams.append("safesearch", options.safesearch.toString());
    }
    if (options?.language && isValidLanguageCode(options.language)) {
      searchParams.append("language", options.language.trim().toLowerCase());
    }

    const url = `${this.baseUrl}/search?${searchParams.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "SearXNG-Mul-MCP-Client/1.0.0",
          Accept: "application/json",
          ...this.getAuthHeaders(),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as SearchResult;
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Search failed for query "${query}": ${error.message}`);
      }
      throw new Error(`Search failed for query "${query}": Unknown error`);
    }
  }

  /**
   * Execute multiple search queries in parallel
   */
  async search(
    queries: string[],
    options?: SearchOptions
  ): Promise<MultiSearchResult> {
    if (!queries.length) {
      throw new Error("At least one search query is required");
    }

    // Create parallel search tasks with error handling
    const searchTasks = queries.map(async (query) => {
      try {
        const data = await this.searchSingle(query, options);
        return {
          query,
          success: true,
          data,
          error: null,
        };
      } catch (error) {
        return {
          query,
          success: false,
          data: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Wait for all searches to complete
    const results = await Promise.all(searchTasks);

    // Calculate summary statistics
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      queries,
      results,
      summary: {
        total: queries.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Test connection to SearXNG instance
   */
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/`, {
        method: "HEAD",
        headers: this.getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}
