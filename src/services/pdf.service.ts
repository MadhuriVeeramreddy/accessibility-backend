import puppeteer, { Browser, Page } from 'puppeteer';
import * as ejs from 'ejs';
import { join } from 'path';

interface PDFData {
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
  gigwResults: {
    passed: boolean;
    passedChecks: number;
    totalChecks: number;
    details?: Record<string, any>;
  } | null;
  scanDate: string;
  scanId: string;
  brandName: string;
  dashboardUrl: string;
}

import { getChromePath } from '../utils/chromePath';

export async function generatePDF(data: PDFData): Promise<Buffer> {
  console.log('🔄 Starting PDF generation process...');
  
  // Group issues by severity
  const criticalIssues = data.issues.filter(i => i.severity === 'critical');
  const seriousIssues = data.issues.filter(i => i.severity === 'serious');
  const moderateIssues = data.issues.filter(i => i.severity === 'moderate');
  const minorIssues = data.issues.filter(i => i.severity === 'minor');

  console.log(`📊 Processing ${data.issues.length} issues across 4 severity levels`);

  // Group issues by rule ID for summary
  const issueGroups = new Map<string, { count: number; description: string; severity: string }>();
  data.issues.forEach(issue => {
    if (!issueGroups.has(issue.ruleId)) {
      issueGroups.set(issue.ruleId, {
        count: 1,
        description: issue.description,
        severity: issue.severity
      });
    } else {
      issueGroups.get(issue.ruleId)!.count++;
    }
  });

  const groupedIssues = {
    critical: Array.from(issueGroups.entries()).filter(([, data]) => data.severity === 'critical'),
    serious: Array.from(issueGroups.entries()).filter(([, data]) => data.severity === 'serious'),
    moderate: Array.from(issueGroups.entries()).filter(([, data]) => data.severity === 'moderate'),
    minor: Array.from(issueGroups.entries()).filter(([, data]) => data.severity === 'minor'),
  };

  // Generate HTML content using template
  console.log('🎨 Rendering HTML template with data...');
  const html = await generateHTMLTemplate({
    ...data,
    issueStats: {
      total: data.issues.length,
      critical: criticalIssues.length,
      serious: seriousIssues.length,
      moderate: moderateIssues.length,
      minor: minorIssues.length,
    },
    groupedIssues,
    scoreColor: getScoreColor(data.score),
    scoreLabel: getScoreLabel(data.score),
    impactAssessment: getImpactAssessment(data.score, data.issues.length, criticalIssues.length),
  });

  console.log(`✅ HTML rendered: ${(html.length / 1024).toFixed(0)}KB`);

  // Generate PDF from HTML using Puppeteer
  let browser: Browser | null = null;
  try {
    // Ensure PUPPETEER_CACHE_DIR is set for Render
    const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
    if (isRender && !process.env.PUPPETEER_CACHE_DIR) {
      process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
    }
    
    console.log('🌐 Launching headless Chrome browser...');
    const chromePath = getChromePath();
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    };
    
    // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
    if (chromePath) {
      launchOptions.executablePath = chromePath;
      console.log(`   Using Chrome at: ${chromePath}`);
    } else {
      console.log(`   Chrome path not found, PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || 'not set'}`);
    }
    
    browser = await puppeteer.launch(launchOptions);

    console.log('📄 Configuring page for PDF generation...');
    const page: Page = await browser.newPage();
    
    console.log('📝 Loading HTML content into page...');
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    console.log('⏳ Waiting for page to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give page time to render

    console.log('📄 Generating PDF...');
    
    // Try standard PDF generation first
    let pdfBuffer: Buffer;
    try {
      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: false,
      });
      pdfBuffer = Buffer.from(pdfData);
      console.log(`✅ PDF generated: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
    } catch (pdfError) {
      console.log('  ⚠️ Standard PDF failed, trying CDP method...');
      // Fallback: Use Chrome DevTools Protocol directly
      const client = await page.target().createCDPSession();
      const { data } = await client.send('Page.printToPDF', {
        printBackground: true,
        marginTop: 0.5,
        marginBottom: 0.5,
        marginLeft: 0.5,
        marginRight: 0.5,
      });
      pdfBuffer = Buffer.from(data, 'base64');
      console.log(`✅ CDP PDF generated: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
    }

    console.log('🧹 Browser closed');
    await browser.close();
    
    return pdfBuffer;
  } catch (error) {
    console.error('❌ PDF generation failed:', error instanceof Error ? error.message : String(error));
    
    if (browser) {
      await browser.close().catch(() => {});
    }

    // Fallback: Generate a simpler PDF
    console.log('🔄 Attempting fallback PDF generation...');
    return await generateFallbackPDF(data, html);
  }
}

