/**
 * Unified logging utility for SearXNG MCP server
 * Provides structured logging with configurable levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  private level: LogLevel;
  private useStderr: boolean;

  constructor(level: LogLevel = LogLevel.INFO, useStderr: boolean = false) {
    this.level = level;
    this.useStderr = useStderr;
  }

  error(message: string, meta?: any): void {
    if (this.level >= LogLevel.ERROR) {
      const output = `[ERROR] ${new Date().toISOString()} - ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
      process.stderr.write(output + '\n');
    }
  }

  warn(message: string, meta?: any): void {
    if (this.level >= LogLevel.WARN) {
      const output = `[WARN] ${new Date().toISOString()} - ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
      if (this.useStderr) {
        process.stderr.write(output + '\n');
      } else {
        console.warn(output);
      }
    }
  }

  info(message: string, meta?: any): void {
    if (this.level >= LogLevel.INFO) {
      const output = `[INFO] ${new Date().toISOString()} - ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
      if (this.useStderr) {
        process.stderr.write(output + '\n');
      } else {
        console.log(output);
      }
    }
  }

  debug(message: string, meta?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      const output = `[DEBUG] ${new Date().toISOString()} - ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
      if (this.useStderr) {
        process.stderr.write(output + '\n');
      } else {
        console.log(output);
      }
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/**
 * Create logger instance based on configuration
 */
export function createLogger(debug: boolean = false, transportType?: string): Logger {
  const level = debug ? LogLevel.DEBUG : LogLevel.INFO;
  const useStderr = transportType === 'stdio'; // Use stderr for stdio transport to avoid interfering with JSON-RPC
  return new ConsoleLogger(level, useStderr);
}
