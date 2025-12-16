# Chrome Installation Fix for Render

## Problem
Chrome is not being found on Render, causing scans to fail with:
```
Could not find Chrome (ver. 143.0.7499.42)
```

## Root Cause
1. Chrome may not be installed during build (postinstall script might fail silently)
2. `PUPPETEER_CACHE_DIR` environment variable not set at runtime
3. Chrome cache directory structure mismatch

## Solution Applied

### 1. Enhanced Install Script (`scripts/install-chrome.js`)
- Verifies Chrome installation after download
- Checks for Chrome executable in expected location
- Better error logging
- Doesn't fail build if installation fails (logs warning instead)

### 2. Runtime Cache Directory Configuration
Updated all Puppeteer launch points to ensure `PUPPETEER_CACHE_DIR` is set:
- `src/server.ts` - Sets at server startup
- `src/services/browser.service.ts` - Sets before browser launch
- `src/services/browserPool.ts` - Sets before pool initialization
- `src/services/pdf.service.ts` - Sets before PDF generation

### 3. Better Error Logging
- Logs Chrome path when found
- Logs cache directory when Chrome not found
- More detailed error messages for debugging

## Deployment Steps

### Option 1: Set Environment Variable in Render Dashboard
1. Go to your Render service dashboard
2. Navigate to **Environment** tab
3. Add environment variable:
   - Key: `PUPPETEER_CACHE_DIR`
   - Value: `/opt/render/.cache/puppeteer`
4. Save and redeploy

### Option 2: Verify Build Logs
After deployment, check build logs for:
- `✅ Chrome installed successfully!`
- `✅ Chrome verified at: /opt/render/.cache/puppeteer/chrome/...`

If you see warnings about Chrome not being found, the installation failed.

## Troubleshooting

### Check if Chrome is Installed
SSH into your Render instance (if possible) or check build logs:
```bash
ls -la /opt/render/.cache/puppeteer/chrome/
```

### Manual Chrome Installation
If Chrome installation fails during build, you can manually install it:
```bash
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer npx puppeteer browsers install chrome
```

### Verify Cache Directory
The cache directory should be:
- Base: `/opt/render/.cache/puppeteer`
- Chrome: `/opt/render/.cache/puppeteer/chrome/`
- Version: `/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.42/`
- Executable: `/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.42/chrome-linux-x64/chrome`

## Expected Behavior

### Successful Installation
```
🔧 Installing Chrome for Puppeteer...
   Environment: Render (Production)
   Cache directory: /opt/render/.cache/puppeteer
📦 Installing Chrome...
✅ Chrome verified at: /opt/render/.cache/puppeteer/chrome/linux-143.0.7499.42/chrome-linux-x64/chrome
✅ Chrome installation completed!
```

### Runtime
```
🔧 Configured Puppeteer cache directory for Render: /opt/render/.cache/puppeteer
✅ Found Chrome at: /opt/render/.cache/puppeteer/chrome/linux-143.0.7499.42/chrome-linux-x64/chrome
🌐 Using Chrome at: /opt/render/.cache/puppeteer/chrome/linux-143.0.7499.42/chrome-linux-x64/chrome
```

## If Issues Persist

1. **Check Build Logs**: Look for Chrome installation errors
2. **Verify Environment Variable**: Ensure `PUPPETEER_CACHE_DIR` is set
3. **Check Permissions**: Cache directory should be writable
4. **Render Cache Persistence**: `/opt/render/.cache/` persists across deployments
5. **Contact Support**: If Chrome installation consistently fails, check Render's build environment

## Notes

- Chrome installation takes 3-5 minutes on first build
- Subsequent builds should skip installation if Chrome exists
- Cache directory persists across deployments on Render
- If Chrome isn't found, Puppeteer will attempt to download it at runtime (may fail due to network restrictions)
