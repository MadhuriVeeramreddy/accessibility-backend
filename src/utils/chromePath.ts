import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { homedir, platform } from 'os';

/**
 * Get Chrome executable path for Puppeteer
 * Supports both macOS (local dev) and Linux (Render/production)
 * 
 * On Render/Linux, Puppeteer should auto-detect Chrome if installed correctly.
 * This function helps find Chrome in common locations, but returns undefined
 * to let Puppeteer handle auto-detection if not found.
 */
export function getChromePath(): string | undefined {
  const isLinux = platform() === 'linux';
  const isMac = platform() === 'darwin';
  
  // Try Render's cache path first (Linux)
  const renderCacheDir = '/opt/render/.cache/puppeteer/chrome';
  
  // Try user's home cache (works for both macOS and Linux)
  const homeCacheDir = join(homedir(), '.cache', 'puppeteer', 'chrome');
  
  // Linux paths (for Render)
  if (isLinux) {
    // Check Render cache directory
    if (existsSync(renderCacheDir)) {
      try {
        const versions = readdirSync(renderCacheDir);
        for (const version of versions) {
          const chromePath = join(renderCacheDir, version, 'chrome-linux-x64', 'chrome');
          if (existsSync(chromePath)) {
            console.log(`✅ Found Chrome at: ${chromePath}`);
            return chromePath;
          }
          // Try headless-shell
          const headlessShellPath = join(renderCacheDir, version, 'chrome-linux-x64', 'chrome-headless-shell');
          if (existsSync(headlessShellPath)) {
            console.log(`✅ Found Chrome headless-shell at: ${headlessShellPath}`);
            return headlessShellPath;
          }
        }
      } catch (error) {
        // Ignore readdir errors
      }
    }
    
    // Check home cache directory
    if (existsSync(homeCacheDir)) {
      try {
        const versions = readdirSync(homeCacheDir);
        for (const version of versions) {
          if (version.startsWith('linux-')) {
            const chromePath = join(homeCacheDir, version, 'chrome-linux-x64', 'chrome');
            if (existsSync(chromePath)) {
              console.log(`✅ Found Chrome at: ${chromePath}`);
              return chromePath;
            }
          }
        }
      } catch (error) {
        // Ignore readdir errors
      }
    }
  }
  
  // macOS paths (for local development)
  if (isMac) {
    const macPaths = [
      // Latest version
      join(homeCacheDir, 'mac-143.0.7499.40/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      // ARM version
      join(homeCacheDir, 'mac_arm-143.0.7499.40/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      // Fallback to older version
      join(homeCacheDir, 'mac-121.0.6167.85/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    ];
    
    for (const path of macPaths) {
      if (existsSync(path)) {
        console.log(`✅ Found Chrome at: ${path}`);
        return path;
      }
    }
  }
  
  // Let Puppeteer auto-detect (it will use its own cache or download Chrome)
  console.log('⚠️  Chrome not found in cache, using Puppeteer auto-detection');
  return undefined;
}

