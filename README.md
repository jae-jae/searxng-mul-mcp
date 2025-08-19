# SearXNG MCP Server

A Model Context Protocol (MCP) server for SearXNG metasearch engine integration, supporting multi-query parallel search with both stdio and HTTP transport protocols.

> 🌟 **Recommended**: [OllaMan](https://ollaman.com/) - Powerful Ollama AI Model Manager.

## Features

- ✅ **Multi-Query Parallel Search**: Execute multiple search queries simultaneously for improved efficiency
- ✅ **Dual Transport Support**: Compatible with both stdio and HTTP MCP transport protocols
- ✅ **SearXNG API Integration**: Direct integration with SearXNG REST API without browser automation
- ✅ **Basic Authentication**: Support for SearXNG servers with Basic Auth protection
- ✅ **Docker Deployment**: Complete containerization with Docker and Docker Compose
- ✅ **Environment Configuration**: Flexible configuration management through environment variables

## Quick Start

### NPM Usage

#### Stdio Mode (Default)

```bash
npx -y searxng-mul-mcp
```

#### HTTP Mode

```bash
npx -y searxng-mul-mcp --transport=http --host=0.0.0.0 --port=3000
```

### Environment Variables

```bash
# Required: SearXNG server URL
SEARXNG_URL=https://your.searxng.com

# Optional: Basic Auth credentials
USERNAME=your_username
PASSWORD=your_password

# Optional: Transport configuration (can also use CLI flags)
TRANSPORT=stdio|http
HOST=0.0.0.0        # HTTP mode only
PORT=3000           # HTTP mode only

# Optional: Debug mode
DEBUG=false
```

## Installation

### From Source

```bash
git clone <repository-url>
cd searxng-mul-mcp
npm install
npm run build
npm start
```

### Docker Deployment

Create a `docker-compose.yml` file:

```yaml
services:
  searxng-mul-mcp:
    image: ghcr.io/jae-jae/searxng-mul-mcp:latest
    environment:
      - SEARXNG_URL=https://your.searxng.com
      # Optional: Basic Auth
      # - USERNAME=your_username
      # - PASSWORD=your_password
    ports:
      - "3000:3000"
    environment:
      - TRANSPORT=http
      - HOST=0.0.0.0
      - PORT=3000
```

Run with:

```bash
docker-compose up -d
```

## MCP Tool Usage

The server provides a single `search` tool that accepts the following parameters:

### Search Tool

```json
{
  "name": "search",
  "arguments": {
    "queries": [
      "Brother printers review",
      "Brother printers features",
      "Brother printers types"
    ],
    "engines": ["google", "bing"],
    "categories": ["general"],
    "safesearch": 1,
    "language": "en"
  }
}
```

#### Parameters

- **queries** (required): Array of search query strings to execute in parallel
- **engines** (optional): Specific search engines to use (e.g., "google", "bing", "duckduckgo")
- **categories** (optional): Search categories to filter results (e.g., "general", "images", "news")
- **safesearch** (optional): Safe search level (0=off, 1=moderate, 2=strict)
- **language** (optional): Search language code (e.g., "en", "zh", "es")

#### Response Format

```json
{
  "searches": [
    {
      "query": "Brother printers review",
      "results": [
        {
          "title": "Best Brother Printers 2024 Review",
          "link": "https://example.com/review",
          "snippet": "Comprehensive review of Brother printers..."
        }
      ],
      "total_results": 150,
      "success": true
    }
  ],
  "summary": {
    "total_queries": 3,
    "successful_queries": 3,
    "failed_queries": 0
  }
}
```

## Configuration

### SearXNG Server Setup

This MCP server requires access to a SearXNG instance. You can:

1. Use a public SearXNG instance (like `https://your.searxng.com`)
2. Deploy your own SearXNG server
3. Use a private SearXNG instance with Basic Auth

### Basic Authentication

If your SearXNG server requires Basic Auth:

```bash
export USERNAME=your_username
export PASSWORD=your_password
```

### Transport Protocols

#### Stdio Transport

- Default mode for MCP client integration
- Uses standard input/output for communication
- Suitable for direct MCP client connections

#### HTTP Transport

- Provides StreamableHTTP JSON-RPC interface (protocol version 2025-03-26)
- Includes health check endpoint at `/health`
- MCP endpoint at `/mcp` for client communication
- Supports session management with automatic cleanup
- Full CORS support for cross-origin requests
- Suitable for web-based integrations and modern MCP clients

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- TypeScript

### Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Run in production
npm start

# Clean build directory
npm run clean

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
searxng-mul-mcp/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── server.ts               # MCP server core logic
│   ├── config/
│   │   └── index.ts            # Configuration management
│   ├── tools/
│   │   ├── index.ts            # Tool definitions
│   │   └── searxng.ts          # SearXNG search tool implementation
│   ├── transports/
│   │   ├── index.ts            # Transport factory
│   │   ├── stdio.ts            # Stdio transport implementation
│   │   ├── http.ts             # HTTP transport implementation
│   │   └── types.ts            # Transport type definitions
│   ├── services/
│   │   └── searxng-api.ts      # SearXNG API client
│   └── utils/
│       └── logger.ts           # Logging utilities
├── build/                      # TypeScript compilation output
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── Dockerfile                 # Docker image build
├── docker-compose.yml         # Docker Compose configuration
└── README.md                  # This file
```

## API Reference

### SearXNG API Integration

This server integrates with the SearXNG search API. For more information about SearXNG API capabilities, see: https://docs.searxng.org/dev/search_api.html

### Error Handling

The server implements comprehensive error handling:

- **Network errors**: Automatic retry mechanism (up to 3 attempts)
- **Authentication errors**: Clear error messages for auth failures
- **API rate limiting**: Graceful degradation and error reporting
- **Timeout handling**: Configurable request timeout (default: 30 seconds)

## Monitoring

### Health Checks

HTTP mode provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Logging

The server provides structured logging with configurable levels:

- **ERROR**: Critical errors and failures
- **WARN**: Warning messages and degraded functionality
- **INFO**: General operational information
- **DEBUG**: Detailed debugging information (enable with `DEBUG=true`)

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check your `SEARXNG_URL` and network connectivity
2. **Authentication Error**: Verify `USERNAME` and `PASSWORD` for Basic Auth
3. **Port Already in Use**: Change the `PORT` environment variable for HTTP mode
4. **Search Timeout**: Increase timeout or check SearXNG server performance

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
DEBUG=true npx searxng-mul-mcp
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review SearXNG documentation
3. Open an issue on GitHub
