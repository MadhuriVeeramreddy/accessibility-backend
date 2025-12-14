/**
 * Template validation utility
 * Run this to test if the EJS template can render without errors
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ejs = require('ejs');

// Test data with all required fields
const testData = {
  website: { url: 'https://example.com', name: 'Example Site' },
  pageUrl: null,
  score: 85,
  issues: [
    {
      ruleId: 'color-contrast',
      severity: 'serious',
      selector: '.nav-link',
      description: 'Elements must have sufficient color contrast',
      snippet: '<a class="nav-link">Home</a>',
      wcagCategory: 'perceivable',
      fix: 'Increase color contrast to at least 4.5:1 for normal text.',
    }
  ],
  issuesCount: 1,
  issuesBySeverity: {
    critical: [],
    serious: [{ ruleId: 'color-contrast', severity: 'serious', selector: '.nav-link', description: 'Test' }],
    moderate: [],
    minor: [],
  },
  severityBreakdown: { critical: 0, serious: 1, moderate: 0, minor: 0 },
  groupedIssues: {
    critical: [],
    serious: [
      {
        ruleId: 'color-contrast',
        severity: 'serious',
        description: 'Elements must have sufficient color contrast',
        count: 1,
        selectors: ['.nav-link'],
        wcagCategory: 'perceivable',
        fix: 'Increase color contrast to at least 4.5:1 for normal text.',
        owner: 'Designer',
        whatImproves: 'All 1 element(s) will meet the 4.5:1 ratio.',
      }
    ],
    moderate: [],
    minor: [],
  },
  businessRisk: 'Medium',
  indiaComplianceStatus: 'Partially Aligned',
  sectorGuidance: 'default',
  sectorType: 'default',
  isGovernment: false,
  wcagConformance: {
    levelA: 'Mostly aligned',
    levelAA: 'Partially aligned',
    levelAAA: 'Not evaluated',
  },
  wcagCategories: {
    perceivable: { name: 'Perceivable', icon: '👁️', description: 'Info must be presentable', issues: [] },
    operable: { name: 'Operable', icon: '⌨️', description: 'UI must be operable', issues: [] },
    understandable: { name: 'Understandable', icon: '💭', description: 'Info must be understandable', issues: [] },
    robust: { name: 'Robust', icon: '🔧', description: 'Content must be robust', issues: [] },
  },
  gigwResults: null,
  scanDate: '6/12/2025, 3:00:00 pm',
  brandName: 'AccessiScan',
  dashboardUrl: 'https://accessiscan.com/dashboard',
  scanId: 'test-scan-123',
};

async function testTemplate() {
  try {
    console.log('🧪 Testing PDF template rendering...\n');

    // Read template
    const templatePath = join(process.cwd(), 'templates', 'report.ejs');
    const template = readFileSync(templatePath, 'utf-8');
    console.log(`✅ Template loaded (${template.length} characters)\n`);

    // Render HTML
    console.log('🔄 Rendering EJS template...');
    const html = ejs.render(template, testData);
    console.log(`✅ HTML rendered (${html.length} characters)\n`);

    // Basic validation
    if (!html.includes('<!DOCTYPE html>')) {
      throw new Error('Invalid HTML: Missing DOCTYPE');
    }
    if (!html.includes('AccessiScan')) {
      throw new Error('Invalid HTML: Missing brand name');
    }
    if (!html.includes('test-scan-123')) {
      throw new Error('Invalid HTML: Missing scan ID');
    }

    console.log('✅ Template validation passed!\n');
    console.log('Summary:');
    console.log(`  - Template size: ${(template.length / 1024).toFixed(2)} KB`);
    console.log(`  - Rendered HTML size: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(`  - Contains DOCTYPE: ✓`);
    console.log(`  - Contains brand name: ✓`);
    console.log(`  - Contains scan ID: ✓`);

    return true;
  } catch (error) {
    console.error('❌ Template validation failed:');
    console.error(error);
    return false;
  }
}

// Run test
testTemplate().then(success => {
  process.exit(success ? 0 : 1);
});

