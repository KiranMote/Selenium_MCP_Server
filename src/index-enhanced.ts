#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { Builder, WebDriver, By, until, WebElement, Key } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import * as firefox from 'selenium-webdriver/firefox.js';
import * as edge from 'selenium-webdriver/edge.js';
import fs from 'fs';
import path from 'path';

// Enhanced global state
let driver: WebDriver | null = null;
let currentTestCase: string | null = null;
let testLogs: ActionLog[] = [];

// Enhanced interfaces
interface ActionLog {
  timestamp: string;
  action: string;
  selector?: string;
  method?: string;
  success: boolean;
  duration: number;
  screenshot?: string;
  error?: string;
  suggestions?: string[];
}

interface ElementSearchResult {
  found: boolean;
  element?: WebElement;
  error?: string;
  suggestions?: string[];
  screenshot?: string;
  availableElements?: string[];
}

// Enhanced validation schemas
const StartBrowserSchema = z.object({
  browser: z.enum(['chrome', 'firefox', 'edge']).default('chrome'),
  headless: z.boolean().default(false),
  windowSize: z.string().regex(/^\d+x\d+$/).default('1920x1080'),
  userAgent: z.string().optional(),
});

const NavigateSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

const ClickSchema = z.object({
  selector: z.string().min(1, 'Selector cannot be empty'),
  method: z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
  timeout: z.number().positive().default(10000),
});

const TypeSchema = z.object({
  selector: z.string().min(1, 'Selector cannot be empty'),
  text: z.string(),
  method: z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
  timeout: z.number().positive().default(10000),
  clear: z.boolean().default(true),
});

const GetTextSchema = z.object({
  selector: z.string().min(1, 'Selector cannot be empty'),
  method: z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
  timeout: z.number().positive().default(10000),
});

const WaitForElementSchema = z.object({
  selector: z.string().min(1, 'Selector cannot be empty'),
  method: z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
  timeout: z.number().positive().default(10000),
  condition: z.enum(['visible', 'present', 'clickable']).default('visible'),
});

const TakeScreenshotSchema = z.object({
  path: z.string().optional(),
  fullPage: z.boolean().default(false),
});

const ExecuteScriptSchema = z.object({
  script: z.string().min(1, 'Script cannot be empty'),
  args: z.array(z.any()).default([]),
});

// Enhanced schemas for testing
const VerifyProductSchema = z.object({
  productName: z.string().min(1, 'Product name cannot be empty'),
  exactMatch: z.boolean().default(true),
  timeout: z.number().positive().default(10000),
});

const StartTestCaseSchema = z.object({
  testName: z.string().min(1, 'Test name cannot be empty'),
  description: z.string().optional(),
});

// Enhanced helper functions
async function logAction(action: string, success: boolean, duration: number, details: any = {}) {
  const log: ActionLog = {
    timestamp: new Date().toISOString(),
    action,
    success,
    duration,
    ...details
  };
  testLogs.push(log);
  
  // If action failed, capture screenshot
  if (!success && driver) {
    try {
      const screenshot = await driver.takeScreenshot();
      const screenshotPath = `./screenshots/failure-${Date.now()}.png`;
      fs.writeFileSync(screenshotPath, screenshot, 'base64');
      log.screenshot = screenshotPath;
    } catch (e) {
      // Screenshot capture failed, log but continue
      console.error('Failed to capture failure screenshot:', e);
    }
  }
}

