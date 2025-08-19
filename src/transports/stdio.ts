/**
 * Stdio transport implementation for MCP server
 * Handles standard input/output communication protocol
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Transport } from './types.js';
import { Logger } from '../utils/logger.js';

/**
 * Stdio transport for MCP communication
 */
export class StdioTransport implements Transport {
  private server: Server;
  private transport: StdioServerTransport;
  private logger: Logger;
  private running: boolean = false;

  constructor(server: Server, logger: Logger) {
    this.server = server;
    this.logger = logger;
    this.transport = new StdioServerTransport();
  }

  /**
   * Start stdio transport
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting stdio transport...');
      
      await this.server.connect(this.transport);
      this.running = true;
      
      this.logger.info('Stdio transport started successfully');
      this.logger.info('MCP server is ready to accept connections via stdio');
    } catch (error) {
      this.logger.error('Failed to start stdio transport', error);
      throw error;
    }
  }

  /**
   * Stop stdio transport
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping stdio transport...');
      
      await this.transport.close();
      this.running = false;
      
      this.logger.info('Stdio transport stopped');
    } catch (error) {
      this.logger.error('Error stopping stdio transport', error);
      throw error;
    }
  }

  /**
   * Check if transport is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