async function generateFallbackPDF(data: PDFData, html: string): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    // Ensure PUPPETEER_CACHE_DIR is set for Render
    const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;
    if (isRender && !process.env.PUPPETEER_CACHE_DIR) {
      process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
    }
    
    const chromePath = getChromePath();
    const launchOptions: any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };
    
    // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    const pdfBuffer = Buffer.from(pdfData);

    await browser.close();
    console.log(`✅ Fallback PDF generated: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
    return pdfBuffer;
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw new Error(`Fallback PDF generation also failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function generateHTMLTemplate(data: any): Promise<string> {
  const template = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report - <%= website.name || website.url %></title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1F2937;
      background: #ffffff;
    }

    .page {
      page-break-after: always;
      padding: 20px;
      min-height: 100vh;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 100vh;
    }

    .brand-title {
      font-size: 42px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 18px;
      color: #6B7280;
      margin-bottom: 40px;
    }

    .divider {
      width: 300px;
      height: 3px;
      background: linear-gradient(to right, #3B82F6, #8B5CF6);
      margin: 30px auto;
    }

    .info-box {
      background: #F3F4F6;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      padding: 30px;
      margin: 40px 0;
      text-align: left;
      max-width: 600px;
    }

    .info-label {
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 5px;
      font-size: 13px;
    }

    .info-value {
      color: #374151;
      margin-bottom: 20px;
      word-break: break-all;
    }

    .score-circle {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 40px auto;
      font-size: 48px;
      font-weight: 700;
      color: white;
    }

    .score-label {
      font-size: 14px;
      color: #6B7280;
      margin-top: 10px;
    }

    /* Section Headers */
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3B82F6;
    }

    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 25px 0 15px 0;
    }

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 20px 0 10px 0;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 30px 0;
    }

    .stat-box {
      background: white;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 11px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Issue Cards */
    .issue-card {
      background: white;
      border: 1px solid #E5E7EB;
      border-left: 4px solid #3B82F6;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }

    .issue-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      gap: 10px;
    }

    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: white;
      letter-spacing: 0.5px;
    }

    .severity-critical { background: #DC2626; border-left-color: #DC2626; }
    .severity-serious { background: #EA580C; border-left-color: #EA580C; }
    .severity-moderate { background: #F59E0B; border-left-color: #F59E0B; }
    .severity-minor { background: #3B82F6; border-left-color: #3B82F6; }

    .issue-count {
      background: #374151;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }

    .issue-title {
      font-weight: 600;
      color: #1F2937;
      font-size: 12px;
    }

    .issue-description {
      color: #6B7280;
      font-size: 10px;
      line-height: 1.5;
      margin-top: 8px;
    }

    .issue-selector {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      padding: 8px;
      margin-top: 10px;
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #374151;
      overflow-wrap: break-word;
    }

    /* GIGW Checks */
    .check-item {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
      page-break-inside: avoid;
    }

    .check-icon {
      font-size: 18px;
      font-weight: 700;
    }

    .check-icon.pass { color: #059669; }
    .check-icon.fail { color: #DC2626; }

    .check-name {
      flex: 1;
      font-size: 11px;
      color: #1F2937;
    }

    /* Status Box */
    .status-box {
      background: white;
      border: 3px solid;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }

    .status-box.pass {
      border-color: #059669;
      background: #D1FAE5;
    }

    .status-box.fail {
      border-color: #DC2626;
      background: #FEE2E2;
    }

    .status-title {
      font-size: 16px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 10px;
    }

    .status-value {
      font-size: 24px;
      font-weight: 700;
      margin: 10px 0;
    }

    .status-value.pass { color: #059669; }
    .status-value.fail { color: #DC2626; }

    /* Recommendations */
    .recommendation {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 12px;
      display: flex;
      gap: 15px;
      page-break-inside: avoid;
    }

    .rec-number {
      width: 30px;
      height: 30px;
      background: #3B82F6;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .rec-content {
      flex: 1;
    }

    .rec-title {
      font-weight: 700;
      color: #1F2937;
      font-size: 12px;
      margin-bottom: 5px;
    }

    .rec-description {
      color: #6B7280;
      font-size: 10px;
      line-height: 1.5;
    }

    /* WCAG Principles */
    .principle-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }

    .principle-title {
      font-size: 14px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }

    .principle-icon {
      font-size: 20px;
      margin-right: 8px;
    }

    .principle-desc {
      font-size: 10px;
      color: #6B7280;
      line-height: 1.5;
    }

    /* Footer */
    .footer {
      position: fixed;
      bottom: 10px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9px;
      color: #9CA3AF;
    }

    /* Utilities */
    .text-center { text-align: center; }
    .text-gray { color: #6B7280; }
    .mb-2 { margin-bottom: 20px; }
    .mt-2 { margin-top: 20px; }
    
    @media print {
      .page {
        page-break-after: always;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover-page">
    <div class="brand-title"><%= brandName %></div>
    <div class="subtitle">Web Accessibility Compliance Report</div>
    
    <div class="divider"></div>
    
    <div class="info-box">
      <div class="info-label">Website</div>
      <div class="info-value"><%= website.name || website.url %></div>
      
      <div class="info-label">URL</div>
      <div class="info-value"><%= website.url %></div>
      
      <div class="info-label">Scan Date</div>
      <div class="info-value"><%= scanDate %></div>
    </div>

    <% if (score !== null) { %>
    <div>
      <h2>Accessibility Score</h2>
      <div class="score-circle" style="background: <%= scoreColor %>;">
        <%= Math.round(score) %>
      </div>
      <div class="score-label"><%= scoreLabel %></div>
    </div>
    <% } %>

    <div style="margin-top: 50px; color: #9CA3AF; font-size: 11px;">
      Scan ID: <%= scanId %>
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="page">
    <h1>Executive Summary</h1>
    
    <p style="color: #374151; line-height: 1.8; margin-bottom: 20px;">
      This report provides a comprehensive analysis of the accessibility compliance for 
      <strong><%= website.name || website.url %></strong>. The scan was conducted on 
      <strong><%= scanDate %></strong> using industry-standard tools including Axe-core and Lighthouse.
    </p>

    <h2>Key Findings</h2>
    
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value" style="color: #6B7280;"><%= issueStats.total %></div>
        <div class="stat-label">Total Issues</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="color: #DC2626;"><%= issueStats.critical %></div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="color: #EA580C;"><%= issueStats.serious %></div>
        <div class="stat-label">Serious</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="color: #F59E0B;"><%= issueStats.moderate %></div>
        <div class="stat-label">Moderate</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value" style="color: #3B82F6;"><%= issueStats.minor %></div>
        <div class="stat-label">Minor</div>
      </div>
      <% if (score !== null) { %>
      <div class="stat-box">
        <div class="stat-value" style="color: <%= scoreColor %>;"><%= Math.round(score) %></div>
        <div class="stat-label">Lighthouse Score</div>
      </div>
      <% } %>
      <% if (gigwResults) { %>
      <div class="stat-box">
        <div class="stat-value" style="color: <%= gigwResults.passed ? '#059669' : '#DC2626' %>;">
          <%= gigwResults.passed ? 'PASS' : 'FAIL' %>
        </div>
        <div class="stat-label">GIGW 3.0</div>
      </div>
      <% } %>
    </div>

    <h2>Impact Assessment</h2>
    <p style="color: #374151; line-height: 1.8;">
      <%= impactAssessment %>
    </p>
  </div>

  <!-- Compliance Overview -->
  <div class="page">
    <h1>Compliance Overview</h1>
    
    <h2>WCAG 2.1 Level AA Compliance</h2>
    <p style="color: #374151; line-height: 1.8; margin-bottom: 25px;">
      Web Content Accessibility Guidelines (WCAG) 2.1 provides a comprehensive set of recommendations 
      for making web content more accessible. This scan evaluates compliance against Level AA standards.
    </p>

    <h3>WCAG Principles</h3>

    <div class="principle-box">
      <div class="principle-title">
        <span class="principle-icon">👁️</span>Perceivable
      </div>
      <div class="principle-desc">
        Information and user interface components must be presentable to users in ways they can perceive.
      </div>
    </div>

    <div class="principle-box">
      <div class="principle-title">
        <span class="principle-icon">⌨️</span>Operable
      </div>
      <div class="principle-desc">
        User interface components and navigation must be operable by all users.
      </div>
    </div>

    <div class="principle-box">
      <div class="principle-title">
        <span class="principle-icon">💭</span>Understandable
      </div>
      <div class="principle-desc">
        Information and operation of user interface must be understandable.
      </div>
    </div>

    <div class="principle-box">
      <div class="principle-title">
        <span class="principle-icon">🔧</span>Robust
      </div>
      <div class="principle-desc">
        Content must be robust enough to be interpreted by a wide variety of user agents.
      </div>
    </div>

    <h3>Standards & Testing Tools</h3>
    <ul style="color: #374151; line-height: 2; margin-left: 20px;">
      <li>WCAG 2.1 Level AA</li>
      <li>Axe-core Accessibility Engine</li>
      <li>Google Lighthouse Accessibility Audit</li>
      <li>GIGW 3.0 (Government of India Guidelines)</li>
    </ul>
  </div>

  <!-- GIGW Compliance -->
  <% if (gigwResults) { %>
  <div class="page">
    <h1>GIGW 3.0 Compliance</h1>
    
    <p style="color: #374151; line-height: 1.8; margin-bottom: 25px;">
      Guidelines for Indian Government Websites (GIGW) 3.0 are mandatory standards for Indian government websites. 
      These guidelines ensure accessibility, usability, and compliance with Indian regulations.
    </p>

    <div class="status-box <%= gigwResults.passed ? 'pass' : 'fail' %>">
      <div class="status-title">Compliance Status</div>
      <div class="status-value <%= gigwResults.passed ? 'pass' : 'fail' %>">
        <%= gigwResults.passed ? 'PASSED ✓' : 'FAILED ✗' %>
      </div>
      <div style="color: #374151; margin-top: 10px;">
        <%= gigwResults.passedChecks %> of <%= gigwResults.totalChecks %> checks passed
      </div>
    </div>

    <h2>Detailed Checks</h2>
    <% if (gigwResults.details && Object.keys(gigwResults.details).length > 0) { %>
      <% Object.entries(gigwResults.details).forEach(([key, value]) => { 
        const isPassed = value.passed || value === true;
      %>
      <div class="check-item">
        <div class="check-icon <%= isPassed ? 'pass' : 'fail' %>">
          <%= isPassed ? '✓' : '✗' %>
        </div>
        <div class="check-name">
          <%= key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim() %>
        </div>
      </div>
      <% }); %>
    <% } else { %>
      <p style="color: #6B7280; font-style: italic;">No detailed check information available.</p>
    <% } %>
  </div>
  <% } %>

  <!-- Issues by Severity -->
  <% if (issueStats.critical > 0) { %>
  <div class="page">
    <h1>Critical Issues</h1>
    <p style="color: #6B7280; margin-bottom: 20px;">
      Found <%= issueStats.critical %> critical issues that need immediate attention.
    </p>

    <% groupedIssues.critical.forEach(([ruleId, data]) => { %>
    <div class="issue-card severity-critical">
      <div class="issue-header">
        <span class="severity-badge severity-critical">Critical</span>
        <span class="issue-count">×<%= data.count %></span>
        <span class="issue-title"><%= ruleId %></span>
      </div>
      <div class="issue-description"><%= data.description %></div>
    </div>
    <% }); %>
  </div>
  <% } %>

  <% if (issueStats.serious > 0) { %>
  <div class="page">
    <h1>Serious Issues</h1>
    <p style="color: #6B7280; margin-bottom: 20px;">
      Found <%= issueStats.serious %> serious issues that need attention.
    </p>

    <% groupedIssues.serious.forEach(([ruleId, data]) => { %>
    <div class="issue-card severity-serious">
      <div class="issue-header">
        <span class="severity-badge severity-serious">Serious</span>
        <span class="issue-count">×<%= data.count %></span>
        <span class="issue-title"><%= ruleId %></span>
      </div>
      <div class="issue-description"><%= data.description %></div>
    </div>
    <% }); %>
  </div>
  <% } %>

  <% if (issueStats.moderate > 0) { %>
  <div class="page">
    <h1>Moderate Issues</h1>
    <p style="color: #6B7280; margin-bottom: 20px;">
      Found <%= issueStats.moderate %> moderate issues.
    </p>

    <% groupedIssues.moderate.forEach(([ruleId, data]) => { %>
    <div class="issue-card severity-moderate">
      <div class="issue-header">
        <span class="severity-badge severity-moderate">Moderate</span>
        <span class="issue-count">×<%= data.count %></span>
        <span class="issue-title"><%= ruleId %></span>
      </div>
      <div class="issue-description"><%= data.description %></div>
    </div>
    <% }); %>
  </div>
  <% } %>

  <% if (issueStats.minor > 0) { %>
  <div class="page">
    <h1>Minor Issues</h1>
    <p style="color: #6B7280; margin-bottom: 20px;">
      Found <%= issueStats.minor %> minor issues.
    </p>

    <% groupedIssues.minor.forEach(([ruleId, data]) => { %>
    <div class="issue-card severity-minor">
      <div class="issue-header">
        <span class="severity-badge severity-minor">Minor</span>
        <span class="issue-count">×<%= data.count %></span>
        <span class="issue-title"><%= ruleId %></span>
      </div>
      <div class="issue-description"><%= data.description %></div>
    </div>
    <% }); %>
  </div>
  <% } %>

  <!-- Detailed Issues -->
  <div class="page">
    <h1>Detailed Issues</h1>
    <p style="color: #6B7280; margin-bottom: 20px;">
      Complete list of all accessibility issues found during the scan.
    </p>

    <% issues.slice(0, 10).forEach((issue, index) => { %>
    <div class="issue-card severity-<%= issue.severity %>">
      <div class="issue-header">
        <span style="color: #6B7280; font-size: 10px; font-weight: 700;">Issue #<%= index + 1 %></span>
        <span class="severity-badge severity-<%= issue.severity %>"><%= issue.severity %></span>
        <span class="issue-title"><%= issue.ruleId %></span>
      </div>
      <div class="issue-description"><%= issue.description %></div>
      <% if (issue.selector) { %>
      <div class="issue-selector">
        <strong>Selector:</strong> <%= issue.selector.length > 100 ? issue.selector.substring(0, 100) + '...' : issue.selector %>
      </div>
      <% } %>
    </div>
    <% }); %>

    <% if (issues.length > 10) { %>
    <div style="text-align: center; color: #6B7280; margin-top: 20px; font-style: italic;">
      ... and <%= issues.length - 10 %> more issues. View full details in the dashboard.
    </div>
    <% } %>
  </div>

  <!-- Recommendations -->
  <div class="page">
    <h1>Recommendations</h1>

    <div class="recommendation">
      <div class="rec-number">1</div>
      <div class="rec-content">
        <div class="rec-title">Prioritize Critical & Serious Issues</div>
        <div class="rec-description">
          Address critical and serious accessibility issues immediately as they significantly impact users with disabilities.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">2</div>
      <div class="rec-content">
        <div class="rec-title">Implement Automated Testing</div>
        <div class="rec-description">
          Integrate accessibility testing into your CI/CD pipeline to catch issues early in the development process.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">3</div>
      <div class="rec-content">
        <div class="rec-title">Conduct Manual Testing</div>
        <div class="rec-description">
          Automated tools catch 30-40% of accessibility issues. Conduct manual testing with screen readers and keyboard navigation.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">4</div>
      <div class="rec-content">
        <div class="rec-title">Provide Alternative Text</div>
        <div class="rec-description">
          Ensure all images, icons, and non-text content have descriptive alternative text for screen reader users.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">5</div>
      <div class="rec-content">
        <div class="rec-title">Ensure Keyboard Accessibility</div>
        <div class="rec-description">
          All interactive elements should be accessible and operable using only a keyboard.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">6</div>
      <div class="rec-content">
        <div class="rec-title">Maintain Sufficient Color Contrast</div>
        <div class="rec-description">
          Ensure text and interactive elements have sufficient color contrast ratios as per WCAG guidelines.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">7</div>
      <div class="rec-content">
        <div class="rec-title">Use Semantic HTML</div>
        <div class="rec-description">
          Use proper HTML5 semantic elements (header, nav, main, article, etc.) to provide better structure.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">8</div>
      <div class="rec-content">
        <div class="rec-title">Regular Accessibility Audits</div>
        <div class="rec-description">
          Schedule regular accessibility audits to ensure ongoing compliance and catch new issues.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">9</div>
      <div class="rec-content">
        <div class="rec-title">Accessibility Training</div>
        <div class="rec-description">
          Provide accessibility training to designers, developers, and content creators in your organization.
        </div>
      </div>
    </div>

    <div class="recommendation">
      <div class="rec-number">10</div>
      <div class="rec-content">
        <div class="rec-title">User Testing with People with Disabilities</div>
        <div class="rec-description">
          Include users with disabilities in your testing process to get real-world feedback on accessibility.
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    Generated by <%= brandName %> | <%= dashboardUrl %>
  </div>
</body>
</html>
  `;

  return ejs.render(template, data);
}

// Helper functions
function getScoreColor(score: number | null): string {
  if (score === null) return '#6B7280';
  if (score >= 90) return '#059669';
  if (score >= 50) return '#F59E0B';
  return '#DC2626';
}

function getScoreLabel(score: number | null): string {
  if (score === null) return 'No score available';
  if (score >= 90) return 'Excellent - Good accessibility practices';
  if (score >= 70) return 'Good - Some improvements needed';
  if (score >= 50) return 'Fair - Significant improvements needed';
  return 'Poor - Critical improvements required';
}

function getImpactAssessment(score: number | null, totalIssues: number, criticalIssues: number): string {
  if (criticalIssues > 10) {
    return 'The website has a significant number of critical accessibility issues that severely impact users with disabilities. ' +
           'Immediate action is required to address these issues to ensure equal access to all users.';
  }
  
  if (score && score < 50) {
    return 'The accessibility score indicates substantial barriers for users with disabilities. ' +
           'A comprehensive remediation plan should be implemented to improve accessibility compliance.';
  }
  
  if (totalIssues > 50) {
    return 'While some areas show good accessibility practices, there are multiple issues across the website ' +
           'that need attention. Focus on addressing high-severity issues first.';
  }
  
  if (totalIssues === 0) {
    return 'Excellent! No accessibility issues were detected. However, automated tools only catch 30-40% of issues. ' +
           'Consider manual testing and user testing with people with disabilities for comprehensive accessibility assurance.';
  }
  
  return 'The website shows reasonable accessibility compliance but has some issues that should be addressed ' +
         'to provide a better experience for all users, including those with disabilities.';
}
