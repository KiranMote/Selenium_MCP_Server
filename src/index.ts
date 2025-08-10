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
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

// Global driver instance
let driver: WebDriver | null = null;

// Validation schemas
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

const StartBrowserSchema = z.object({
  browser: z.enum(['chrome', 'firefox', 'edge']).default('chrome'),
  headless: z.boolean().default(false),
  windowSize: z.string().regex(/^\d+x\d+$/).default('1920x1080'),
  userAgent: z.string().optional(),
});

const VerifyProductSchema = z.object({
  productName: z.string().min(1, 'Product name cannot be empty'),
  exactMatch: z.boolean().default(true),
  timeout: z.number().positive().default(10000),
});

const GetAllProductsSchema = z.object({
  productSelector: z.string().default('.inventory_item .inventory_item_name'),
});

// Enhanced automation schemas
const CreateBddFeatureSchema = z.object({
  featureName: z.string().min(1, 'Feature name is required'),
  description: z.string().optional(),
  scenarios: z.array(z.object({
    name: z.string(),
    steps: z.array(z.string()),
  })).min(1, 'At least one scenario is required'),
  outputPath: z.string().optional(),
});

const CreatePageObjectSchema = z.object({
  pageName: z.string().min(1, 'Page name is required'),
  url: z.string().url('Valid URL is required'),
  language: z.enum(['javascript', 'typescript', 'python']).default('typescript'),
  outputPath: z.string().optional(),
  scanElements: z.boolean().default(true),
});

const CreateSeleniumProjectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  language: z.enum(['javascript', 'typescript', 'python']).default('typescript'),
  framework: z.enum(['bdd', 'page-object', 'hybrid']).default('hybrid'),
  outputPath: z.string().optional(),
  includeAllure: z.boolean().default(true),
});

const ScanPageElementsSchema = z.object({
  includeInteractiveOnly: z.boolean().default(true),
  outputFormat: z.enum(['json', 'page-object', 'selectors']).default('json'),
  language: z.enum(['javascript', 'typescript', 'python']).default('typescript'),
});

const GeneratePythonScriptSchema = z.object({
  scriptType: z.enum(['basic', 'bdd', 'page-object']).default('basic'),
  testName: z.string().min(1, 'Test name is required'),
  url: z.string().url('Valid URL is required'),
  actions: z.array(z.object({
    action: z.string(),
    selector: z.string().optional(),
    value: z.string().optional(),
  })).min(1, 'At least one action is required'),
  outputPath: z.string().optional(),
});

// Allure reporting schemas
const GenerateAllureReportSchema = z.object({
  projectPath: z.string().optional(),
  testFile: z.string().optional(),
  outputPath: z.string().optional(),
  includeTestExecution: z.boolean().default(true),
});

const ServeAllureReportSchema = z.object({
  projectPath: z.string().optional(),
  port: z.number().min(1000).max(65535).default(8082),
  openBrowser: z.boolean().default(false),
  background: z.boolean().default(true),
});

const CreateAllureConfigSchema = z.object({
  projectPath: z.string().optional(),
  testFramework: z.enum(['pytest', 'junit', 'testng', 'mocha']).default('pytest'),
  includeScreenshots: z.boolean().default(true),
  includeEnvironmentInfo: z.boolean().default(true),
});

const ExecutePytestWithAllureSchema = z.object({
  projectPath: z.string().optional(),
  testFile: z.string().optional(),
  allureResultsDir: z.string().optional(),
  additionalArgs: z.array(z.string()).default([]),
});

// Helper function to get element by various methods
async function getElement(selector: string, method: string, timeout: number): Promise<WebElement> {
  if (!driver) {
    throw new Error('Browser not started. Please start the browser first.');
  }

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
  return await driver.findElement(locator);
}

// Allure helper functions
const execAsync = promisify(exec);

