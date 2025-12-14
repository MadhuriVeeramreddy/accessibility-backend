// Run Lighthouse and extract accessibility score
export const runLighthouse = async (url: string): Promise<number> => {
  // Dynamic imports for ES modules - use Function constructor to avoid ts-node-dev caching
  const chromeLauncher = await (new Function('return import("chrome-launcher")')());
  const lighthouse = await (new Function('return import("lighthouse")')());

  let chrome;
  try {
    // Launch Chrome with necessary flags for stability
    // This Chrome instance is completely independent from Puppeteer browser
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    });

    console.log(`✅ Lighthouse Chrome launched on port ${chrome.port}`);

    // Wait a moment for Chrome to be ready
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Run Lighthouse (it's the default export)
    const lighthouseFn = lighthouse.default || lighthouse;
    
    // Run Lighthouse without timeout
    const result = await lighthouseFn(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['accessibility'],
      logLevel: 'error',
      // Optimize settings for faster scans
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
      screenEmulation: {
        disabled: true, // Skip screen emulation
      },
      skipAudits: [], // Run all audits
      formFactor: 'desktop',
    }) as any;

    // Extract accessibility score (0-100)
    const score = result?.lhr?.categories?.accessibility?.score;
    const accessibilityScore = score ? Math.round(score * 100) : 0;

    if (accessibilityScore === 0 && !score) {
      throw new Error('Lighthouse returned invalid score');
    }

    return accessibilityScore;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Log specific error types for debugging
    if (errorMessage.includes('ECONNREFUSED')) {
      console.warn(`⚠️  Lighthouse connection refused for ${url} - Chrome may not be ready`);
    } else if (errorMessage.includes('Target closed') || errorMessage.includes('Protocol error')) {
      console.warn(`⚠️  Lighthouse target closed for ${url} - Chrome instance may have been terminated or crashed`);
    } else {
      console.warn(`⚠️  Lighthouse error for ${url}: ${errorMessage}`);
    }
    
    // Re-throw so caller can handle gracefully (scan continues without score)
    throw error;
  } finally {
    // Always close Chrome if it was launched (even on error)
    if (chrome) {
      try {
        await chrome.kill();
        console.log('✅ Lighthouse Chrome instance closed');
      } catch (killError) {
        // Ignore kill errors (Chrome may already be closed)
        console.warn('⚠️  Warning: Error killing Lighthouse Chrome:', killError instanceof Error ? killError.message : String(killError));
      }
    }
  }
};

