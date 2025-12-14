import { Page } from 'puppeteer';

/**
 * Screenshot Service
 * Captures screenshots of elements with accessibility issues
 */

interface ScreenshotOptions {
  selector: string;
  padding?: number;
}

/**
 * Capture a screenshot of a specific element on the page
 * Returns base64 encoded image data URL
 */
export const captureElementScreenshot = async (
  page: Page,
  selector: string
): Promise<string | null> => {
  try {
    // Try to find the element
    const element = await page.$(selector);
    
    if (!element) {
      console.warn(`Element not found for screenshot: ${selector}`);
      return null;
    }

    // Get element bounding box
    const boundingBox = await element.boundingBox();
    
    if (!boundingBox) {
      console.warn(`Could not get bounding box for: ${selector}`);
      return null;
    }

    // Add padding around the element
    const padding = 10;
    const clip = {
      x: Math.max(0, boundingBox.x - padding),
      y: Math.max(0, boundingBox.y - padding),
      width: boundingBox.width + (padding * 2),
      height: boundingBox.height + (padding * 2),
    };

    // Capture screenshot with clipping
    const screenshot = await page.screenshot({
      type: 'png',
      clip,
      encoding: 'base64',
    });

    // Return as data URL for embedding in PDF
    return `data:image/png;base64,${screenshot}`;
  } catch (error) {
    console.error(`Failed to capture screenshot for ${selector}:`, error);
    return null;
  }
};

/**
 * Capture screenshots for multiple issues
 * Returns a map of selector -> screenshot data URL
 */
export const captureIssueScreenshots = async (
  page: Page,
  issues: Array<{ selector: string | null; ruleId: string }>
): Promise<Map<string, string>> => {
  const screenshots = new Map<string, string>();
  
  // Limit to first 10 issues to avoid excessive processing time
  const limitedIssues = issues.slice(0, 10);
  
  for (const issue of limitedIssues) {
    if (!issue.selector) {
      continue;
    }

    try {
      const screenshot = await captureElementScreenshot(page, issue.selector);
      if (screenshot) {
        screenshots.set(issue.selector, screenshot);
      }
    } catch (error) {
      console.error(`Failed to capture screenshot for ${issue.ruleId}:`, error);
    }
  }

  return screenshots;
};

/**
 * Capture a full page screenshot
 * Useful as fallback when element screenshots fail
 */
export const captureFullPageScreenshot = async (page: Page): Promise<string | null> => {
  try {
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64',
    });

    return `data:image/png;base64,${screenshot}`;
  } catch (error) {
    console.error('Failed to capture full page screenshot:', error);
    return null;
  }
};

