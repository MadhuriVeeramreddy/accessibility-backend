/**
 * Background Scan Processor (No Redis Required)
 * 
 * This replaces BullMQ with a simple background processing system.
 * Scans are processed asynchronously without blocking API responses.
 */

import prisma from '../db/prismaClient';
import { openPage } from '../services/browser.service';
import { runAxeScan } from '../services/axe.service';
import { runLighthouse } from '../services/lighthouse.service';
import { runGIGWChecks } from '../services/gigw.service';
import { generatePDF } from '../services/pdfGenerator';
import { incrementActiveScans, decrementActiveScans, isServerShuttingDown } from '../server';

interface ScanJob {
  scanId: string;
  websiteId: string;
  parentScanId?: string;
}

/**
 * Process a single scan in the background
 */
export async function processScan(job: ScanJob): Promise<void> {
  const { scanId, websiteId, parentScanId } = job;
  console.log('Processing scan', scanId);

  // Check if server is shutting down before starting scan
  if (isServerShuttingDown()) {
    console.log(`⚠️  Skipping scan ${scanId} - server is shutting down`);
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        status: 'failed',
        metaJson: {
          error: 'Server is shutting down',
          errorType: 'server_shutdown'
        } as any
      },
    });
    return;
  }

  // Track active scan for graceful shutdown
  incrementActiveScans();

  try {
    // Check again if server is shutting down (race condition check)
    if (isServerShuttingDown()) {
      throw new Error('Server is shutting down - scan cancelled');
    }

    // Update scan status to processing
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'processing' },
    });

    // Get scan details
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { website: true },
    });

    if (!scan || !scan.website) {
      throw new Error('Scan or website not found');
    }

    // Determine URL to scan
    const urlToScan = scan.pageUrl || scan.website.url;
    const cleanUrl = urlToScan.trim().replace(/\s+/g, '');
    console.log(`Scanning URL: ${cleanUrl}`);

    // Use standard browser service (Lighthouse needs its own browser instance)
    console.log(`Opening browser for ${cleanUrl}...`);
    let page, browser;
    try {
      const result = await openPage(cleanUrl);
      page = result.page;
      browser = result.browser;
      console.log('✅ Browser opened successfully');
    } catch (navError: unknown) {
      const navErrorMsg = navError instanceof Error ? navError.message : String(navError);
      if (navErrorMsg.includes('frame was detached') || navErrorMsg.includes('Navigation failed')) {
        console.error(`❌ Navigation failed for ${cleanUrl}: ${navErrorMsg}`);
        throw new Error(`Failed to navigate to ${cleanUrl}: Page was closed or detached. This may happen if the server is shutting down.`);
      }
      throw navError;
    }

    // ⚡ Run all scans in parallel: Axe, GIGW, and Lighthouse
    console.log(`Starting parallel scans for ${cleanUrl}...`);
    
    // Helper function to transform GIGW results
    const transformGIGWResults = (rawGigwResults: any) => {
      const allChecks = [
        'GIGW 3.0 - 4.1.1 Text Alternatives',
        'GIGW 3.0 - 4.1.2 Language Declaration',
        'GIGW 3.0 - 4.2.4 Form Labels',
        'GIGW 3.0 - 4.3.1 Auto-Refresh',
        'GIGW 3.0 - 4.2.1 Skip Navigation',
        'GIGW 3.0 - 4.2.1 Keyboard Access',
        'GIGW 3.0 - 4.1.3 Page Title',
        'GIGW 3.0 - 4.2.3 Focus Indicators'
      ];
      
      const violationDescriptions: Record<string, string> = {
        'GIGW 3.0 - 4.1.1 Text Alternatives': 'Images, form controls, and other non-text content must have text alternatives. This ensures screen reader users can access all information.',
        'GIGW 3.0 - 4.1.2 Language Declaration': 'Page must declare its language using the lang attribute. This helps screen readers pronounce content correctly.',
        'GIGW 3.0 - 4.2.4 Form Labels': 'All form inputs must have associated labels. This helps users understand what information is required in each field.',
        'GIGW 3.0 - 4.3.1 Auto-Refresh': 'Pages should not auto-refresh without warning. This can disorient users and interrupt screen reader announcements.',
        'GIGW 3.0 - 4.2.1 Skip Navigation': 'Page must provide a "Skip to main content" link. This allows keyboard users to bypass repetitive navigation links.',
        'GIGW 3.0 - 4.2.1 Keyboard Access': 'All functionality must be accessible via keyboard. This is essential for users who cannot use a mouse.',
        'GIGW 3.0 - 4.1.3 Page Title': 'Every page must have a descriptive title. This helps users understand where they are and navigate between pages.',
        'GIGW 3.0 - 4.2.3 Focus Indicators': 'Interactive elements must have visible focus indicators. This helps keyboard users see which element currently has focus.'
      };
      
      const details: Record<string, any> = {};
      const violations = (rawGigwResults.violations || []).map((v: any) => ({
        ...v,
        impact: violationDescriptions[v.rule] || v.impact || 'Accessibility guideline violation detected'
      }));
      
      allChecks.forEach(check => {
        const violation = violations.find((v: any) => v.rule === check);
        details[check] = {
          passed: !violation,
          severity: violation?.severity || 'none'
        };
      });
      
      return {
        passed: rawGigwResults.passed,
        passedChecks: rawGigwResults.passedChecks,
        totalChecks: rawGigwResults.totalChecks,
        violations: violations,
        details
      };
    };

    // Run all scans in parallel with error handling
    const [axeResults, rawGigwResults, score] = await Promise.all([
      // Axe scan
      (async () => {
        if (page.isClosed()) {
          throw new Error('Page was closed before Axe scan could complete');
        }
        console.log(`Running Axe scan on ${cleanUrl}...`);
        const results = await runAxeScan(page);
        console.log(`✅ Found ${results.violations.length} violations, ${results.issues.length} issues`);
        return results;
      })().catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Axe scan failed: ${errorMsg}`);
        if (errorMsg.includes('closed') || errorMsg.includes('Target closed')) {
          throw new Error('Browser page was closed during scan');
        }
        throw error;
      }),

      // GIGW checks
      (async () => {
        if (page.isClosed()) {
          console.warn('⚠️  Page closed before GIGW checks - skipping');
          return null;
        }
        console.log(`Running GIGW 3.0 compliance checks on ${cleanUrl}...`);
        const results = await runGIGWChecks(page);
        console.log(`✅ GIGW 3.0: ${results.passed ? 'PASSED' : 'FAILED'} (${results.passedChecks}/${results.totalChecks} checks)`);
        return results;
      })().catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('closed') || errorMsg.includes('Target closed')) {
          console.warn('⚠️  GIGW checks skipped - page was closed during scan');
          return null;
        }
        console.error('GIGW check failed:', errorMsg);
        return null;
      }),

      // Lighthouse (independent Chrome instance)
      runLighthouse(cleanUrl).catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('ECONNREFUSED')) {
          console.warn(`⚠️  Lighthouse connection refused for ${cleanUrl} - scan continues without score`);
        } else if (errorMsg.includes('Target closed') || errorMsg.includes('Protocol error')) {
          console.warn(`⚠️  Lighthouse target closed for ${cleanUrl} - scan continues without score`);
        } else {
          console.warn(`⚠️  Lighthouse failed for ${cleanUrl}: ${errorMsg} - scan continues without score`);
        }
        return null;
      })
    ]);

    // Transform GIGW results
    const gigwResults = rawGigwResults ? transformGIGWResults(rawGigwResults) : null;

    // Log Lighthouse score if available
    if (score !== null) {
      console.log(`✅ Lighthouse accessibility score: ${score}`);
    }

    // Close browser after all scans complete
    try {
      if (!page.isClosed()) {
        await page.close();
      }
      if (browser.isConnected()) {
        await browser.close();
      }
      console.log('✅ Browser closed successfully');
    } catch (closeError) {
      console.warn('⚠️  Warning: Error closing browser/page:', closeError instanceof Error ? closeError.message : String(closeError));
    }

    // ⚡ PERFORMANCE: Batch database operations
    await Promise.all([
      // Save issues
      axeResults.issues.length > 0
        ? prisma.issue.createMany({
            data: axeResults.issues.map((issue) => ({
              scanId,
              ruleId: issue.ruleId,
              severity: issue.severity,
              selector: issue.selector,
              snippet: issue.snippet,
              description: issue.description,
            })),
          })
        : Promise.resolve(),
      // Save scan results
      prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'completed',
          score,
          metaJson: {
            axe: axeResults.violations,
            gigw: gigwResults,
          } as any,
        },
      }),
    ]);

    // PDF generation is done on-demand when user requests GET /scan/{id}/pdf
    // This saves resources and ensures PDF is always fresh with latest data
    // Scan completes here - PDF will be generated when requested


    // Update parent scan progress if this is a child scan
    if (parentScanId) {
      const parentScan = await prisma.scan.findUnique({
        where: { id: parentScanId },
        include: { childScans: true },
      });

      if (parentScan) {
        const completedCount = parentScan.childScans.filter(
          (child) => child.status === 'completed'
        ).length;

        await prisma.scan.update({
          where: { id: parentScanId },
          data: {
            completedPages: completedCount,
            status:
              completedCount === parentScan.totalPages
                ? 'completed'
                : 'processing',
          },
        });
      }
    }

    console.log(`✅ Scan ${scanId} completed successfully`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log detailed error information
    console.error(`❌ Scan ${scanId} failed:`);
    console.error(`   Error: ${errorMessage}`);
    if (errorStack) {
      console.error(`   Stack: ${errorStack.split('\n').slice(0, 3).join('\n')}`);
    }
    
    // Check if it's a browser/page closure error
    if (errorMessage.includes('Target closed') || errorMessage.includes('Session closed') || errorMessage.includes('closed')) {
      console.error('   Reason: Browser/page was closed during scan');
      console.error('   This may happen if the server is shutting down or browser pool is being closed');
    } else if (errorMessage.includes('Navigating frame was detached') || errorMessage.includes('frame was detached')) {
      console.error('   Reason: Page frame was detached during navigation');
      console.error('   This may happen if the page navigated away or was closed during navigation');
    } else if (errorMessage.includes('timeout')) {
      console.error('   Reason: Operation timed out');
    } else if (errorMessage.includes('ECONNREFUSED')) {
      console.error('   Reason: Connection refused - browser may not be ready');
    } else {
      console.error('   Reason: Unknown error during scan processing');
    }
    
    // Update scan status to failed
    try {
      await prisma.scan.update({
        where: { id: scanId },
        data: { 
          status: 'failed',
          metaJson: {
            error: errorMessage,
            errorType: errorMessage.includes('Target closed') || errorMessage.includes('Session closed') ? 'browser_closed' : 
                      errorMessage.includes('Navigating frame was detached') || errorMessage.includes('frame was detached') ? 'frame_detached' :
                      errorMessage.includes('timeout') ? 'timeout' :
                      errorMessage.includes('ECONNREFUSED') ? 'connection_refused' : 'unknown'
          } as any
        },
      });
    } catch (updateError) {
      console.error('   Failed to update scan status:', updateError);
    }
    
    // Don't re-throw - error is logged and scan is marked as failed
    // This prevents unhandled promise rejections
  } finally {
    // Always decrement active scans counter
    decrementActiveScans();
  }
}

/**
 * Generate PDF in background (async, non-blocking)
 * PDF is generated after scan completes, doesn't block scan completion
 * PDF is generated but not stored - user requests it on-demand
 */
async function generatePDFInBackground(
  scan: any,
  issues: any[],
  gigwResults: any,
  score: number | null
): Promise<void> {
  try {
    console.log(`📄 Starting background PDF generation for scan ${scan.id}...`);
    
    // Note: PDF is generated but not stored
    // When user requests GET /scan/{id}/pdf, it will be generated on-demand
    // This background generation is optional - can be removed if not needed
    // For now, we rely on on-demand generation when user requests PDF
    
    console.log(`✅ PDF will be generated on-demand when requested for scan ${scan.id}`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`⚠️  PDF generation setup failed for scan ${scan.id}:`, errorMsg);
    // Don't throw - PDF generation failure doesn't affect scan
  }
}

/**
 * Add a scan job and process it in the background
 * This replaces scanQueue.add()
 */
export function addScanJob(job: ScanJob): void {
  // Process in background (non-blocking)
  processScan(job).catch((error) => {
    console.error(`Background scan ${job.scanId} failed:`, error);
  });
}

/**
 * Process multiple scans with concurrency limit
 */
export async function processScansWithLimit(jobs: ScanJob[], limit: number = 3): Promise<void> {
  const results: Promise<void>[] = [];
  
  for (let i = 0; i < jobs.length; i += limit) {
    const batch = jobs.slice(i, i + limit);
    const batchPromises = batch.map(job => processScan(job));
    results.push(...batchPromises);
    
    // Wait for current batch before starting next
    await Promise.allSettled(batchPromises);
  }
  
  await Promise.allSettled(results);
}
