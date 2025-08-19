/**
 * MCP tools definition and export
 * Defines the search tool for SearXNG integration
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Search tool definition for MCP
 * Supports multi-query parallel search with SearXNG
 */
export const searchTool: Tool = {
  name: "search",
  description: "Search multiple queries simultaneously using SearXNG metasearch engine. Supports parallel execution of multiple search queries with optional engine and category filtering.",
  inputSchema: {
    type: "object",
    properties: {
      queries: {
        type: "array",
        items: { type: "string" },
        description: "List of search queries to execute in parallel. Each query will be searched independently and results will be aggregated.",
        minItems: 1,
      },
      engines: {
        type: "array",
        items: { type: "string" },
        description: "Specific search engines to use (optional). Examples: google, bing, duckduckgo, startpage",
      },
      categories: {
        type: "array",
        items: { type: "string" },
        description: "Search categories to filter results (optional). Examples: general, images, news, videos, music, files, science",
      },
      safesearch: {
        type: "number",
        description: "Safe search level: 0 = off, 1 = moderate, 2 = strict (optional)",
        minimum: 0,
        maximum: 2,
      },
      language: {
        type: "string",
        description: "Search language code (optional). Examples: en, zh, es, fr, de",
      },
    },
    required: ["queries"],
  },
};

/**
 * All available tools for the MCP server
 */
export const tools: Tool[] = [searchTool];