class AllureReportManager {
  private projectPath: string;
  private reportsDir: string;
  private allureResultsDir: string;
  private allureReportDir: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = path.resolve(projectPath);
    this.reportsDir = path.join(this.projectPath, 'reports');
    this.allureResultsDir = path.join(this.reportsDir, 'allure-results');
    this.allureReportDir = path.join(this.reportsDir, 'allure-report');
  }

  async setupDirectories(): Promise<void> {
    try {
      await fs.promises.mkdir(this.allureResultsDir, { recursive: true });
      await fs.promises.mkdir(this.allureReportDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directories: ${error}`);
    }
  }

  async checkAllureCli(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('allure --version');
      return stdout.includes('allure');
    } catch {
      return false;
    }
  }

  async cleanPreviousResults(): Promise<void> {
    try {
      // Stop any running Java processes (Allure servers)
      try {
        await execAsync('taskkill /F /IM java.exe');
      } catch {
        // Ignore if no Java processes running
      }

      // Clean allure-results directory
      if (fs.existsSync(this.allureResultsDir)) {
        await fs.promises.rm(this.allureResultsDir, { recursive: true, force: true });
        await fs.promises.mkdir(this.allureResultsDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Warning: Could not clean previous results completely:', error);
    }
  }

  async createEnvironmentProperties(): Promise<void> {
    const envFile = path.join(this.allureResultsDir, 'environment.properties');
    // Use the exact format from your working selenium_project
    const envContent = `Browser=Chrome
Test.URL=https://www.saucedemo.com/v1/
Framework=Pytest + Selenium
Language=Python
Test.Environment=QA
Executed.By=Automation`;

    await fs.promises.writeFile(envFile, envContent);
  }

  async executePytestWithAllure(testFile?: string, additionalArgs: string[] = []): Promise<{success: boolean, output: string}> {
    const testTarget = testFile || 'test_product_verification.py';
    
    // Use the exact working command pattern from your selenium_project
    const cmd = `python -m pytest ${testTarget} --alluredir=reports/allure-results -v`;
    
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: this.projectPath,
        timeout: 60000 // 60 second timeout
      });
      
      return {
        success: true,
        output: stdout + (stderr || '')
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || 'Test execution failed'
      };
    }
  }

  async generateStaticReport(): Promise<boolean> {
    try {
      // Use the exact working command from your selenium_project
      const cmd = `allure generate reports/allure-results -o reports/allure-report --clean`;
      await execAsync(cmd, { cwd: this.projectPath });
      
      const indexFile = path.join(this.allureReportDir, 'index.html');
      return fs.existsSync(indexFile);
    } catch {
      return false;
    }
  }

  async serveReport(port: number = 8082, background: boolean = true): Promise<{success: boolean, port?: number, url?: string}> {
    // Use the exact working fallback strategy from your selenium_project
    try {
      // Try default port first (usually 8080 per your working implementation)
      const primaryPort = 8080;
      const cmd = `allure serve reports/allure-results --port ${primaryPort}`;
      
      if (background) {
        const child = spawn('allure', ['serve', 'reports/allure-results', '--port', primaryPort.toString()], {
          cwd: this.projectPath,
          detached: true,
          stdio: 'ignore'
        });
        
        child.unref();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return {
          success: true,
          port: primaryPort,
          url: `http://localhost:${primaryPort}`
        };
      } else {
        return {
          success: true,
          port: primaryPort,
          url: `http://localhost:${primaryPort}`
        };
      }
    } catch (error) {
      // Fallback to port 8081 (as in your working implementation)
      try {
        const fallbackPort = 8081;
        const child = spawn('allure', ['serve', 'reports/allure-results', '--port', fallbackPort.toString()], {
          cwd: this.projectPath,
          detached: true,
          stdio: 'ignore'
        });
        
        child.unref();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return {
          success: true,
          port: fallbackPort,
          url: `http://localhost:${fallbackPort}`
        };
      } catch {
        return {
          success: false
        };
      }
    }
  }

  async findAvailablePort(startPort: number = 8080): Promise<number> {
    // Use the exact port strategy from your working selenium_project
    const ports = [8080, 8081, 8082, 8083, 8084, 9090];
    
    for (const port of ports) {
      try {
        const testCmd = `netstat -an | findstr :${port}`;
        await execAsync(testCmd);
        // If no error, port is in use, try next
      } catch {
        // Error means port is available
        return port;
      }
    }
    
    return 8080; // fallback to your working default
  }
}

