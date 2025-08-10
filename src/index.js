#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var zod_1 = require("zod");
var selenium_webdriver_1 = require("selenium-webdriver");
var chrome = require("selenium-webdriver/chrome.js");
var firefox = require("selenium-webdriver/firefox.js");
var edge = require("selenium-webdriver/edge.js");
// Global driver instance
var driver = null;
// Validation schemas
var NavigateSchema = zod_1.z.object({
    url: zod_1.z.string().url('Invalid URL format'),
});
var ClickSchema = zod_1.z.object({
    selector: zod_1.z.string().min(1, 'Selector cannot be empty'),
    method: zod_1.z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
    timeout: zod_1.z.number().positive().default(10000),
});
var TypeSchema = zod_1.z.object({
    selector: zod_1.z.string().min(1, 'Selector cannot be empty'),
    text: zod_1.z.string(),
    method: zod_1.z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
    timeout: zod_1.z.number().positive().default(10000),
    clear: zod_1.z.boolean().default(true),
});
var GetTextSchema = zod_1.z.object({
    selector: zod_1.z.string().min(1, 'Selector cannot be empty'),
    method: zod_1.z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
    timeout: zod_1.z.number().positive().default(10000),
});
var WaitForElementSchema = zod_1.z.object({
    selector: zod_1.z.string().min(1, 'Selector cannot be empty'),
    method: zod_1.z.enum(['css', 'xpath', 'id', 'className', 'tagName']).default('css'),
    timeout: zod_1.z.number().positive().default(10000),
    condition: zod_1.z.enum(['visible', 'present', 'clickable']).default('visible'),
});
var TakeScreenshotSchema = zod_1.z.object({
    path: zod_1.z.string().optional(),
    fullPage: zod_1.z.boolean().default(false),
});
var ExecuteScriptSchema = zod_1.z.object({
    script: zod_1.z.string().min(1, 'Script cannot be empty'),
    args: zod_1.z.array(zod_1.z.any()).default([]),
});
var StartBrowserSchema = zod_1.z.object({
    browser: zod_1.z.enum(['chrome', 'firefox', 'edge']).default('chrome'),
    headless: zod_1.z.boolean().default(false),
    windowSize: zod_1.z.string().regex(/^\d+x\d+$/).default('1920x1080'),
    userAgent: zod_1.z.string().optional(),
});
// Helper function to get element by various methods
function getElement(selector, method, timeout) {
    return __awaiter(this, void 0, void 0, function () {
        var locator;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!driver) {
                        throw new Error('Browser not started. Please start the browser first.');
                    }
                    switch (method) {
                        case 'css':
                            locator = selenium_webdriver_1.By.css(selector);
                            break;
                        case 'xpath':
                            locator = selenium_webdriver_1.By.xpath(selector);
                            break;
                        case 'id':
                            locator = selenium_webdriver_1.By.id(selector);
                            break;
                        case 'className':
                            locator = selenium_webdriver_1.By.className(selector);
                            break;
                        case 'tagName':
                            locator = selenium_webdriver_1.By.tagName(selector);
                            break;
                        default:
                            throw new Error("Unsupported method: ".concat(method));
                    }
                    return [4 /*yield*/, driver.wait(selenium_webdriver_1.until.elementLocated(locator), timeout)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, driver.findElement(locator)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// Create server instance
var server = new index_js_1.Server({
    name: 'selenium-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, {
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
                ],
            }];
    });
}); });
// Handle tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, args, options, builder, _b, width, height, args, args, element, args, element, args, element, text, args, locator, _c, args, screenshot, fs, args, result, title, url, error_1;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 38, , 39]);
                _a = request.params.name;
                switch (_a) {
                    case 'start_browser': return [3 /*break*/, 1];
                    case 'navigate': return [3 /*break*/, 5];
                    case 'click': return [3 /*break*/, 7];
                    case 'type_text': return [3 /*break*/, 10];
                    case 'get_text': return [3 /*break*/, 15];
                    case 'wait_for_element': return [3 /*break*/, 18];
                    case 'take_screenshot': return [3 /*break*/, 26];
                    case 'execute_script': return [3 /*break*/, 28];
                    case 'get_page_title': return [3 /*break*/, 30];
                    case 'get_current_url': return [3 /*break*/, 32];
                    case 'close_browser': return [3 /*break*/, 34];
                }
                return [3 /*break*/, 36];
            case 1:
                args = StartBrowserSchema.parse(request.params.arguments);
                if (!driver) return [3 /*break*/, 3];
                return [4 /*yield*/, driver.quit()];
            case 2:
                _d.sent();
                _d.label = 3;
            case 3:
                options = void 0;
                builder = new selenium_webdriver_1.Builder();
                switch (args.browser) {
                    case 'chrome':
                        options = new chrome.Options();
                        if (args.headless)
                            options.addArguments('--headless');
                        if (args.userAgent)
                            options.addArguments("--user-agent=".concat(args.userAgent));
                        options.addArguments("--window-size=".concat(args.windowSize.replace('x', ',')));
                        builder = builder.forBrowser('chrome').setChromeOptions(options);
                        break;
                    case 'firefox':
                        options = new firefox.Options();
                        if (args.headless)
                            options.addArguments('--headless');
                        if (args.userAgent)
                            options.setPreference('general.useragent.override', args.userAgent);
                        _b = args.windowSize.split('x'), width = _b[0], height = _b[1];
                        options.addArguments("--width=".concat(width), "--height=".concat(height));
                        builder = builder.forBrowser('firefox').setFirefoxOptions(options);
                        break;
                    case 'edge':
                        options = new edge.Options();
                        if (args.headless)
                            options.addArguments('--headless');
                        if (args.userAgent)
                            options.addArguments("--user-agent=".concat(args.userAgent));
                        options.addArguments("--window-size=".concat(args.windowSize.replace('x', ',')));
                        builder = builder.forBrowser('MicrosoftEdge').setEdgeOptions(options);
                        break;
                }
                return [4 /*yield*/, builder.build()];
            case 4:
                driver = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Successfully started ".concat(args.browser, " browser").concat(args.headless ? ' in headless mode' : '', " with window size ").concat(args.windowSize),
                            },
                        ],
                    }];
            case 5:
                if (!driver) {
                    throw new Error('Browser not started. Please start the browser first.');
                }
                args = NavigateSchema.parse(request.params.arguments);
                return [4 /*yield*/, driver.get(args.url)];
            case 6:
                _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Successfully navigated to ".concat(args.url),
                            },
                        ],
                    }];
            case 7:
                args = ClickSchema.parse(request.params.arguments);
                return [4 /*yield*/, getElement(args.selector, args.method, args.timeout)];
            case 8:
                element = _d.sent();
                return [4 /*yield*/, element.click()];
            case 9:
                _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Successfully clicked element with ".concat(args.method, " selector: ").concat(args.selector),
                            },
                        ],
                    }];
            case 10:
                args = TypeSchema.parse(request.params.arguments);
                return [4 /*yield*/, getElement(args.selector, args.method, args.timeout)];
            case 11:
                element = _d.sent();
                if (!args.clear) return [3 /*break*/, 13];
                return [4 /*yield*/, element.clear()];
            case 12:
                _d.sent();
                _d.label = 13;
            case 13: return [4 /*yield*/, element.sendKeys(args.text)];
            case 14:
                _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Successfully typed \"".concat(args.text, "\" into element with ").concat(args.method, " selector: ").concat(args.selector),
                            },
                        ],
                    }];
            case 15:
                args = GetTextSchema.parse(request.params.arguments);
                return [4 /*yield*/, getElement(args.selector, args.method, args.timeout)];
            case 16:
                element = _d.sent();
                return [4 /*yield*/, element.getText()];
            case 17:
                text = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Text content: ".concat(text),
                            },
                        ],
                    }];
            case 18:
                args = WaitForElementSchema.parse(request.params.arguments);
                if (!driver) {
                    throw new Error('Browser not started. Please start the browser first.');
                }
                locator = void 0;
                switch (args.method) {
                    case 'css':
                        locator = selenium_webdriver_1.By.css(args.selector);
                        break;
                    case 'xpath':
                        locator = selenium_webdriver_1.By.xpath(args.selector);
                        break;
                    case 'id':
                        locator = selenium_webdriver_1.By.id(args.selector);
                        break;
                    case 'className':
                        locator = selenium_webdriver_1.By.className(args.selector);
                        break;
                    case 'tagName':
                        locator = selenium_webdriver_1.By.tagName(args.selector);
                        break;
                    default:
                        throw new Error("Unsupported method: ".concat(args.method));
                }
                _c = args.condition;
                switch (_c) {
                    case 'visible': return [3 /*break*/, 19];
                    case 'present': return [3 /*break*/, 21];
                    case 'clickable': return [3 /*break*/, 23];
                }
                return [3 /*break*/, 25];
            case 19: return [4 /*yield*/, driver.wait(selenium_webdriver_1.until.elementIsVisible(driver.findElement(locator)), args.timeout)];
            case 20:
                _d.sent();
                return [3 /*break*/, 25];
            case 21: return [4 /*yield*/, driver.wait(selenium_webdriver_1.until.elementLocated(locator), args.timeout)];
            case 22:
                _d.sent();
                return [3 /*break*/, 25];
            case 23: return [4 /*yield*/, driver.wait(selenium_webdriver_1.until.elementIsEnabled(driver.findElement(locator)), args.timeout)];
            case 24:
                _d.sent();
                return [3 /*break*/, 25];
            case 25: return [2 /*return*/, {
                    content: [
                        {
                            type: 'text',
                            text: "Element with ".concat(args.method, " selector \"").concat(args.selector, "\" is now ").concat(args.condition),
                        },
                    ],
                }];
            case 26:
                if (!driver) {
                    throw new Error('Browser not started. Please start the browser first.');
                }
                args = TakeScreenshotSchema.parse(request.params.arguments);
                return [4 /*yield*/, driver.takeScreenshot()];
            case 27:
                screenshot = _d.sent();
                if (args.path) {
                    fs = require('fs');
                    fs.writeFileSync(args.path, screenshot, 'base64');
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: "Screenshot saved to ".concat(args.path),
                                },
                            ],
                        }];
                }
                else {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: "Screenshot taken (base64): ".concat(screenshot.substring(0, 100), "..."),
                                },
                            ],
                        }];
                }
                _d.label = 28;
            case 28:
                if (!driver) {
                    throw new Error('Browser not started. Please start the browser first.');
                }
                args = ExecuteScriptSchema.parse(request.params.arguments);
                return [4 /*yield*/, driver.executeScript.apply(driver, __spreadArray([args.script], args.args, false))];
            case 29:
                result = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Script executed successfully. Result: ".concat(JSON.stringify(result)),
                            },
                        ],
                    }];
            case 30:
                if (!driver) {
                    throw new Error('Browser not started. Please start the browser first.');
                }
                return [4 /*yield*/, driver.getTitle()];
            case 31:
                title = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Page title: ".concat(title),
                            },
                        ],
                    }];
            case 32:
                if (!driver) {
                    throw new Error('Browser not started. Please start the browser first.');
                }
                return [4 /*yield*/, driver.getCurrentUrl()];
            case 33:
                url = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Current URL: ".concat(url),
                            },
                        ],
                    }];
            case 34:
                if (!driver) {
                    throw new Error('No browser session to close.');
                }
                return [4 /*yield*/, driver.quit()];
            case 35:
                _d.sent();
                driver = null;
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: 'Browser session closed successfully',
                            },
                        ],
                    }];
            case 36: throw new Error("Unknown tool: ".concat(request.params.name));
            case 37: return [3 /*break*/, 39];
            case 38:
                error_1 = _d.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: 'text',
                                text: "Error: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)),
                            },
                        ],
                        isError: true,
                    }];
            case 39: return [2 /*return*/];
        }
    });
}); });
// Start the server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error('Selenium MCP Server running on stdio');
                    return [2 /*return*/];
            }
        });
    });
}
// Handle cleanup
process.on('SIGINT', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!driver) return [3 /*break*/, 2];
                return [4 /*yield*/, driver.quit()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
process.on('SIGTERM', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!driver) return [3 /*break*/, 2];
                return [4 /*yield*/, driver.quit()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
if (require.main === module) {
    main().catch(console.error);
}
