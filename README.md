# Selenium MCP Server

## Quick Start: Install & Use in VS Code

### 1. Clone the Repository

```bash
git clone https://github.com/KiranMote/Selenium_MCP_Server.git
cd Selenium_MCP_Server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. (Optional) Test the Server

Add and run tests as needed.

### 5. Register the MCP Server in VS Code

#### Global Registration (Recommended)
1. Open (or create) the file:
   `C:\Users\<your-username>\AppData\Roaming\Code\User\mcp.json`
2. Add the following under `"servers"`:
   ```json
   "selenium-mcp-server": {
     "type": "stdio",
     "command": "node",
     "args": [
       "C:\\Users\\<your-username>\\Selenium_MCP_Server\\dist\\index.js"
     ]
   }
   ```
3. Save the file. Now, the server is available in all VS Code workspaces.

#### Workspace Registration (Alternative)
Add the same block to `.vscode/mcp.json` in your project folder.

### 6. Using the MCP Server

- Open the Command Palette in VS Code and use MCP features (requires MCP-compatible extensions).
- The server will be available for browser automation tasks.

---

A Model Context Protocol (MCP) server that provides browser automation capabilities using Selenium WebDriver. This server allows you to control web browsers programmatically through a standardized interface.

## Features

- **Multi-Browser Support**: Chrome, Firefox, and Edge browsers
- **Comprehensive Element Interaction**: Click, type, get text, wait for elements
- **Advanced Capabilities**: Screenshot capture, JavaScript execution, page navigation
- **Flexible Element Selection**: CSS selectors, XPath, ID, class name, and tag name
- **Robust Error Handling**: Proper validation and user-friendly error messages
- **TypeScript**: Full type safety and modern JavaScript features

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Running the Server

```bash
# Start the MCP server
npm start

# Or run in development mode
npm run dev
```

### Available Tools

#### Browser Management
- **start_browser**: Initialize a new browser session
- **close_browser**: Close the current browser session
- **navigate**: Navigate to a specific URL
- **get_current_url**: Get the current page URL
- **get_page_title**: Get the current page title

#### Element Interaction
- **click**: Click on an element
- **type_text**: Type text into input fields
- **get_text**: Extract text content from elements
- **wait_for_element**: Wait for elements to meet specific conditions

#### Advanced Features
- **take_screenshot**: Capture page screenshots
- **execute_script**: Run JavaScript code in the browser

### Example Usage

1. **Start a browser session**:
   ```json
   {
     "tool": "start_browser",
     "arguments": {
       "browser": "chrome",
       "headless": false,
       "windowSize": "1920x1080"
     }
   }
   ```

2. **Navigate to a website**:
   ```json
   {
     "tool": "navigate",
     "arguments": {
       "url": "https://example.com"
     }
   }
   ```

3. **Click an element**:
   ```json
   {
     "tool": "click",
     "arguments": {
       "selector": "#submit-button",
       "method": "css"
     }
   }
   ```

4. **Type text**:
   ```json
   {
     "tool": "type_text",
     "arguments": {
       "selector": "input[name='username']",
       "text": "user123",
       "method": "css"
     }
   }
   ```

## Configuration

### Browser Options
- **browser**: Choose from 'chrome', 'firefox', or 'edge'
- **headless**: Run browser without GUI (true/false)
- **windowSize**: Set browser window dimensions (e.g., "1920x1080")
- **userAgent**: Custom user agent string

### Element Selection Methods
- **css**: CSS selectors (default)
- **xpath**: XPath expressions
- **id**: Element ID
- **className**: CSS class name
- **tagName**: HTML tag name

### Wait Conditions
- **visible**: Element is visible on the page
- **present**: Element exists in the DOM
- **clickable**: Element is enabled and clickable

## Development

### Prerequisites
- Node.js 18+ 
- TypeScript
- Selenium WebDriver browser drivers

### Building
```bash
npm run build
```

### Running in Development
```bash
npm run dev
```

### Project Structure
```
src/
  index.ts          # Main server implementation
dist/               # Compiled JavaScript output
.vscode/
  mcp.json         # MCP server configuration
.github/
  copilot-instructions.md  # Copilot development guidelines
```

## Browser Driver Setup

Make sure you have the appropriate browser drivers installed:

- **Chrome**: ChromeDriver
- **Firefox**: GeckoDriver  
- **Edge**: EdgeDriver

Most drivers can be automatically managed by Selenium WebDriver 4+.

## Error Handling

The server includes comprehensive error handling:
- Input validation using Zod schemas
- Browser session state checking
- Timeout management for element operations
- Graceful cleanup on server shutdown

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Selenium WebDriver](https://selenium.dev/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
