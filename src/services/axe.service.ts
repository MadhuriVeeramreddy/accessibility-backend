import { Page } from 'puppeteer';

// Issue data structure
export interface IssueData {
  ruleId: string;
  severity: string;
  selector: string | null;
  snippet: string | null;
  description: string;
}

// Run axe accessibility scan on a page
export const runAxeScan = async (page: Page) => {
  // Check if page is still open
  if (page.isClosed()) {
    throw new Error('Page was closed before Axe scan could complete');
  }

  try {
    // Inject axe-core script
    await page.addScriptTag({
      path: require.resolve('axe-core'),
    });

    // Check again before evaluate
    if (page.isClosed()) {
      throw new Error('Page was closed during Axe script injection');
    }

    // Run axe analysis
    const results = await page.evaluate(async () => {
      // @ts-ignore - axe is injected at runtime
      return await axe.run();
    });

  // Map violations to issues
  const issues: IssueData[] = [];
  for (const violation of results.violations) {
    // Map each node in the violation
    for (const node of violation.nodes) {
      issues.push({
        ruleId: violation.id,
        severity: violation.impact || 'moderate',
        selector: node.target?.[0] || null,
        snippet: node.html || null,
        description: violation.description || violation.help || '',
      });
    }
  }

    return {
      violations: results.violations,
      issues,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle closed page errors gracefully
    if (errorMessage.includes('Target closed') || errorMessage.includes('Session closed') || page.isClosed()) {
      throw new Error('Page was closed during Axe scan - scan may have been interrupted');
    }
    
    throw error;
  }
};