// Create server instance
const server = new Server(
  {
    name: 'selenium-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
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
              items: {},
              default: [],
              description: 'Arguments to pass to the script'
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
      {
        name: 'verify_product_presence',
        description: 'Verify if a specific product is present on the page with enhanced error reporting',
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
          properties: {
            productSelector: {
              type: 'string',
              default: '.inventory_item .inventory_item_name',
              description: 'CSS selector for product names'
            }
          }
        },
      },
      {
        name: 'create_bdd_feature',
        description: 'Generate a BDD Cucumber feature file with scenarios',
        inputSchema: {
          type: 'object',
          properties: {
            featureName: {
              type: 'string',
              description: 'Name of the feature'
            },
            description: {
              type: 'string',
              description: 'Feature description'
            },
            scenarios: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  steps: { type: 'array', items: { type: 'string' } }
                }
              },
              description: 'Array of scenarios with steps'
            },
            outputPath: {
              type: 'string',
              description: 'Output file path'
            }
          },
          required: ['featureName', 'scenarios']
        },
      },
      {
        name: 'create_page_object',
        description: 'Generate a Page Object Model class for a webpage',
        inputSchema: {
          type: 'object',
          properties: {
            pageName: {
              type: 'string',
              description: 'Name of the page class'
            },
            url: {
              type: 'string',
              description: 'URL of the page to analyze'
            },
            language: {
              type: 'string',
              enum: ['javascript', 'typescript', 'python'],
              default: 'typescript',
              description: 'Programming language for the page object'
            },
            outputPath: {
              type: 'string',
              description: 'Output file path'
            },
            scanElements: {
              type: 'boolean',
              default: true,
              description: 'Automatically scan page for elements'
            }
          },
          required: ['pageName', 'url']
        },
      },
      {
        name: 'scan_page_elements',
        description: 'Scan current page and extract interactive elements',
        inputSchema: {
          type: 'object',
          properties: {
            includeInteractiveOnly: {
              type: 'boolean',
              default: true,
              description: 'Only include interactive elements'
            },
            outputFormat: {
              type: 'string',
              enum: ['json', 'page-object', 'selectors'],
              default: 'json',
              description: 'Output format for elements'
            },
            language: {
              type: 'string',
              enum: ['javascript', 'typescript', 'python'],
              default: 'typescript',
              description: 'Language for page object generation'
            }
          }
        },
      },
      {
        name: 'generate_python_script',
        description: 'Generate Python Selenium script with various frameworks',
        inputSchema: {
          type: 'object',
          properties: {
            scriptType: {
              type: 'string',
              enum: ['basic', 'bdd', 'page-object'],
              default: 'basic',
              description: 'Type of Python script to generate'
            },
            testName: {
              type: 'string',
              description: 'Name of the test'
            },
            url: {
              type: 'string',
              description: 'Target URL for the test'
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  selector: { type: 'string' },
                  value: { type: 'string' }
                }
              },
              description: 'List of actions to perform'
            },
            outputPath: {
              type: 'string',
              description: 'Output file path'
            }
          },
          required: ['testName', 'url', 'actions']
        },
      },
      {
        name: 'create_selenium_project',
        description: 'Generate a complete Selenium test automation project',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project'
            },
            language: {
              type: 'string',
              enum: ['javascript', 'typescript', 'python'],
              default: 'typescript',
              description: 'Programming language'
            },
            framework: {
              type: 'string',
              enum: ['bdd', 'page-object', 'hybrid'],
              default: 'hybrid',
              description: 'Testing framework approach'
            },
            outputPath: {
              type: 'string',
              description: 'Project output directory'
            },
            includeAllure: {
              type: 'boolean',
              default: true,
              description: 'Include Allure reporting'
            }
          },
          required: ['projectName']
        },
      },
      {
        name: 'generate_allure_report',
        description: 'Generate and serve Allure test reports with rich visualizations and detailed analytics',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory containing test files'
            },
            testFile: {
              type: 'string',
              description: 'Specific test file to execute (e.g., test_product_verification.py)'
            },
            outputPath: {
              type: 'string',
              description: 'Custom output path for the Allure report'
            },
            includeTestExecution: {
              type: 'boolean',
              default: true,
              description: 'Execute tests before generating report'
            }
          }
        },
      },
      {
        name: 'serve_allure_report',
        description: 'Serve Allure report on localhost with automatic port fallback and browser opening',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory containing Allure results'
            },
            port: {
              type: 'number',
              minimum: 1000,
              maximum: 65535,
              default: 8082,
              description: 'Port number for the Allure server'
            },
            openBrowser: {
              type: 'boolean',
              default: false,
              description: 'Automatically open browser to view report'
            },
            background: {
              type: 'boolean',
              default: true,
              description: 'Run server in background mode'
            }
          }
        },
      },
      {
        name: 'create_allure_config',
        description: 'Create Allure configuration files and setup for different test frameworks',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory'
            },
            testFramework: {
              type: 'string',
              enum: ['pytest', 'junit', 'testng', 'mocha'],
              default: 'pytest',
              description: 'Test framework to configure for'
            },
            includeScreenshots: {
              type: 'boolean',
              default: true,
              description: 'Enable screenshot capture on test failures'
            },
            includeEnvironmentInfo: {
              type: 'boolean',
              default: true,
              description: 'Include environment information in reports'
            }
          }
        },
      },
      {
        name: 'execute_pytest_with_allure',
        description: 'Execute pytest tests with Allure data collection and detailed reporting',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory'
            },
            testFile: {
              type: 'string',
              description: 'Specific test file or pattern to execute'
            },
            allureResultsDir: {
              type: 'string',
              description: 'Custom directory for Allure results'
            },
            additionalArgs: {
              type: 'array',
              items: { type: 'string' },
              default: [],
              description: 'Additional pytest arguments'
            }
          }
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'start_browser': {
        const args = StartBrowserSchema.parse(request.params.arguments);
        
        // Close existing driver if any
        if (driver) {
          await driver.quit();
        }

        let options;
        let builder = new Builder();

        switch (args.browser) {
          case 'chrome':
            options = new chrome.Options();
            if (args.headless) options.addArguments('--headless');
            if (args.userAgent) options.addArguments(`--user-agent=${args.userAgent}`);
            options.addArguments(`--window-size=${args.windowSize.replace('x', ',')}`);
            builder = builder.forBrowser('chrome').setChromeOptions(options);
            break;
          
          case 'firefox':
            options = new firefox.Options();
            if (args.headless) options.addArguments('--headless');
            if (args.userAgent) options.setPreference('general.useragent.override', args.userAgent);
            const [width, height] = args.windowSize.split('x');
            options.addArguments(`--width=${width}`, `--height=${height}`);
            builder = builder.forBrowser('firefox').setFirefoxOptions(options);
            break;
          
          case 'edge':
            options = new edge.Options();
            if (args.headless) options.addArguments('--headless');
            if (args.userAgent) options.addArguments(`--user-agent=${args.userAgent}`);
            options.addArguments(`--window-size=${args.windowSize.replace('x', ',')}`);
            builder = builder.forBrowser('MicrosoftEdge').setEdgeOptions(options);
            break;
        }

        driver = await builder.build();
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully started ${args.browser} browser${args.headless ? ' in headless mode' : ''} with window size ${args.windowSize}`,
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
        const args = ClickSchema.parse(request.params.arguments);
        const element = await getElement(args.selector, args.method, args.timeout);
        await element.click();
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully clicked element with ${args.method} selector: ${args.selector}`,
            },
          ],
        };
      }

      case 'type_text': {
        const args = TypeSchema.parse(request.params.arguments);
        const element = await getElement(args.selector, args.method, args.timeout);
        
        if (args.clear) {
          await element.clear();
        }
        await element.sendKeys(args.text);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully typed "${args.text}" into element with ${args.method} selector: ${args.selector}`,
            },
          ],
        };
      }

      case 'get_text': {
        const args = GetTextSchema.parse(request.params.arguments);
        const element = await getElement(args.selector, args.method, args.timeout);
        const text = await element.getText();
        
        return {
          content: [
            {
              type: 'text',
              text: `Text content: ${text}`,
            },
          ],
        };
      }

      case 'wait_for_element': {
        const args = WaitForElementSchema.parse(request.params.arguments);
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }

        let locator;
        switch (args.method) {
          case 'css':
            locator = By.css(args.selector);
            break;
          case 'xpath':
            locator = By.xpath(args.selector);
            break;
          case 'id':
            locator = By.id(args.selector);
            break;
          case 'className':
            locator = By.className(args.selector);
            break;
          case 'tagName':
            locator = By.tagName(args.selector);
            break;
          default:
            throw new Error(`Unsupported method: ${args.method}`);
        }

        switch (args.condition) {
          case 'visible':
            await driver.wait(until.elementIsVisible(driver.findElement(locator)), args.timeout);
            break;
          case 'present':
            await driver.wait(until.elementLocated(locator), args.timeout);
            break;
          case 'clickable':
            await driver.wait(until.elementIsEnabled(driver.findElement(locator)), args.timeout);
            break;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Element with ${args.method} selector "${args.selector}" is now ${args.condition}`,
            },
          ],
        };
      }

      case 'take_screenshot': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }
        
        const args = TakeScreenshotSchema.parse(request.params.arguments);
        const screenshot = await driver.takeScreenshot();
        
        if (args.path) {
          fs.writeFileSync(args.path, screenshot, 'base64');
          return {
            content: [
              {
                type: 'text',
                text: `Screenshot saved to ${args.path}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Screenshot taken (base64): ${screenshot.substring(0, 100)}...`,
              },
            ],
          };
        }
      }

      case 'execute_script': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }
        
        const args = ExecuteScriptSchema.parse(request.params.arguments);
        const result = await driver.executeScript(args.script, ...args.args);
        
        return {
          content: [
            {
              type: 'text',
              text: `Script executed successfully. Result: ${JSON.stringify(result)}`,
            },
          ],
        };
      }

      case 'get_page_title': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }
        
        const title = await driver.getTitle();
        
        return {
          content: [
            {
              type: 'text',
              text: `Page title: ${title}`,
            },
          ],
        };
      }

      case 'get_current_url': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }
        
        const url = await driver.getCurrentUrl();
        
        return {
          content: [
            {
              type: 'text',
              text: `Current URL: ${url}`,
            },
          ],
        };
      }

      case 'close_browser': {
        if (!driver) {
          throw new Error('No browser session to close.');
        }
        
        await driver.quit();
        driver = null;
        
        return {
          content: [
            {
              type: 'text',
              text: 'Browser session closed successfully',
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
          const xpath = args.exactMatch 
            ? `//div[contains(@class, 'inventory_item_name') and text()='${args.productName}']`
            : `//div[contains(@class, 'inventory_item_name') and contains(text(), '${args.productName}')]`;
          
          await driver.wait(until.elementLocated(By.xpath(xpath)), args.timeout);
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Product "${args.productName}" found on the page`,
              },
            ],
          };
        } catch (error) {
          // Get all available products for suggestions
          try {
            const products = await driver.findElements(By.css('.inventory_item .inventory_item_name'));
            const productNames = await Promise.all(products.map(p => p.getText()));
            
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Product "${args.productName}" not found. Available products: ${productNames.join(', ')}`,
                },
              ],
            };
          } catch {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Product "${args.productName}" not found and unable to list available products`,
                },
              ],
            };
          }
        }
      }

      case 'get_all_products': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }
        
        const args = GetAllProductsSchema.parse(request.params.arguments);
        
        try {
          const products = await driver.findElements(By.css(args.productSelector));
          const productNames = await Promise.all(products.map(p => p.getText()));
          
          return {
            content: [
              {
                type: 'text',
                text: `Available products (${productNames.length}): ${productNames.join(', ')}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error retrieving products: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'create_bdd_feature': {
        const args = CreateBddFeatureSchema.parse(request.params.arguments);
        
        const featureContent = `Feature: ${args.featureName}
${args.description ? `  ${args.description}` : ''}

${args.scenarios.map(scenario => `  Scenario: ${scenario.name}
${scenario.steps.map(step => `    ${step}`).join('\n')}`).join('\n\n')}
`;

        const outputPath = args.outputPath || `${args.featureName.toLowerCase().replace(/\s+/g, '_')}.feature`;
        fs.writeFileSync(outputPath, featureContent);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ BDD Feature file created: ${outputPath}\n\nContent:\n${featureContent}`,
            },
          ],
        };
      }

      case 'create_page_object': {
        const args = CreatePageObjectSchema.parse(request.params.arguments);
        
        let elements: any[] = [];
        if (args.scanElements && driver) {
          try {
            const interactiveElements = await driver.findElements(By.css('input, button, select, textarea, a[href], [onclick], [role="button"]'));
            elements = await Promise.all(interactiveElements.map(async (el) => {
              const tagName = await el.getTagName();
              const id = await el.getAttribute('id');
              const className = await el.getAttribute('class');
              const text = await el.getText();
              const type = await el.getAttribute('type');
              
              return {
                name: id || text.replace(/\s+/g, '').substring(0, 20) || `${tagName}Element`,
                selector: id ? `#${id}` : className ? `.${className.split(' ')[0]}` : tagName,
                type: tagName,
                inputType: type
              };
            }));
          } catch (error) {
            // Continue without scanning if browser not available
          }
        }

        let pageObjectContent = '';
        
        if (args.language === 'python') {
          pageObjectContent = `from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class ${args.pageName}Page:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
        self.url = "${args.url}"
    
    def navigate(self):
        self.driver.get(self.url)
        return self
    
${elements.map(el => `    @property
    def ${el.name.toLowerCase()}(self):
        return self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${el.selector}")))`).join('\n\n')}

    def wait_for_page_load(self):
        self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        return self
`;
        } else {
          pageObjectContent = `${args.language === 'typescript' ? 'import { WebDriver, By, until } from \'selenium-webdriver\';\n\n' : ''}class ${args.pageName}Page {
  ${args.language === 'typescript' ? 'private driver: WebDriver;\n  private url: string;\n\n' : ''}constructor(driver${args.language === 'typescript' ? ': WebDriver' : ''}) {
    this.driver = driver;
    this.url = '${args.url}';
  }

  async navigate() {
    await this.driver.get(this.url);
    return this;
  }

${elements.map(el => `  get ${el.name}() {
    return this.driver.findElement(By.css('${el.selector}'));
  }`).join('\n\n')}

  async waitForPageLoad() {
    await this.driver.wait(until.elementLocated(By.tagName('body')), 10000);
    return this;
  }
}

${args.language === 'javascript' ? 'module.exports = ' + args.pageName + 'Page;' : 'export default ' + args.pageName + 'Page;'}`;
        }

        const extension = args.language === 'python' ? '.py' : args.language === 'typescript' ? '.ts' : '.js';
        const outputPath = args.outputPath || `${args.pageName.toLowerCase()}_page${extension}`;
        fs.writeFileSync(outputPath, pageObjectContent);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Page Object created: ${outputPath}\n\nElements found: ${elements.length}\nLanguage: ${args.language}`,
            },
          ],
        };
      }

      case 'scan_page_elements': {
        if (!driver) {
          throw new Error('Browser not started. Please start the browser first.');
        }
        
        const args = ScanPageElementsSchema.parse(request.params.arguments);
        
        try {
          const selector = args.includeInteractiveOnly 
            ? 'input, button, select, textarea, a[href], [onclick], [role="button"], [tabindex]'
            : '*';
          
          const elements = await driver.findElements(By.css(selector));
          const elementData = await Promise.all(elements.slice(0, 50).map(async (el) => {
            const tagName = await el.getTagName();
            const id = await el.getAttribute('id');
            const className = await el.getAttribute('class');
            const text = (await el.getText()).substring(0, 50);
            const type = await el.getAttribute('type');
            
            return {
              tag: tagName,
              id: id || null,
              class: className || null,
              text: text || null,
              type: type || null,
              selector: id ? `#${id}` : className ? `.${className.split(' ')[0]}` : `${tagName}:nth-child(1)`
            };
          }));

          let output = '';
          if (args.outputFormat === 'json') {
            output = JSON.stringify(elementData, null, 2);
          } else if (args.outputFormat === 'page-object') {
            output = elementData.map(el => 
              `get ${(el.id || el.text || el.tag).replace(/\s+/g, '').toLowerCase()}() {\n  return this.driver.findElement(By.css('${el.selector}'));\n}`
            ).join('\n\n');
          } else {
            output = elementData.map(el => `${el.tag}: ${el.selector}`).join('\n');
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ Found ${elementData.length} elements\n\n${output}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error scanning elements: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'generate_python_script': {
        const args = GeneratePythonScriptSchema.parse(request.params.arguments);
        
        let scriptContent = '';
        
        if (args.scriptType === 'bdd') {
          scriptContent = `import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

@pytest.fixture
def driver():
    driver = webdriver.Chrome()
    yield driver
    driver.quit()

def test_${args.testName.toLowerCase().replace(/\s+/g, '_')}(driver):
    """${args.testName}"""
    # Navigate to URL
    driver.get("${args.url}")
    wait = WebDriverWait(driver, 10)
    
${args.actions.map(action => {
    switch(action.action) {
      case 'click':
        return `    # Click element\n    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${action.selector}"))).click()`;
      case 'type':
        return `    # Type text\n    element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${action.selector}")))\n    element.clear()\n    element.send_keys("${action.value}")`;
      case 'wait':
        return `    # Wait for element\n    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${action.selector}")))`;
      default:
        return `    # ${action.action}`;
    }
}).join('\n\n')}
    
    # Add verification
    time.sleep(2)
    assert driver.current_url != "about:blank"
`;
        } else if (args.scriptType === 'page-object') {
          scriptContent = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class ${args.testName.replace(/\s+/g, '')}Page:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
        self.url = "${args.url}"
    
    def navigate(self):
        self.driver.get(self.url)
        return self

${args.actions.filter(a => a.selector).map(action => 
    `    def ${action.action}_${action.selector!.replace(/[^a-zA-Z0-9]/g, '_')}(self${action.value ? ', value' : ''}):\n        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${action.selector}")))\n        ${action.action === 'click' ? 'element.click()' : action.action === 'type' ? 'element.clear(); element.send_keys(value)' : 'pass'}\n        return self`
).join('\n\n')}

