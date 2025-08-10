// Example usage of Selenium MCP Server tools
// This file shows common automation patterns using the MCP tools

/**
 * Example 1: Basic navigation and element interaction
 */
const basicExample = {
  // Start a Chrome browser
  startBrowser: {
    tool: "start_browser",
    arguments: {
      browser: "chrome",
      headless: false,
      windowSize: "1920x1080"
    }
  },

  // Navigate to a website
  navigate: {
    tool: "navigate", 
    arguments: {
      url: "https://example.com"
    }
  },

  // Click a button
  clickButton: {
    tool: "click",
    arguments: {
      selector: "#submit-button",
      method: "css",
      timeout: 10000
    }
  },

  // Type in an input field
  typeText: {
    tool: "type_text",
    arguments: {
      selector: "input[name='username']",
      text: "testuser",
      method: "css",
      clear: true
    }
  }
};

/**
 * Example 2: Form automation
 */
const formExample = {
  // Fill out a login form
  fillUsername: {
    tool: "type_text",
    arguments: {
      selector: "#username",
      text: "user@example.com",
      method: "id"
    }
  },

  fillPassword: {
    tool: "type_text", 
    arguments: {
      selector: "#password",
      text: "secretpassword",
      method: "id"
    }
  },

  submitForm: {
    tool: "click",
    arguments: {
      selector: "button[type='submit']",
      method: "css"
    }
  }
};

/**
 * Example 3: Data extraction
 */
const dataExtractionExample = {
  // Get text from multiple elements
  getTitle: {
    tool: "get_text",
    arguments: {
      selector: "h1",
      method: "css"
    }
  },

  getDescription: {
    tool: "get_text",
    arguments: {
      selector: ".description",
      method: "css"
    }
  },

  // Get page metadata
  getPageTitle: {
    tool: "get_page_title",
    arguments: {}
  },

  getCurrentUrl: {
    tool: "get_current_url", 
    arguments: {}
  }
};

/**
 * Example 4: Advanced interactions
 */
const advancedExample = {
  // Wait for dynamic content
  waitForElement: {
    tool: "wait_for_element",
    arguments: {
      selector: ".dynamic-content",
      method: "css",
      condition: "visible",
      timeout: 15000
    }
  },

  // Execute JavaScript
  executeScript: {
    tool: "execute_script",
    arguments: {
      script: "return document.title;",
      args: []
    }
  },

  // Take screenshot
  takeScreenshot: {
    tool: "take_screenshot", 
    arguments: {
      path: "./screenshots/page.png",
      fullPage: true
    }
  },

  // Complex JavaScript execution
  complexScript: {
    tool: "execute_script",
    arguments: {
      script: `
        const elements = document.querySelectorAll('.item');
        return Array.from(elements).map(el => ({
          text: el.textContent,
          href: el.href || null
        }));
      `,
      args: []
    }
  }
};

/**
 * Example 5: XPath selectors
 */
const xpathExample = {
  // Using XPath to find elements by text content
  clickLinkByText: {
    tool: "click",
    arguments: {
      selector: "//a[contains(text(), 'Contact Us')]",
      method: "xpath"
    }
  },

  // Find input by label text
  fillFieldByLabel: {
    tool: "type_text",
    arguments: {
      selector: "//input[@id=//label[contains(text(), 'Email')]/@for]",
      text: "user@example.com", 
      method: "xpath"
    }
  }
};

/**
 * Example 6: Error handling patterns
 */
const errorHandlingExample = {
  // Wait for element with longer timeout
  waitForSlowElement: {
    tool: "wait_for_element",
    arguments: {
      selector: ".slow-loading",
      method: "css",
      condition: "present",
      timeout: 30000
    }
  },

  // Alternative selectors (try different approaches)
  clickWithFallback: [
    {
      tool: "click",
      arguments: {
        selector: "#primary-button",
        method: "id"
      }
    },
    {
      tool: "click", 
      arguments: {
        selector: ".btn-primary",
        method: "css"
      }
    }
  ]
};

/**
 * Example 7: Multi-browser testing
 */
const multiBrowserExample = {
  chrome: {
    tool: "start_browser",
    arguments: {
      browser: "chrome",
      headless: true
    }
  },

  firefox: {
    tool: "start_browser",
    arguments: {
      browser: "firefox", 
      headless: true
    }
  },

  edge: {
    tool: "start_browser",
    arguments: {
      browser: "edge",
      headless: true
    }
  }
};

export {
  basicExample,
  formExample,
  dataExtractionExample,
  advancedExample,
  xpathExample,
  errorHandlingExample,
  multiBrowserExample
};
