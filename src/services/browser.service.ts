import puppeteer, { Browser, Page } from 'puppeteer';
import { getChromePath } from '../utils/chromePath';

// Launch browser in headless mode
export const launchBrowser = async (): Promise<Browser> => {
  // Ensure PUPPETEER_CACHE_DIR is set for Render
  const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
  if (isRender && !process.env.PUPPETEER_CACHE_DIR) {
    process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
    console.log('🔧 Set PUPPETEER_CACHE_DIR for browser launch:', process.env.PUPPETEER_CACHE_DIR);
  }
  
  const chromePath = getChromePath();
  
  const launchOptions: any = {
    headless: 'new' as any, // Use new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };
  
  // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
  if (chromePath) {
    launchOptions.executablePath = chromePath;
    console.log(`🌐 Using Chrome at: ${chromePath}`);
  } else {
    console.log('🌐 Chrome path not found, Puppeteer will attempt auto-detection');
    console.log(`   PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || 'not set'}`);
  }
  
  try {
    const browser = await puppeteer.launch(launchOptions);
    return browser;
  } catch (error) {
    console.error('❌ Failed to launch browser:', error instanceof Error ? error.message : String(error));
    console.error('   Chrome path:', chromePath || 'not set');
    console.error('   PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR || 'not set');
    throw error;
  }
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

