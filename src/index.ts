#!/usr/bin/env node

/**
 * SearXNG MCP Server Entry Point
 * Supports both stdio and HTTP transport protocols
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig, validateConfig } from './config/index.js';
import { SearXNGMCPServer } from './server.js';
import { DefaultTransportFactory } from './transports/index.js';
import { createLogger, Logger, LogLevel } from './utils/logger.js';

/**
 * Command line interface definition
 */
const argv = yargs(hideBin(process.argv))
  .option('transport', {
    type: 'string',
    choices: ['stdio', 'http'],
    default: 'stdio',
    description: 'Transport protocol to use',
  })
  .option('host', {
    type: 'string',
    default: '0.0.0.0',
    description: 'Host to bind HTTP server (only for HTTP transport)',
  })
  .option('port', {
    type: 'number',
    default: 3000,
    description: 'Port to bind HTTP server (only for HTTP transport)',
  })
  .option('debug', {
    type: 'boolean',
    default: false,
    description: 'Enable debug logging',
  })
  .help()
  .alias('help', 'h')
  .parseSync();

/**
 * Main application entry point
 */
async function main() {
  // Create logger
  const logger = createLogger(argv.debug, argv.transport);
  
  try {
    
    logger.info('Starting SearXNG MCP Server...');
    logger.info(`Transport: ${argv.transport}`);
    
    // Load and validate configuration
    const config = loadConfig();
    
    // Override transport settings from command line
    config.transport.type = argv.transport as 'stdio' | 'http';
    if (argv.transport === 'http') {
      config.transport.host = argv.host;
      config.transport.port = argv.port;
    }
    
    // Override debug setting from command line
    config.debug = argv.debug;
    
    validateConfig(config);
    
    logger.info('Configuration loaded successfully');
    logger.debug('Configuration:', config);
    
    // Create MCP server
    const mcpServer = new SearXNGMCPServer(config, logger);
    
    // Test SearXNG connection
    logger.info('Testing SearXNG connection...');
    const connectionOk = await mcpServer.testConnection();
    
    if (!connectionOk) {
      logger.warn('SearXNG connection test failed, but continuing anyway');
      logger.warn('Please check your SEARXNG_URL and authentication settings');
    }
    
    // Create and start transport
    const transportFactory = new DefaultTransportFactory(logger);
    const transport = transportFactory.create(mcpServer.getServer(), config.transport);
    
    // Setup graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      try {
        await transport.stop();
        logger.info('Server stopped gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Start transport
    await transport.start();
    
    // Keep process alive for stdio transport
    if (config.transport.type === 'stdio') {
      // For stdio, we need to keep the process alive
      process.stdin.resume();
    }
    
  } catch (error) {
    // Display the error message clearly to the user
    if (error instanceof Error) {
      console.error('\n' + error.message + '\n');
      logger.error('Failed to start server:', error.message);
    } else {
      console.error('\n❌ Unknown error occurred:', error, '\n');
      logger.error('Failed to start server', error);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  process.stderr.write(`Unhandled Rejection at: ${promise}, reason: ${reason}\n`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  process.stderr.write(`Uncaught Exception: ${error}\n`);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  if (error instanceof Error) {
    console.error('\n' + error.message + '\n');
  } else {
    console.error('\n❌ Application startup failed:', error, '\n');
  }
  process.exit(1);
});
