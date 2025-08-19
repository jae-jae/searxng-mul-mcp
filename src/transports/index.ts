/**
 * Transport factory for creating MCP transport instances
 * Supports both stdio and HTTP transport protocols
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Transport, TransportConfig, TransportFactory } from './types.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport } from './http.js';
import { Logger } from '../utils/logger.js';

/**
 * Factory for creating transport instances
 */
export class DefaultTransportFactory implements TransportFactory {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create transport instance based on configuration
   */
  create(server: Server, config: TransportConfig): Transport {
    switch (config.type) {
      case 'stdio':
        this.logger.info('Creating stdio transport');
        return new StdioTransport(server, this.logger);

      case 'http':
        if (!config.host || !config.port) {
          throw new Error('Host and port are required for HTTP transport');
        }
        this.logger.info(`Creating HTTP transport on ${config.host}:${config.port}`);
        return new HttpTransport(server, config.host, config.port, this.logger);

      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }
}

// Export transport types and implementations
export * from './types.js';
export * from './stdio.js';
export * from './http.js';
