/**
 * Transport layer type definitions
 * Defines interfaces for different MCP transport protocols
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Transport interface for MCP server
 */
export interface Transport {
  /**
   * Start the transport and begin listening for connections
   */
  start(): Promise<void>;

  /**
   * Stop the transport and close all connections
   */
  stop(): Promise<void>;

  /**
   * Get transport status
   */
  isRunning(): boolean;
}

/**
 * Transport configuration options
 */
export interface TransportConfig {
  type: 'stdio' | 'http';
  host?: string;
  port?: number;
}

/**
 * Transport factory interface
 */
export interface TransportFactory {
  create(server: Server, config: TransportConfig): Transport;
}
