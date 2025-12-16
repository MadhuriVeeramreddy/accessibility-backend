const { join } = require('path');
const { homedir } = require('os');

// Configure Puppeteer cache directory
// On Render, use /opt/render/.cache/puppeteer
// Locally, use the default home directory cache
const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_NAME;
const cacheDir = isRender 
  ? '/opt/render/.cache/puppeteer'
  : join(homedir(), '.cache', 'puppeteer');

module.exports = {
  cacheDirectory: cacheDir,
};