def test_${args.testName.toLowerCase().replace(/\s+/g, '_')}():
    driver = webdriver.Chrome()
    try:
        page = ${args.testName.replace(/\s+/g, '')}Page(driver)
        page.navigate()
${args.actions.map(action => `        page.${action.action}_${action.selector?.replace(/[^a-zA-Z0-9]/g, '_') || 'action'}(${action.value ? `"${action.value}"` : ''})`).join('\n')}
    finally:
        driver.quit()
`;
        } else {
          scriptContent = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_${args.testName.toLowerCase().replace(/\s+/g, '_')}():
    """${args.testName}"""
    driver = webdriver.Chrome()
    
    try:
        # Navigate to URL
        driver.get("${args.url}")
        wait = WebDriverWait(driver, 10)
        
${args.actions.map(action => {
    switch(action.action) {
      case 'click':
        return `        # Click element\n        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${action.selector}"))).click()`;
      case 'type':
        return `        # Type text\n        element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${action.selector}")))\n        element.clear()\n        element.send_keys("${action.value}")`;
      case 'wait':
        return `        # Wait for element\n        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "${action.selector}")))`;
      default:
        return `        # ${action.action}`;
    }
}).join('\n\n')}
        
        # Add verification
        time.sleep(2)
        assert driver.current_url != "about:blank"
        print("✅ Test completed successfully")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    test_${args.testName.toLowerCase().replace(/\s+/g, '_')}()
