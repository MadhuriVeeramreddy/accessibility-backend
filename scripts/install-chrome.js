#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, readdirSync } = require('fs');
const { join } = require('path');

console.log('🔧 Installing Chrome for Puppeteer...');

// Determine if we're on Render
const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
const cacheDir = isRender ? '/opt/render/.cache/puppeteer' : join(require('os').homedir(), '.cache', 'puppeteer');

console.log(`   Environment: ${isRender ? 'Render (Production)' : 'Local Development'}`);
console.log(`   Cache directory: ${cacheDir}`);

// Set cache directory environment variable
process.env.PUPPETEER_CACHE_DIR = cacheDir;

try {
  console.log('📦 Installing Chrome...');
  console.log(`   Using cache directory: ${cacheDir}`);
  
  // Install Chrome using Puppeteer browsers command
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: cacheDir
    }
  });
  
  console.log('✅ Installation command completed!');
  
  // Verify installation
  console.log('\n🔍 Verifying Chrome installation...');
  
  const chromeDir = join(cacheDir, 'chrome');
  
  if (existsSync(chromeDir)) {
    console.log(`✅ Chrome directory exists: ${chromeDir}`);
    
    try {
      const versions = readdirSync(chromeDir);
      console.log(`📁 Found versions: ${versions.join(', ')}`);
      
      // Check for the chrome executable in each version
      for (const version of versions) {
        const possiblePaths = [
          join(chromeDir, version, 'chrome-linux64', 'chrome'),
          join(chromeDir, version, 'chrome-linux-x64', 'chrome'),
          join(chromeDir, version, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          join(chromeDir, version, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        ];
        
        for (const chromePath of possiblePaths) {
          if (existsSync(chromePath)) {
            console.log(`✅ Chrome executable found: ${chromePath}`);
            console.log('\n🎉 Chrome installation successful!');
            process.exit(0);
          }
        }
        
        // List what's actually in the version directory
        const versionPath = join(chromeDir, version);
        if (existsSync(versionPath)) {
          const contents = readdirSync(versionPath);
          console.log(`   Contents of ${version}: ${contents.join(', ')}`);
          
          // Check inside each subdirectory
          for (const subdir of contents) {
            const subdirPath = join(versionPath, subdir);
            try {
              const subdirContents = readdirSync(subdirPath);
              console.log(`      ${subdir}/: ${subdirContents.join(', ')}`);
            } catch (e) {
              // Not a directory or can't read
            }
          }
        }
      }
      
      console.log('\n⚠️  Chrome directory exists but executable not found in expected locations');
      console.log('   This might still work - Puppeteer may find Chrome using its own logic');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error reading chrome directory:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`❌ Chrome directory not found: ${chromeDir}`);
    console.log('   Installation may have failed or used a different location');
    
    // List what's in the cache directory
    if (existsSync(cacheDir)) {
      try {
        const contents = readdirSync(cacheDir);
        console.log(`   Cache directory contents: ${contents.join(', ')}`);
      } catch (e) {
        console.log('   Could not read cache directory contents');
      }
    } else {
      console.log(`   Cache directory doesn't exist: ${cacheDir}`);
    }
    
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Chrome installation failed:', error.message);
  console.log('\n💡 Troubleshooting tips:');
  console.log('   1. Check if you have sufficient disk space');
  console.log('   2. Verify write permissions to:', cacheDir);
  console.log('   3. Try running: PUPPETEER_CACHE_DIR=' + cacheDir + ' npx puppeteer browsers install chrome');
  process.exit(1);
}