/**
 * HTTP transport implementation for MCP server
 * Provides HTTP JSON-RPC interface using Express.js with StreamableHTTPServerTransport
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from './types.js';
import { Logger } from '../utils/logger.js';
import { createServer } from 'http';

/**
 * HTTP transport for MCP communication using StreamableHTTPServerTransport
 */
export class HttpTransport implements Transport {
  private server: Server;
  private app: express.Application;
  private httpServer: any;
  private logger: Logger;
  private host: string;
  private port: number;
  private running: boolean = false;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  constructor(server: Server, host: string, port: number, logger: Logger) {
    this.server = server;
    this.host = host;
    this.port = port;
    this.logger = logger;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // CORS headers for cross-origin requests
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
      res.header('Access-Control-Expose-Headers', 'mcp-session-id');
      res.header('Access-Control-Allow-Credentials', 'false');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
      });
      next();
    });
  }

  /**
   * Setup Express routes for MCP StreamableHTTP transport
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        transport: 'StreamableHTTP',
        protocol: '2025-03-26'
      });
    });

    // Main MCP endpoint for POST requests (client-to-server communication)
    this.app.post('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.transports[sessionId]) {
          // Reuse existing transport
          transport = this.transports[sessionId];
          this.logger.debug(`Reusing existing session: ${sessionId}`);
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request
          this.logger.info('Creating new MCP session');
          
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              this.transports[sessionId] = transport;
              this.logger.info(`Session initialized: ${sessionId}`);
            }
          });

          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              delete this.transports[transport.sessionId];
              this.logger.info(`Session closed: ${transport.sessionId}`);
            }
          };

          // Connect to the MCP server
          await this.server.connect(transport);
        } else {
          // Invalid request
          this.logger.warn('Invalid MCP request: missing session ID or not initialization');
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided or invalid initialization',
            },
            id: null,
          });
          return;
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        this.logger.error('Error handling MCP request', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
          },
          id: null,
        });
      }
    });

    // Handle GET requests for server-to-client communication (SSE streams)
    this.app.get('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !this.transports[sessionId]) {
          this.logger.warn(`Invalid session ID for GET request: ${sessionId}`);
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = this.transports[sessionId];
        await transport.handleRequest(req, res);
      } catch (error) {
        this.logger.error('Error handling GET request', error);
        res.status(500).send('Internal server error');
      }
    });

    // Handle DELETE requests for session termination
    this.app.delete('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !this.transports[sessionId]) {
          this.logger.warn(`Invalid session ID for DELETE request: ${sessionId}`);
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = this.transports[sessionId];
        await transport.handleRequest(req, res);
        
        // Clean up the session
        delete this.transports[sessionId];
        this.logger.info(`Session terminated: ${sessionId}`);
      } catch (error) {
        this.logger.error('Error handling DELETE request', error);
        res.status(500).send('Internal server error');
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Express error', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Start HTTP transport
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = createServer(this.app);
        
        this.httpServer.listen(this.port, this.host, () => {
          this.running = true;
          this.logger.info(`StreamableHTTP transport started on http://${this.host}:${this.port}`);
          this.logger.info('MCP server endpoints:');
          this.logger.info(`  Health check: http://${this.host}:${this.port}/health`);
          this.logger.info(`  MCP endpoint: http://${this.host}:${this.port}/mcp`);
          this.logger.info('Protocol: StreamableHTTP (2025-03-26)');
          resolve();
        });

        this.httpServer.on('error', (error: any) => {
          this.logger.error('HTTP server error', error);
          reject(error);
        });

      } catch (error) {
        this.logger.error('Failed to start HTTP transport', error);
        reject(error);
      }
    });
  }

  /**
   * Stop HTTP transport
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      this.logger.info('Stopping HTTP transport...');
      
      // Close all active MCP sessions first
      const sessionIds = Object.keys(this.transports);
      this.logger.debug(`Closing ${sessionIds.length} active sessions`);
      
      for (const sessionId of sessionIds) {
        try {
          const transport = this.transports[sessionId];
          if (transport && typeof transport.close === 'function') {
            transport.close();
          }
          delete this.transports[sessionId];
          this.logger.debug(`Session closed: ${sessionId}`);
        } catch (error) {
          this.logger.warn(`Error closing session ${sessionId}:`, error);
        }
      }
      
      // Force close all connections after a short delay
      const forceCloseTimeout = setTimeout(() => {
        this.logger.warn('Force closing HTTP server connections');
        this.httpServer.closeAllConnections?.();
      }, 1000);
      
      this.httpServer.close((error: any) => {
        clearTimeout(forceCloseTimeout);
        if (error) {
          this.logger.error('Error stopping HTTP server', error);
          reject(error);
        } else {
          this.running = false;
          this.logger.info('HTTP transport stopped');
          resolve();
        }
      });
      
      // Fallback: force close connections immediately if closeAllConnections is available
      if (this.httpServer.closeAllConnections) {
        setTimeout(() => {
          this.httpServer.closeAllConnections();
        }, 500);
      }
    });
  }

  /**
   * Check if transport is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
