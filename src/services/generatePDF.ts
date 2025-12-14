/**
 * Premium PDF Generation Service
 * Generates WCAG 2.1 AA + IS 17802 + RPWD compliant accessibility reports
 */

import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import * as ejs from 'ejs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

// Import utilities
import { enrichIssues, calculateWCAGConformance, groupIssuesByWCAGCategory } from '../utils/wcag-categorizer';
import {
  groupIssues,
  calculateSeverityBreakdown,
  calculateBusinessRisk,
  calculateIndiaComplianceStatus,
  getSectorType,
  getSectorGuidance,
  isGovernmentSite,
  groupIssuesBySeverity
} from '../utils/issue-grouper';
import { sanitizeHtmlForPdf } from '../utils/pdf-sanitizer';
import { GIGWResults } from '../utils/gigw';

/**
 * Input data for PDF generation
 */
export interface PDFGenerationData {
  website: {
    url: string;
    name?: string | null;
  };
  pageUrl?: string;
  score: number | null;
  issues: Array<{
    ruleId: string;
    severity: string;
    selector: string | null;
    description: string;
    snippet: string | null;
  }>;
  gigwResults?: GIGWResults | null;
  scanDate: string;
  scanId: string;
  brandName: string;
  dashboardUrl: string;
}

/**
 * Get Chrome executable path
 */
function getChromePath(): string | undefined {
  const cacheDir = join(homedir(), '.cache', 'puppeteer', 'chrome');
  
  const possiblePaths = [
    join(cacheDir, 'mac-143.0.7499.40/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    join(cacheDir, 'mac_arm-143.0.7499.40/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    join(cacheDir, 'mac-121.0.6167.85/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return undefined;
}

/**
 * Main PDF generation function
 */
export async function generatePDF(data: PDFGenerationData): Promise<Buffer> {
  console.log('🔄 Starting PDF generation...');
  
  try {
    // Enrich issues with additional context
    const enrichedIssues = enrichIssues(data.issues);
    console.log(`📊 Enriched ${enrichedIssues.length} issues`);
    
    // Group and analyze issues
    const groupedIssues = groupIssues(enrichedIssues);
    const severityBreakdown = calculateSeverityBreakdown(enrichedIssues);
    const issuesBySeverity = groupIssuesBySeverity(groupedIssues);
    
    // Calculate business context
    const businessRisk = calculateBusinessRisk(severityBreakdown);
    const sectorType = getSectorType(data.website.url);
    const isGovern = isGovernmentSite(data.website.url);
    const sectorGuidance = getSectorGuidance(data.website.url);
    const indiaComplianceStatus = calculateIndiaComplianceStatus(severityBreakdown, isGovern);
    
    // Calculate WCAG conformance
    const wcagConformance = calculateWCAGConformance(enrichedIssues);
    const wcagCategories = groupIssuesByWCAGCategory(enrichedIssues);
    
    console.log(`📈 Business Risk: ${businessRisk.level}, Sector: ${sectorType}`);
    
    // Prepare template data
    const templateData = {
      website: data.website,
      pageUrl: data.pageUrl,
      score: data.score,
      issues: enrichedIssues,
      issuesCount: enrichedIssues.length,
      issuesBySeverity,
      severityBreakdown,
      groupedIssues,
      businessRisk,
      indiaComplianceStatus,
      sectorGuidance,
      sectorType,
      isGovernment: isGovern,
      wcagConformance,
      wcagCategories,
      gigwResults: data.gigwResults,
      scanDate: data.scanDate,
      brandName: data.brandName,
      dashboardUrl: data.dashboardUrl,
      scanId: data.scanId,
    };
    
    // Render HTML from template
    console.log('🎨 Rendering HTML template...');
    const templatePath = join(__dirname, '../../templates/report.ejs');
    const html = await ejs.renderFile(templatePath, templateData);
    console.log(`✅ Template rendered: ${(html.length / 1024).toFixed(0)} KB`);
    
    // Sanitize HTML for PDF generation
    const sanitizedHtml = sanitizeHtmlForPdf(html);
    console.log('🧹 HTML sanitized for PDF generation');
    
    // Generate PDF using multiple strategies
    return await generatePDFWithStrategies(sanitizedHtml);
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw error;
  }
}

/**
 * Generate PDF with multiple fallback strategies
 */
async function generatePDFWithStrategies(html: string): Promise<Buffer> {
  const strategies = [
    { name: 'Full Quality', fn: generateFullQualityPDF },
    { name: 'Simplified', fn: generateSimplifiedPDF },
    { name: 'Basic Fallback', fn: generateBasicPDF }
  ];
  
  for (const strategy of strategies) {
    try {
      console.log(`📄 Trying strategy: ${strategy.name}...`);
      const pdfBuffer = await strategy.fn(html);
      console.log(`✅ PDF generated successfully with ${strategy.name}: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
      return pdfBuffer;
    } catch (error) {
      console.log(`⚠️  ${strategy.name} strategy failed:`, error instanceof Error ? error.message : String(error));
      if (strategy === strategies[strategies.length - 1]) {
        throw error;
      }
    }
  }
  
  throw new Error('All PDF generation strategies failed');
}

/**
 * Strategy 1: Full Quality PDF with all features
 */
async function generateFullQualityPDF(html: string): Promise<Buffer> {
  const chromePath = getChromePath();
  const browser: Browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--font-render-hinting=none'
    ],
  });

  try {
    const page: Page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Emulate print media
    await page.emulateMediaType('print');
    
    // Load HTML content
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    
    // Wait for fonts and images to load
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // PDF options
    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    };
    
    const pdfData = await page.pdf(pdfOptions);
    await browser.close();
    
    return Buffer.from(pdfData);
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}

/**
 * Strategy 2: Simplified PDF with reduced features
 */
async function generateSimplifiedPDF(html: string): Promise<Buffer> {
  const chromePath = getChromePath();
  const browser: Browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page: Page = await browser.newPage();
    
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    
    await browser.close();
    return Buffer.from(pdfData);
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}

/**
 * Strategy 3: Basic fallback PDF
 */
async function generateBasicPDF(html: string): Promise<Buffer> {
  const chromePath = getChromePath();
  const browser: Browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox'],
  });

  try {
    const page: Page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    
    await browser.close();
    return Buffer.from(pdfData);
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}
