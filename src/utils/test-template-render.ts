/**
 * Test template rendering to diagnose PDF generation issues
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ejs = require('ejs');

// Minimal test data
const testData = {
  website: { url: 'https://example.com', name: 'Test Site' },
  pageUrl: null,
  score: 86,
  issues: [],
  issuesCount: 0,
  issuesBySeverity: { critical: [], serious: [], moderate: [], minor: [] },
  severityBreakdown: { critical: 0, serious: 0, moderate: 0, minor: 0 },
  groupedIssues: { critical: [], serious: [], moderate: [], minor: [] },
  businessRisk: 'Low',
  indiaComplianceStatus: 'Technically Aligned',
  sectorGuidance: 'default',
  sectorType: 'default',
  isGovernment: false,
  wcagConformance: { levelA: 'Mostly aligned', levelAA: 'Mostly aligned', levelAAA: 'Not evaluated' },
  wcagCategories: {
    perceivable: { name: 'Perceivable', icon: '👁️', description: 'Info', issues: [] },
    operable: { name: 'Operable', icon: '⌨️', description: 'UI', issues: [] },
    understandable: { name: 'Understandable', icon: '💭', description: 'Info', issues: [] },
    robust: { name: 'Robust', icon: '🔧', description: 'Content', issues: [] },
  },
  gigwResults: null,
  scanDate: '6/12/2025, 3:00:00 pm',
  brandName: 'AccessiScan',
  dashboardUrl: 'https://accessiscan.com/dashboard',
  scanId: 'test-123',
};

async function testTemplate() {
  try {
    console.log('🧪 Testing template rendering...\n');

    const templatePath = join(process.cwd(), 'templates', 'report.ejs');
    const template = readFileSync(templatePath, 'utf-8');
    console.log(`✅ Template loaded: ${(template.length / 1024).toFixed(2)} KB\n`);

    // Test rendering
    console.log('🔄 Rendering template...');
    const html = ejs.render(template, testData);
    console.log(`✅ HTML rendered: ${(html.length / 1024).toFixed(2)} KB\n`);

    // Check for common issues
    console.log('🔍 Checking for potential issues...\n');

    // Check 1: SVG transform issues
    const svgCount = (html.match(/<svg/g) || []).length;
    console.log(`SVG elements: ${svgCount}`);
    
    // Check 2: Linear gradients
    const gradientCount = (html.match(/linear-gradient/g) || []).length;
    console.log(`Linear gradients: ${gradientCount}`);

    // Check 3: Transform CSS
    const transformCount = (html.match(/transform:/g) || []).length;
    console.log(`CSS transforms: ${transformCount}`);

    // Check 4: Invalid characters
    const nullBytes = html.includes('\0');
    console.log(`Null bytes: ${nullBytes ? '❌ FOUND' : '✅ None'}`);

    // Check 5: Unclosed tags
    const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (html.match(/<\/[^>]+>/g) || []).length;
    console.log(`Open tags: ${openTags}, Close tags: ${closeTags}`);

    // Check 6: SVG stroke-dasharray calculation
    const dashArrayMatches = html.match(/stroke-dasharray="([^"]+)"/g) || [];
    console.log(`\nSVG stroke-dasharray values:`);
    dashArrayMatches.forEach((match: string, i: number) => {
      const value = match.match(/stroke-dasharray="([^"]+)"/)?.[1];
      console.log(`  ${i + 1}. ${value}`);
      if (value && (value.includes('NaN') || value.includes('undefined'))) {
        console.log(`     ⚠️  WARNING: Invalid value detected!`);
      }
    });

    // Check 7: EJS syntax errors
    try {
      ejs.render(template, testData);
      console.log('\n✅ EJS syntax: Valid');
    } catch (ejsError) {
      console.log(`\n❌ EJS syntax error: ${ejsError}`);
      return false;
    }

    // Check 8: HTML validity basics
    if (!html.includes('<!DOCTYPE html>')) {
      console.log('\n❌ Missing DOCTYPE');
      return false;
    }

    if (!html.includes('</html>')) {
      console.log('\n❌ Missing closing </html> tag');
      return false;
    }

    console.log('\n✅ Template validation passed!');
    console.log(`\n📊 Summary:`);
    console.log(`  Template size: ${(template.length / 1024).toFixed(2)} KB`);
    console.log(`  Rendered HTML: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(`  SVG elements: ${svgCount}`);
    console.log(`  Gradients: ${gradientCount}`);
    console.log(`  CSS transforms: ${transformCount}`);

    return true;
  } catch (error) {
    console.error('\n❌ Template test failed:');
    console.error(error);
    return false;
  }
}

testTemplate().then(success => {
  process.exit(success ? 0 : 1);
});

