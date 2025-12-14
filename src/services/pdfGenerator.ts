import puppeteer, { Browser, Page } from 'puppeteer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { renderTemplate } from '../utils/templateRenderer';

/**
 * PDF Generator Options
 */
interface PDFGeneratorOptions {
  outputDir?: string;
  fileName?: string;
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
 * PDF Data interface
 */
interface PDFData {
  website: {
    url: string;
    name?: string;
  };
  pageUrl?: string;
  score: number | null;
  issues: Array<{
    ruleId: string;
    severity: string;
    selector?: string;
    description: string;
    snippet?: string;
  }>;
  gigwResults?: {
    passed: boolean;
    passedChecks: number;
    totalChecks: number;
    violations?: Array<{
      rule: string;
      severity?: string;
      impact?: string;
    }>;
    details?: Record<string, any>;
  };
  scanDate: string;
  scanId: string;
  brandName: string;
  dashboardUrl: string;
}

/**
 * Generate PDF from HTML template
 * This is the main export that scanWorker expects
 */
export async function generatePDF(data?: PDFData): Promise<Buffer> {
  console.log('🔄 Starting PDF generation...');
  
  // Prepare template data
  const issuesBySeverity = {
    critical: data?.issues.filter(i => i.severity === 'critical').length || 0,
    serious: data?.issues.filter(i => i.severity === 'serious').length || 0,
    moderate: data?.issues.filter(i => i.severity === 'moderate').length || 0,
    minor: data?.issues.filter(i => i.severity === 'minor').length || 0,
  };
  
  const totalIssues = data?.issues.length || 0;
  const score = data?.score || 0;
  const websiteUrl = data?.pageUrl || data?.website.url || 'N/A';
  const websiteName = data?.website.name || websiteUrl;
  
  // Process GIGW results
  const gigwStatus = data?.gigwResults?.passed ? 'PASSED' : 'FAILED';
  const gigwPassed = data?.gigwResults?.passedChecks || 0;
  const gigwTotal = data?.gigwResults?.totalChecks || 8;
  const gigwViolations = data?.gigwResults?.violations?.map(v => ({
    rule: v.rule,
    description: v.impact || v.severity || 'Accessibility issue detected that requires attention'
  })) || [];
  
  const templateData = {
    websiteUrl,
    websiteName,
    scanDate: data?.scanDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    scanId: data?.scanId || 'N/A',
    score,
    totalIssues,
    criticalCount: issuesBySeverity.critical,
    seriousCount: issuesBySeverity.serious,
    moderateCount: issuesBySeverity.moderate,
    minorCount: issuesBySeverity.minor,
    businessRisk: '', // Will be calculated by renderTemplate
    businessRiskDescription: '', // Will be calculated by renderTemplate
    gigwStatus,
    gigwPassed,
    gigwTotal,
    gigwViolations,
    dashboardUrl: data?.dashboardUrl || 'https://accessiscan.com/dashboard',
    issues: data?.issues || [],
  };
  
  const chromePath = getChromePath();
  const browser: Browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page: Page = await browser.newPage();
    
    // Render template with colors, icons, and data
    console.log('🎨 Rendering HTML template...');
    const htmlContent = renderTemplate(templateData);
    console.log(`✅ Template rendered: ${(htmlContent.length / 1024).toFixed(0)} KB`);
    console.log(`📊 Data: ${score} score, ${totalIssues} issues (C:${issuesBySeverity.critical} S:${issuesBySeverity.serious} M:${issuesBySeverity.moderate} m:${issuesBySeverity.minor})`);
    
    // Set content with HTML template - ensure UTF-8 encoding for emoji icons
    console.log('📝 Loading HTML content into page...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for fonts to load
    console.log('⏳ Waiting for fonts and page to stabilize...');
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });
    
    const pdfBuffer = Buffer.from(pdfData);
    console.log(`✅ PDF generated successfully: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
    
    await browser.close();
    console.log('🧹 Browser closed');
    
    return pdfBuffer;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    await browser.close().catch(() => {});
    throw error;
  }
}

/**
 * PDF Generator Class (for backward compatibility)
 */
export class PDFGenerator {
  private outputDir: string;
  private fileName: string;
  
  constructor(options: PDFGeneratorOptions = {}) {
    this.outputDir = options.outputDir || join(process.cwd(), 'output');
    this.fileName = options.fileName || 'Accessibility_Audit_Report.pdf';
  }
  
  /**
   * Generate PDF and save to file
   */
  async generate(): Promise<string> {
    console.log('Starting PDF generation...');
    
    const pdfBuffer = await generatePDF();
    
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Save PDF to file
    const outputPath = join(this.outputDir, this.fileName);
    const fs = require('fs');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✅ PDF saved to: ${outputPath}`);
    return outputPath;
  }
}

export default generatePDF;
