#!/usr/bin/env node

// Simple test to verify the MCP server can start
import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.join(process.cwd(), 'dist', 'index.js');

console.log('Testing Selenium MCP Server...');
console.log(`Server path: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a basic MCP message to test the server
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server error output:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Send the initialization message
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Close after a short delay
setTimeout(() => {
  server.kill();
  console.log('Test completed');
}, 2000);
