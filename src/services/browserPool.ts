/**
 * Browser Pool - Reuse Chrome instances for better performance
 * 
 * Instead of launching a new Chrome for each scan, we reuse instances.
 * This saves 3-5 seconds per scan on browser startup time.
 */

import puppeteer, { Browser } from 'puppeteer';
import { getChromePath } from '../utils/chromePath';

class BrowserPool {
  private browsers: Browser[] = [];
  private maxBrowsers: number = 3; // Maximum concurrent browsers
  private currentIndex: number = 0;
  private isInitialized: boolean = false;

  /**
   * Get Chrome executable path
   */
  private getChromePath(): string | undefined {
    return getChromePath();
  }

  /**
   * Initialize browser pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Ensure PUPPETEER_CACHE_DIR is set for Render
    const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
    if (isRender && !process.env.PUPPETEER_CACHE_DIR) {
      process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
    }

    console.log('🚀 Initializing browser pool...');
    const chromePath = this.getChromePath();

    // Pre-launch browsers for reuse
    for (let i = 0; i < this.maxBrowsers; i++) {
      try {
        const launchOptions: any = {
          headless: 'new' as any,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        };
        
        // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
        if (chromePath) {
          launchOptions.executablePath = chromePath;
        }
        
        const browser = await puppeteer.launch(launchOptions);
        this.browsers.push(browser);
      } catch (error) {
        console.error(`Failed to launch browser ${i + 1}:`, error);
      }
    }

    this.isInitialized = true;
    console.log(`✅ Browser pool initialized with ${this.browsers.length} browsers`);
  }

  /**
   * Get an available browser (round-robin)
   */
  async getBrowser(): Promise<Browser> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        console.warn('⚠️  Browser pool initialization failed, using fallback:', error);
        // Fallback: launch a new browser
        const chromePath = this.getChromePath();
        const launchOptions: any = {
          headless: 'new' as any,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        };
        
        // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
        if (chromePath) {
          launchOptions.executablePath = chromePath;
        }
        
        return await puppeteer.launch(launchOptions);
      }
    }

    if (this.browsers.length === 0) {
      // Fallback: launch a new browser if pool is empty
      console.warn('⚠️  Browser pool is empty, launching new browser');
      const chromePath = this.getChromePath();
      const launchOptions: any = {
        headless: 'new' as any,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };
      
      // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
      if (chromePath) {
        launchOptions.executablePath = chromePath;
      }
      
      return await puppeteer.launch(launchOptions);
    }

    // Round-robin selection
    const browser = this.browsers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.browsers.length;

    // Check if browser is still connected
    if (!browser.isConnected()) {
      console.warn('⚠️  Browser from pool disconnected, removing and launching new one');
      // Remove disconnected browser
      this.browsers = this.browsers.filter(b => b !== browser);
      // Launch new browser
      const chromePath = this.getChromePath();
      const launchOptions: any = {
        headless: 'new' as any,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };
      
      // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
      if (chromePath) {
        launchOptions.executablePath = chromePath;
      }
      
      const newBrowser = await puppeteer.launch(launchOptions);
      this.browsers.push(newBrowser);
      return newBrowser;
    }

    return browser;
  }

  /**
   * Close all browsers in the pool
   */
  async closeAll(): Promise<void> {
    console.log('🛑 Closing browser pool...');
    await Promise.all(this.browsers.map(browser => browser.close().catch(() => {})));
    this.browsers = [];
    this.isInitialized = false;
    console.log('✅ Browser pool closed');
  }
}

// Export singleton instance
export const browserPool = new BrowserPool();

/**
 * Open a page using pooled browser
 * PERFORMANCE: Saves 3-5 seconds per scan by reusing browsers
 */
export async function openPageFromPool(url: string) {
  const cleanUrl = url.trim().replace(/\s+/g, '');
  
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error(`Invalid URL: ${url}. URL must start with http:// or https://`);
  }

  // Get browser from pool (already launched!)
  const browser = await browserPool.getBrowser();
  
  // Create new page
  const page = await browser.newPage();

  // Navigate to URL
  await page.goto(cleanUrl, { 
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  
  // Wait a bit for dynamic content (replaces deprecated waitForTimeout)
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { page, browser, isPooled: true };
}