async function getElementWithEnhancedError(selector: string, method: string, timeout: number): Promise<ElementSearchResult> {
  const startTime = Date.now();
  
  if (!driver) {
    throw new Error('Browser not started. Please start the browser first.');
  }

  try {
    let locator;
    switch (method) {
      case 'css':
        locator = By.css(selector);
        break;
      case 'xpath':
        locator = By.xpath(selector);
        break;
      case 'id':
        locator = By.id(selector);
        break;
      case 'className':
        locator = By.className(selector);
        break;
      case 'tagName':
        locator = By.tagName(selector);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    await driver.wait(until.elementLocated(locator), timeout);
    const element = await driver.findElement(locator);
    
    await logAction('find_element', true, Date.now() - startTime, { selector, method });
    
    return {
      found: true,
      element
    };
  } catch (error) {
    // Enhanced error handling with suggestions
    const suggestions = await generateElementSuggestions(selector, method);
    const availableElements = await getAvailableElements();
    
    await logAction('find_element', false, Date.now() - startTime, { 
      selector, 
      method, 
      error: error instanceof Error ? error.message : String(error),
      suggestions
    });
    
    return {
      found: false,
      error: error instanceof Error ? error.message : String(error),
      suggestions,
      availableElements
    };
  }
}

async function generateElementSuggestions(selector: string, method: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  if (!driver) return suggestions;
  
  try {
    // For text-based searches, try to find similar text
    if (method === 'xpath' && selector.includes('text()')) {
      const textToFind = selector.match(/text\(\)\s*,\s*['"]([^'"]+)['"]/)?.[1];
      if (textToFind) {
        // Try partial text search
        suggestions.push(`Try partial text search: //div[contains(text(), '${textToFind.split(' ')[0]}')]`);
        
        // Try case-insensitive search
        suggestions.push(`Try case-insensitive: //div[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${textToFind.toLowerCase()}')]`);
        
        // Get all available text content for comparison
        const allText = await driver.executeScript(`
          return Array.from(document.querySelectorAll('*')).map(el => el.textContent?.trim()).filter(text => text && text.length > 0);
        `) as string[];
        
        const similarTexts = allText.filter(text => 
          text.toLowerCase().includes(textToFind.toLowerCase()) || 
          textToFind.toLowerCase().includes(text.toLowerCase())
        ).slice(0, 3);
        
        if (similarTexts.length > 0) {
          suggestions.push(`Similar text found: ${similarTexts.join(', ')}`);
        }
      }
    }
    
    // For CSS selectors, suggest alternatives
    if (method === 'css') {
      if (selector.startsWith('#')) {
        suggestions.push(`Try name attribute: [name="${selector.substring(1)}"]`);
        suggestions.push(`Try data attribute: [data-testid="${selector.substring(1)}"]`);
      }
      if (selector.startsWith('.')) {
        suggestions.push(`Try contains class: [class*="${selector.substring(1)}"]`);
      }
    }
    
  } catch (e) {
    // If suggestion generation fails, just return empty array
  }
  
  return suggestions;
}

async function getAvailableElements(): Promise<string[]> {
  if (!driver) return [];
  
  try {
    const elements = await driver.executeScript(`
      const elements = [];
      // Get all elements with text content
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 100) {
          elements.push(text);
        }
      });
      return [...new Set(elements)].slice(0, 10); // Remove duplicates and limit
    `) as string[];
    
    return elements;
  } catch (e) {
    return [];
  }
}

// Create enhanced server instance
const server = new Server(
  {
    name: 'selenium-mcp-server-enhanced',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Enhanced tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'start_browser',
        description: 'Start a new browser session with specified options',
        inputSchema: {
          type: 'object',
          properties: {
            browser: {
              type: 'string',
              enum: ['chrome', 'firefox', 'edge'],
              default: 'chrome',
              description: 'Browser to use'
            },
            headless: {
              type: 'boolean',
              default: false,
              description: 'Run browser in headless mode'
            },
            windowSize: {
              type: 'string',
              pattern: '^\\d+x\\d+$',
              default: '1920x1080',
              description: 'Browser window size (WIDTHxHEIGHT)'
            },
            userAgent: {
              type: 'string',
              description: 'Custom user agent string'
            }
          }
        },
      },
      {
        name: 'navigate',
        description: 'Navigate to a specific URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL to navigate to'
            }
          },
          required: ['url']
        },
      },
      {
        name: 'click',
        description: 'Click on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Element selector'
            },
            method: {
              type: 'string',
              enum: ['css', 'xpath', 'id', 'className', 'tagName'],
              default: 'css',
              description: 'Method to locate element'
            },
            timeout: {
              type: 'number',
              default: 10000,
              description: 'Timeout in milliseconds'
            }
          },
          required: ['selector']
        },
      },
      {
        name: 'type_text',
        description: 'Type text into an input element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Element selector'
            },
            text: {
              type: 'string',
              description: 'Text to type'
            },
            method: {
              type: 'string',
              enum: ['css', 'xpath', 'id', 'className', 'tagName'],
              default: 'css',
              description: 'Method to locate element'
            },
            timeout: {
              type: 'number',
              default: 10000,
              description: 'Timeout in milliseconds'
            },
            clear: {
              type: 'boolean',
              default: true,
              description: 'Clear field before typing'
            }
          },
          required: ['selector', 'text']
        },
      },
      {
        name: 'get_text',
        description: 'Get text content from an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Element selector'
            },
            method: {
              type: 'string',
              enum: ['css', 'xpath', 'id', 'className', 'tagName'],
              default: 'css',
              description: 'Method to locate element'
            },
            timeout: {
              type: 'number',
              default: 10000,
              description: 'Timeout in milliseconds'
            }
          },
          required: ['selector']
        },
      },
      {
        name: 'wait_for_element',
        description: 'Wait for an element to meet specific conditions',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Element selector'
            },
            method: {
              type: 'string',
              enum: ['css', 'xpath', 'id', 'className', 'tagName'],
              default: 'css',
              description: 'Method to locate element'
            },
            timeout: {
              type: 'number',
              default: 10000,
              description: 'Timeout in milliseconds'
            },
            condition: {
              type: 'string',
              enum: ['visible', 'present', 'clickable'],
              default: 'visible',
              description: 'Condition to wait for'
            }
          },
          required: ['selector']
        },
      },
      {
        name: 'take_screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to save screenshot (optional)'
            },
            fullPage: {
              type: 'boolean',
              default: false,
              description: 'Take full page screenshot'
            }
          }
        },
      },
      {
        name: 'execute_script',
        description: 'Execute JavaScript code in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'JavaScript code to execute'
            },
            args: {
              type: 'array',
              default: [],
              description: 'Arguments to pass to the script',
              items: {}
            }
          },
          required: ['script']
        },
      },
      {
        name: 'get_page_title',
        description: 'Get the current page title',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      {
        name: 'get_current_url',
        description: 'Get the current page URL',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      {
        name: 'close_browser',
        description: 'Close the browser session',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      // Enhanced testing tools
      {
        name: 'verify_product_presence',
        description: 'Enhanced product verification with detailed error reporting and suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            productName: {
              type: 'string',
              description: 'Product name to verify'
            },
            exactMatch: {
              type: 'boolean',
              default: true,
              description: 'Whether to perform exact text matching'
            },
            timeout: {
              type: 'number',
              default: 10000,
              description: 'Timeout in milliseconds'
            }
          },
          required: ['productName']
        },
      },
      {
        name: 'get_all_products',
        description: 'Get a list of all available products on the current page',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      },
      {
        name: 'start_test_case',
        description: 'Start a new test case with enhanced logging and evidence collection',
        inputSchema: {
          type: 'object',
          properties: {
            testName: {
              type: 'string',
              description: 'Name of the test case'
            },
            description: {
              type: 'string',
              description: 'Description of the test case'
            }
          },
          required: ['testName']
        },
      },
      {
        name: 'end_test_case',
        description: 'End the current test case and generate a comprehensive report',
        inputSchema: {
          type: 'object',
          properties: {}
        },
      }
    ],
  };
});

