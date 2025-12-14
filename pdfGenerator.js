const puppeteer = require('puppeteer');
const path = require('path');
const { renderTemplate } = require('../utils/templateRenderer');

/**
 * PDF Generator Class
 */
class PDFGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'output');
    this.fileName = options.fileName || 'Accessibility_Audit_Report.pdf';
  }
  
  /**
   * Generate PDF from HTML template
   */
  async generate() {
    console.log('Starting PDF generation...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Render template with colors and icons
      const htmlContent = renderTemplate();
      
      // Set content with HTML template - ensure UTF-8 encoding for emoji icons
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });
      
      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      
      // Ensure output directory exists
      const fs = require('fs');
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      
      // Generate PDF
      const outputPath = path.join(this.outputDir, this.fileName);
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        }
      });
      
      console.log(`✅ PDF generated successfully: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

module.exports = PDFGenerator;