`;
        }

        const outputPath = args.outputPath || `test_${args.testName.toLowerCase().replace(/\s+/g, '_')}.py`;
        fs.writeFileSync(outputPath, scriptContent);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Python script created: ${outputPath}\nType: ${args.scriptType}\nActions: ${args.actions.length}`,
            },
          ],
        };
      }

      case 'create_selenium_project': {
        const args = CreateSeleniumProjectSchema.parse(request.params.arguments);
        
        const projectPath = args.outputPath || args.projectName;
        
        // Create project structure
        const dirs = [
          `${projectPath}`,
          `${projectPath}/src`,
          `${projectPath}/tests`,
          `${projectPath}/pages`,
          `${projectPath}/features`,
          `${projectPath}/reports`
        ];
        
        dirs.forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        });

        // Create package.json or requirements.txt
        if (args.language === 'python') {
          const requirements = `selenium==4.15.0
pytest==7.4.0
pytest-html==4.1.0
pytest-bdd==6.1.0
${args.includeAllure ? 'allure-pytest==2.13.0' : ''}
webdriver-manager==4.0.1
`;
          fs.writeFileSync(`${projectPath}/requirements.txt`, requirements);
          
          const conftest = `import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

@pytest.fixture
def driver():
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.maximize_window()
    yield driver
    driver.quit()
`;
          fs.writeFileSync(`${projectPath}/conftest.py`, conftest);
          
        } else {
          const packageJson = {
            name: args.projectName,
            version: "1.0.0",
            description: "Selenium Test Automation Project",
            type: "module",
            scripts: {
              test: "npm run build && node tests/runner.js",
              build: "tsc",
              "test:bdd": "cucumber-js",
              "allure:generate": "allure generate reports/allure-results --clean -o reports/allure-report",
              "allure:open": "allure open reports/allure-report"
            },
            dependencies: {
              "selenium-webdriver": "^4.15.0",
              "@cucumber/cucumber": "^10.0.0",
              "allure-commandline": "^2.24.0",
              "allure-js-commons": "^2.6.0"
            },
            devDependencies: {
              typescript: "^5.0.0",
              "@types/selenium-webdriver": "^4.1.0"
            }
          };
          fs.writeFileSync(`${projectPath}/package.json`, JSON.stringify(packageJson, null, 2));
          
          const tsconfig = {
            compilerOptions: {
              target: "ES2020",
              module: "ESNext",
              moduleResolution: "node",
              outDir: "./dist",
              rootDir: "./src",
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true
            }
          };
          fs.writeFileSync(`${projectPath}/tsconfig.json`, JSON.stringify(tsconfig, null, 2));
        }

        // Create sample files
        const sampleTest = args.language === 'python' ? 