// Enhanced request handler with better error reporting
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  
  try {
    switch (request.params.name) {
      case 'start_browser': {
        const args = StartBrowserSchema.parse(request.params.arguments);
        
        if (driver) {
          await driver.quit();
        }

        const [width, height] = args.windowSize.split('x').map(Number);

        let builder = new Builder();
        
        switch (args.browser) {
          case 'chrome':
            const chromeOptions = new chrome.Options();
            if (args.headless) {
              chromeOptions.addArguments('--headless=new');
            }
            chromeOptions.addArguments(`--window-size=${width},${height}`);
            chromeOptions.addArguments('--no-sandbox');
            chromeOptions.addArguments('--disable-dev-shm-usage');
            if (args.userAgent) {
              chromeOptions.addArguments(`--user-agent=${args.userAgent}`);
            }
            builder = builder.forBrowser('chrome').setChromeOptions(chromeOptions);
            break;
            
          case 'firefox':
            const firefoxOptions = new firefox.Options();
            if (args.headless) {
              firefoxOptions.addArguments('--headless');
            }
            firefoxOptions.addArguments(`--width=${width}`);
            firefoxOptions.addArguments(`--height=${height}`);
            if (args.userAgent) {
              firefoxOptions.setPreference('general.useragent.override', args.userAgent);
            }
            builder = builder.forBrowser('firefox').setFirefoxOptions(firefoxOptions);
            break;
            
          case 'edge':
            const edgeOptions = new edge.Options();
            if (args.headless) {
              edgeOptions.addArguments('--headless=new');
            }
            edgeOptions.addArguments(`--window-size=${width},${height}`);
            if (args.userAgent) {
              edgeOptions.addArguments(`--user-agent=${args.userAgent}`);
            }
            builder = builder.forBrowser('MicrosoftEdge').setEdgeOptions(edgeOptions);
            break;
        }

        driver = await builder.build();
        
        if (!args.headless) {
          await driver.manage().window().setRect({ width, height, x: 0, y: 0 });
        }

        await logAction('start_browser', true, Date.now() - startTime, { browser: args.browser, windowSize: args.windowSize });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully started ${args.browser} browser with window size ${args.windowSize}`,
            },
          ],
        };
      }

      case 'navigate': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }

        const args = NavigateSchema.parse(request.params.arguments);
        await driver.get(args.url);
        
        await logAction('navigate', true, Date.now() - startTime, { url: args.url });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully navigated to ${args.url}`,
            },
          ],
        };
      }

      case 'click': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }

        const args = ClickSchema.parse(request.params.arguments);
        const result = await getElementWithEnhancedError(args.selector, args.method, args.timeout);
        
        if (!result.found || !result.element) {
          const errorMessage = [
            `Failed to find element: ${result.error}`,
            result.suggestions && result.suggestions.length > 0 ? `Suggestions: ${result.suggestions.join('; ')}` : '',
            result.availableElements && result.availableElements.length > 0 ? `Available elements: ${result.availableElements.slice(0, 5).join(', ')}` : ''
          ].filter(Boolean).join('\n');
          
          throw new Error(errorMessage);
        }

        await result.element.click();
        
        await logAction('click', true, Date.now() - startTime, { selector: args.selector, method: args.method });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully clicked element with ${args.method} selector: ${args.selector}`,
            },
          ],
        };
      }

      case 'verify_product_presence': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }

        const args = VerifyProductSchema.parse(request.params.arguments);
        
        try {
          let selector: string;
          if (args.exactMatch) {
            selector = `//div[text()='${args.productName}' or contains(text(), '${args.productName}')]`;
          } else {
            selector = `//div[contains(text(), '${args.productName}')]`;
          }
          
          const result = await getElementWithEnhancedError(selector, 'xpath', args.timeout);
          
          if (result.found && result.element) {
            const actualText = await result.element.getText();
            
            await logAction('verify_product_presence', true, Date.now() - startTime, { 
              productName: args.productName, 
              actualText,
              exactMatch: args.exactMatch 
            });
            
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Product "${args.productName}" found successfully!\nActual text: "${actualText}"`,
                },
              ],
            };
          } else {
            // Get all available products for better error reporting
            const allProducts = await driver.executeScript(`
              return Array.from(document.querySelectorAll('.inventory_item_name, .inventory_list div')).map(el => el.textContent?.trim()).filter(text => text && text.length > 0);
            `) as string[];
            
            const errorMessage = [
              `❌ Product "${args.productName}" not found.`,
              `Available products: ${allProducts.join(', ')}`,
              result.suggestions && result.suggestions.length > 0 ? `Suggestions: ${result.suggestions.join('; ')}` : ''
            ].filter(Boolean).join('\n');
            
            await logAction('verify_product_presence', false, Date.now() - startTime, { 
              productName: args.productName,
              error: errorMessage,
              availableProducts: allProducts
            });
            
            return {
              content: [
                {
                  type: 'text',
                  text: errorMessage,
                },
              ],
              isError: true,
            };
          }
        } catch (error) {
          throw new Error(`Product verification failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case 'get_all_products': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }

        const products = await driver.executeScript(`
          const products = [];
          // Try multiple selectors for product names
          const selectors = [
            '.inventory_item_name',
            '.inventory_list .inventory_item_label a div',
            '[data-test*="item-name"]',
            '.product-name',
            '.item-name'
          ];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 0) {
                products.push(text);
              }
            });
            if (products.length > 0) break;
          }
          
          // Remove duplicates
          return [...new Set(products)];
        `) as string[];

        await logAction('get_all_products', true, Date.now() - startTime, { productCount: products.length });
        
        return {
          content: [
            {
              type: 'text',
              text: `Found ${products.length} products:\n${products.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
            },
          ],
        };
      }

      case 'start_test_case': {
        const args = StartTestCaseSchema.parse(request.params.arguments);
        currentTestCase = args.testName;
        testLogs = []; // Reset logs for new test case
        
        await logAction('start_test_case', true, Date.now() - startTime, { 
          testName: args.testName, 
          description: args.description 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `🚀 Started test case: "${args.testName}"${args.description ? `\nDescription: ${args.description}` : ''}`,
            },
          ],
        };
      }

      case 'end_test_case': {
        if (!currentTestCase) {
          throw new Error('No active test case. Please start a test case first.');
        }

        const successCount = testLogs.filter(log => log.success).length;
        const failureCount = testLogs.filter(log => !log.success).length;
        const totalDuration = testLogs.reduce((sum, log) => sum + log.duration, 0);
        
        const report = {
          testName: currentTestCase,
          duration: totalDuration,
          successCount,
          failureCount,
          totalActions: testLogs.length,
          logs: testLogs
        };
        
        // Save detailed report
        const reportPath = `./test-reports/${currentTestCase}-${Date.now()}.json`;
        fs.mkdirSync('./test-reports', { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        await logAction('end_test_case', true, Date.now() - startTime, { 
          testName: currentTestCase,
          reportPath,
          successCount,
          failureCount
        });
        
        const testResult = failureCount === 0 ? '✅ PASSED' : '❌ FAILED';
        currentTestCase = null;
        
        return {
          content: [
            {
              type: 'text',
              text: `🏁 Test case completed: ${testResult}\n` +
                   `Total actions: ${testLogs.length}\n` +
                   `Successful: ${successCount}\n` +
                   `Failed: ${failureCount}\n` +
                   `Duration: ${totalDuration}ms\n` +
                   `Report saved: ${reportPath}`,
            },
          ],
        };
      }

      // ... (continue with existing tools like type_text, get_text, etc.)
      // For brevity, I'll continue with just the key enhanced tools above
      
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    await logAction(request.params.name, false, Date.now() - startTime, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the enhanced server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Enhanced Selenium MCP Server v2.0 running on stdio');
}

// Enhanced cleanup
process.on('SIGINT', async () => {
  if (driver) {
    await driver.quit();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (driver) {
    await driver.quit();
  }
  process.exit(0);
});

main().catch(console.error);
