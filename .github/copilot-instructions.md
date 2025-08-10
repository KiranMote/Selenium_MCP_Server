# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Model Context Protocol (MCP) server for Selenium WebDriver automation. The server provides a standardized interface for browser automation tasks.

## Key Technologies
- **TypeScript**: Main programming language
- **MCP SDK**: Model Context Protocol implementation
- **Selenium WebDriver**: Browser automation framework
- **Zod**: Runtime validation and schema definition

## Architecture Guidelines
- Use proper error handling and validation for all tool inputs
- Implement proper cleanup for browser sessions
- Follow MCP protocol standards for tool definitions
- Use TypeScript strict mode for type safety

## Code Patterns
- All tools should validate input using Zod schemas
- Browser operations should check if driver is initialized
- Error messages should be user-friendly and actionable
- Use async/await for all asynchronous operations

## Testing Guidelines
- Test browser operations with different selectors (CSS, XPath, ID)
- Verify proper error handling for invalid inputs
- Test cleanup scenarios and resource management

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt
