#!/usr/bin/env node

/**
 * Install Chrome for Puppeteer with proper cache directory configuration
 * This script ensures Chrome is installed to the correct location on Render
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
const cacheDir = isRender 
  ? '/opt/render/.cache/puppeteer'
  : join(homedir(), '.cache', 'puppeteer');

console.log('🔧 Installing Chrome for Puppeteer...');
console.log(`   Environment: ${isRender ? 'Render (Production)' : 'Local (Development)'}`);
console.log(`   Cache directory: ${cacheDir}`);

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
  console.log('📦 Installing Chrome...');
  console.log(`   Using cache directory: ${cacheDir}`);
  
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: cacheDir,
    },
  });
  
  // Verify Chrome was installed
  const { readdirSync, existsSync, statSync } = require('fs');
  const { join } = require('path');
  const chromeCacheDir = join(cacheDir, 'chrome');
  
  if (existsSync(chromeCacheDir)) {
    const versions = readdirSync(chromeCacheDir);
    let chromeFound = false;
    
    for (const version of versions) {
      const chromePath = join(chromeCacheDir, version, 'chrome-linux-x64', 'chrome');
      if (existsSync(chromePath)) {
        try {
          const stats = statSync(chromePath);
          if (stats.isFile()) {
            console.log(`✅ Chrome verified at: ${chromePath}`);
            chromeFound = true;
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
    }
    
    if (!chromeFound) {
      console.warn('⚠️  Chrome installation completed but Chrome executable not found in expected location');
      console.warn(`   Checked: ${chromeCacheDir}`);
    }
  } else {
    console.warn(`⚠️  Chrome cache directory not found: ${chromeCacheDir}`);
  }
  
  console.log('✅ Chrome installation completed!');
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
    console.error('⚠️  Chrome installation failed. The app may not work correctly.');
    console.error('   Please check build logs and ensure PUPPETEER_CACHE_DIR is set correctly.');
    // Don't exit with error - let build continue, but log the issue
    process.exit(0);
  }
}
