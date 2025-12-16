#!/usr/bin/env node

/**
 * Install Chrome for Puppeteer with proper cache directory configuration
 * This script ensures Chrome is installed to the correct location on Render
 * 
 * It checks if Chrome already exists before installing to save time during builds.
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync, readdirSync, statSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
const cacheDir = isRender 
  ? '/opt/render/.cache/puppeteer'
  : join(homedir(), '.cache', 'puppeteer');

const chromeCacheDir = join(cacheDir, 'chrome');

console.log('🔧 Checking Chrome installation for Puppeteer...');
console.log(`   Environment: ${isRender ? 'Render (Production)' : 'Local (Development)'}`);
console.log(`   Cache directory: ${cacheDir}`);

/**
 * Check if Chrome is already installed
 */
function isChromeInstalled() {
  if (!existsSync(chromeCacheDir)) {
    return false;
  }

  try {
    const versions = readdirSync(chromeCacheDir);
    for (const version of versions) {
      // Check for standard Chrome
      const chromePath = join(chromeCacheDir, version, 'chrome-linux-x64', 'chrome');
      if (existsSync(chromePath)) {
        try {
          const stats = statSync(chromePath);
          if (stats.isFile()) {
            console.log(`✅ Chrome already installed at: ${chromePath}`);
            return true;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      // Check for headless-shell
      const headlessShellPath = join(chromeCacheDir, version, 'chrome-linux-x64', 'chrome-headless-shell');
      if (existsSync(headlessShellPath)) {
        try {
          const stats = statSync(headlessShellPath);
          if (stats.isFile()) {
            console.log(`✅ Chrome headless-shell already installed at: ${headlessShellPath}`);
            return true;
          }
        } catch (e) {
          // Continue checking
        }
      }
    }
  } catch (error) {
    // If we can't read the directory, assume Chrome is not installed
    return false;
  }

  return false;
}

// Check if Chrome is already installed
if (isChromeInstalled()) {
  console.log('⏭️  Chrome is already installed, skipping installation.');
  process.exit(0);
}

// Ensure cache directory exists
try {
  if (!existsSync(cacheDir)) {
    console.log(`📁 Creating cache directory: ${cacheDir}`);
    mkdirSync(cacheDir, { recursive: true });
  }
} catch (error) {
  console.warn(`⚠️  Could not create cache directory: ${error.message}`);
}

// Set environment variable and install Chrome
try {
  process.env.PUPPETEER_CACHE_DIR = cacheDir;
  console.log('📦 Installing Chrome (this may take a few minutes)...');
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: cacheDir,
    },
  });
  console.log('✅ Chrome installed successfully!');
} catch (error) {
  console.error('❌ Failed to install Chrome:', error.message);
  console.log('🔄 Attempting fallback installation...');
  try {
    // Fallback: try without explicit cache directory
    execSync('npx puppeteer browsers install chrome', {
      stdio: 'inherit',
    });
    console.log('✅ Chrome installed successfully (fallback)!');
  } catch (fallbackError) {
    console.error('❌ Fallback installation also failed:', fallbackError.message);
    console.error('⚠️  Chrome installation failed, but continuing build...');
    console.error('   The app will attempt to download Chrome at runtime if needed.');
    // Don't exit with error - let the build continue
    // Puppeteer might be able to download Chrome at runtime
    process.exit(0);
  }
}
