import puppeteer, { Browser, Page } from 'puppeteer';
import { join } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Get Chrome executable path
const getChromePath = (): string | undefined => {
  const cacheDir = join(homedir(), '.cache', 'puppeteer', 'chrome');
  
  // Try to find installed Chrome versions
  const possiblePaths = [
    // Latest version
    join(cacheDir, 'mac-143.0.7499.40/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    // ARM version
    join(cacheDir, 'mac_arm-143.0.7499.40/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    // Fallback to older version
    join(cacheDir, 'mac-121.0.6167.85/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log('Using Chrome at:', path);
      return path;
    }
  }

  // Let Puppeteer auto-detect
  console.log('Chrome not found in cache, using Puppeteer auto-detection');
  return undefined;
};

// Launch browser in headless mode
export const launchBrowser = async (): Promise<Browser> => {
  const chromePath = getChromePath();
  
  const browser = await puppeteer.launch({
    headless: 'new' as any, // Use new headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: chromePath, // Explicitly set Chrome path
  });
  
  return browser;
};

// Open a page and navigate to URL
export const openPage = async (url: string): Promise<{ page: Page; browser: Browser }> => {
  // Clean and validate URL
  const cleanUrl = url.trim().replace(/\s+/g, '');
  
  // Ensure URL starts with http:// or https://
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error(`Invalid URL: ${url}. URL must start with http:// or https://`);
  }

  // Launch browser
  const browser = await launchBrowser();

  // Create new page
  const page = await browser.newPage();

  try {
    // Navigate to URL with increased timeout and less strict wait condition
    await page.goto(cleanUrl, { 
      waitUntil: 'domcontentloaded', // Less strict than 'networkidle2'
      timeout: 60000, // 60 seconds timeout
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle navigation errors gracefully
    if (errorMessage.includes('Navigating frame was detached') || 
        errorMessage.includes('frame was detached') ||
        errorMessage.includes('Target closed') ||
        errorMessage.includes('Session closed')) {
      // Close browser and page if navigation failed
      try {
        if (!page.isClosed()) {
          await page.close();
        }
        if (browser.isConnected()) {
          await browser.close();
        }
      } catch (closeError) {
        // Ignore close errors
      }
      
      throw new Error(`Navigation failed: Page was closed or detached during navigation. This may happen if the server is shutting down.`);
    }
    
    // Re-throw other errors
    throw error;
  }

  return { page, browser };
};