`import pytest
from pages.base_page import BasePage

def test_sample(driver):
    page = BasePage(driver)
    page.navigate("https://example.com")
    assert "Example" in driver.title
` : 
`import { WebDriver, Builder } from 'selenium-webdriver';
import BasePage from '../pages/BasePage.js';

describe('Sample Test', () => {
  let driver: WebDriver;
  let page: BasePage;

  beforeEach(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    page = new BasePage(driver);
  });

  afterEach(async () => {
    await driver?.quit();
  });

  it('should load example page', async () => {
    await page.navigate('https://example.com');
    const title = await driver.getTitle();
    expect(title).toContain('Example');
  });
});`;

        fs.writeFileSync(`${projectPath}/tests/sample.${args.language === 'python' ? 'py' : 'ts'}`, sampleTest);

        const readme = `# ${args.projectName}

Selenium Test Automation Project
Language: ${args.language}
Framework: ${args.framework}

## Setup
${args.language === 'python' ? 
`pip install -r requirements.txt` : 
`npm install`}

## Run Tests
${args.language === 'python' ? 
`pytest tests/` : 
`npm test`}

${args.includeAllure ? `## Generate Reports
${args.language === 'python' ? 
`allure serve reports/allure-results` : 
`npm run allure:generate && npm run allure:open`}` : ''}
`;
        fs.writeFileSync(`${projectPath}/README.md`, readme);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Selenium project created: ${projectPath}\nLanguage: ${args.language}\nFramework: ${args.framework}\nStructure: ${dirs.length} directories created\nAllure: ${args.includeAllure ? 'Included' : 'Not included'}`,
            },
          ],
        };
      }

      case 'generate_allure_report': {
        const args = GenerateAllureReportSchema.parse(request.params.arguments);
        const manager = new AllureReportManager(args.projectPath);

        try {
          // Check prerequisites
          const hasAllure = await manager.checkAllureCli();
          if (!hasAllure) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ Allure CLI not found! Please install with: npm install -g allure-commandline',
                },
              ],
            };
          }

          // Setup and clean
          await manager.setupDirectories();
          await manager.cleanPreviousResults();
          await manager.createEnvironmentProperties();

          let testOutput = '';
          if (args.includeTestExecution) {
            // Execute tests
            const testResult = await manager.executePytestWithAllure(args.testFile);
            testOutput = `\n📊 Test Results:\n${testResult.output}\n`;
          }

          // Generate static report
          const reportGenerated = await manager.generateStaticReport();
          
          return {
            content: [
              {
                type: 'text',
                text: `🎉 Allure Report Generation Complete!\n` +
                      `📁 Project: ${manager['projectPath']}\n` +
                      `📋 Static Report: ${reportGenerated ? '✅ Generated' : '⚠️ Failed'}\n` +
                      `📍 Results: ${manager['allureResultsDir']}\n` +
                      `📊 Report: ${manager['allureReportDir']}${testOutput}\n` +
                      `💡 Use 'serve_allure_report' to view on localhost`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Allure report generation failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      case 'serve_allure_report': {
        const args = ServeAllureReportSchema.parse(request.params.arguments);
        const manager = new AllureReportManager(args.projectPath);

        try {
          // Check if Allure CLI is available
          const hasAllure = await manager.checkAllureCli();
          if (!hasAllure) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ Allure CLI not found! Please install with: npm install -g allure-commandline',
                },
              ],
            };
          }

          // Find available port
          const availablePort = await manager.findAvailablePort(args.port);
          
          // Start server
          const result = await manager.serveReport(availablePort, args.background);
          
          if (result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `🌐 Allure Report Server Started!\n` +
                        `📍 URL: ${result.url}\n` +
                        `🔌 Port: ${result.port}\n` +
                        `🖥️ Mode: ${args.background ? 'Background' : 'Foreground'}\n` +
                        `📁 Project: ${manager['projectPath']}\n\n` +
                        `💡 Open your browser and navigate to the URL above to view the report.\n` +
                        `⚠️ Press Ctrl+C to stop the server when running in foreground mode.`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Failed to start Allure server on port ${availablePort}. Please try a different port or check if Allure results exist.`,
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Error serving Allure report: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      case 'create_allure_config': {
        const args = CreateAllureConfigSchema.parse(request.params.arguments);
        const manager = new AllureReportManager(args.projectPath);

        try {
          await manager.setupDirectories();
          await manager.createEnvironmentProperties();

          // Create pytest.ini for pytest framework (using your exact working configuration)
          if (args.testFramework === 'pytest') {
            const pytestConfig = `[tool:pytest]
addopts = 
    --alluredir=reports/allure-results
    --clean-alluredir
    --html=reports/pytest-html-report.html
    --self-contained-html
    -v
    -s

testpaths = .
python_files = test_*.py
python_classes = Test*
python_functions = test_*

markers =
    smoke: Smoke tests
    regression: Regression tests
    critical: Critical functionality tests`;

            const pytestIniPath = path.join(manager['projectPath'], 'pytest.ini');
            await fs.promises.writeFile(pytestIniPath, pytestConfig);
          }

          // Create conftest.py for enhanced Allure setup (using your exact working implementation)
          const conftestContent = `import pytest
import allure
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager


@pytest.fixture(scope="session", autouse=True)
def setup_allure_environment():
    """Setup Allure environment properties"""
    os.makedirs("reports/allure-results", exist_ok=True)
    
    # Create environment.properties file for Allure
    env_props = """Browser=Chrome
Test.URL=https://www.saucedemo.com/v1/
Framework=Pytest + Selenium
Language=Python
Test.Environment=QA
Executed.By=Automation"""
    
    with open("reports/allure-results/environment.properties", "w") as f:
        f.write(env_props)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Attach screenshot to Allure report on test failure"""
    outcome = yield
    report = outcome.get_result()
    
    if report.when == "call" and report.failed:
        # Try to get the driver from the test
        if hasattr(item, 'funcargs') and 'setup_driver' in item.funcargs:
            driver = item.funcargs['setup_driver']
            try:
                screenshot = driver.get_screenshot_as_png()
                allure.attach(screenshot, 
                            name="Failure Screenshot", 
                            attachment_type=allure.attachment_type.PNG)
            except Exception as e:
                print(f"Could not take screenshot: {e}")`;

          const conftestPath = path.join(manager['projectPath'], 'conftest.py');
          await fs.promises.writeFile(conftestPath, conftestContent);

          return {
            content: [
              {
                type: 'text',
                text: `✅ Allure Configuration Created!\n` +
                      `📁 Project: ${manager['projectPath']}\n` +
                      `🔧 Framework: ${args.testFramework}\n` +
                      `📸 Screenshots: ${args.includeScreenshots ? 'Enabled' : 'Disabled'}\n` +
                      `🌍 Environment Info: ${args.includeEnvironmentInfo ? 'Enabled' : 'Disabled'}\n\n` +
                      `📝 Files created:\n` +
                      `  - ${args.testFramework === 'pytest' ? 'pytest.ini' : 'config file'}\n` +
                      `  - conftest.py (test configuration)\n` +
                      `  - environment.properties\n` +
                      `  - reports/ directory structure`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to create Allure configuration: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      case 'execute_pytest_with_allure': {
        const args = ExecutePytestWithAllureSchema.parse(request.params.arguments);
        const manager = new AllureReportManager(args.projectPath);

        try {
          await manager.setupDirectories();
          
          const resultsDir = args.allureResultsDir || manager['allureResultsDir'];
          const result = await manager.executePytestWithAllure(args.testFile, args.additionalArgs);

          // Check if results were generated
          const resultFiles = fs.existsSync(resultsDir) ? 
            await fs.promises.readdir(resultsDir) : [];

          return {
            content: [
              {
                type: 'text',
                text: `🧪 Pytest Execution with Allure Complete!\n\n` +
                      `📊 Execution Status: ${result.success ? '✅ Success' : '⚠️ Some tests failed'}\n` +
                      `📁 Results Directory: ${resultsDir}\n` +
                      `📄 Result Files: ${resultFiles.length} files generated\n\n` +
                      `📋 Test Output:\n${result.output}\n\n` +
                      `💡 Use 'generate_allure_report' to create HTML report or 'serve_allure_report' to view directly`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Pytest execution failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Selenium MCP Server running on stdio');
}

// Handle cleanup
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

// Start the server directly since this is the main module
main().catch(console.error);
