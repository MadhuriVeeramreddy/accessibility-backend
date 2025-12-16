import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
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
  const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
  
  // Try Render's cache path first (Linux)
  const renderCacheDir = '/opt/render/.cache/puppeteer/chrome';
  
  // Try user's home cache (works for both macOS and Linux)
  const homeCacheDir = join(homedir(), '.cache', 'puppeteer', 'chrome');
  
  // Linux paths (for Render)
  if (isLinux) {
    // Check Render cache directory first
    if (isRender && existsSync(renderCacheDir)) {
      try {
        const versions = readdirSync(renderCacheDir);
        // Sort versions to get the latest first
        const sortedVersions = versions.sort((a, b) => {
          // Try to parse version numbers for proper sorting
          const aMatch = a.match(/linux-(\d+\.\d+\.\d+\.\d+)/);
          const bMatch = b.match(/linux-(\d+\.\d+\.\d+\.\d+)/);
          if (aMatch && bMatch) {
            return bMatch[1].localeCompare(aMatch[1], undefined, { numeric: true });
          }
          return b.localeCompare(a);
        });
        
        for (const version of sortedVersions) {
          // Try standard chrome path
          const chromePath = join(renderCacheDir, version, 'chrome-linux-x64', 'chrome');
          if (existsSync(chromePath)) {
            try {
              // Verify it's executable
              const stats = statSync(chromePath);
              if (stats.isFile()) {
                console.log(`✅ Found Chrome at: ${chromePath}`);
                return chromePath;
              }
            } catch (e) {
              // Continue to next path
            }
          }
          
          // Try headless-shell
          const headlessShellPath = join(renderCacheDir, version, 'chrome-linux-x64', 'chrome-headless-shell');
          if (existsSync(headlessShellPath)) {
            try {
              const stats = statSync(headlessShellPath);
              if (stats.isFile()) {
                console.log(`✅ Found Chrome headless-shell at: ${headlessShellPath}`);
                return headlessShellPath;
              }
            } catch (e) {
              // Continue to next path
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Error reading Render cache directory: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Check home cache directory as fallback
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
  if (isRender) {
    console.log('⚠️  Chrome not found in cache directories. Puppeteer will attempt to download Chrome.');
    console.log(`   Cache directory: ${renderCacheDir}`);
    console.log(`   Home cache directory: ${homeCacheDir}`);
  } else {
    console.log('⚠️  Chrome not found in cache, using Puppeteer auto-detection');
  }
  return undefined;
}

