import { Request, Response } from 'express';
import prisma from '../db/prismaClient';
import { addScanJob } from '../queues/backgroundProcessor';
import { storageService } from '../services/storage.service';

// Create a new scan
export const createScan = async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.body;

    // Validate input
    if (!websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // Check if website exists
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Create scan with status "queued"
    const scan = await prisma.scan.create({
      data: {
        websiteId,
        status: 'queued',
      },
    });

    // Process scan in background (non-blocking, no Redis needed)
    addScanJob({
      scanId: scan.id,
      websiteId: scan.websiteId,
    });

    res.json(scan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create scan' });
  }
};

// Get scan by ID
export const getScanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        website: true,
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(scan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan' });
  }
};

// Helper function to generate PDF for a scan
async function generatePDFForScan(scan: any): Promise<Buffer> {
  const { generatePDF } = await import('../services/pdfGenerator');
  
  // Extract GIGW results from metaJson
  const gigwResults = (scan.metaJson as any)?.gigw || null;

  // Generate PDF
  return await generatePDF({
    website: {
      url: scan.website.url,
      name: scan.website.name || undefined,
    },
    pageUrl: scan.pageUrl || undefined,
    score: scan.score || null,
    issues: scan.issues.map((issue: any) => ({
      ruleId: issue.ruleId,
      severity: issue.severity,
      selector: issue.selector || undefined,
      description: issue.description,
      snippet: issue.snippet || undefined,
    })),
    gigwResults: gigwResults || undefined,
    scanDate: scan.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    scanId: scan.id,
    brandName: process.env.BRAND_NAME || 'DesiA11y',
    dashboardUrl: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/scan/${scan.id}`,
  });
}

// Generate and download PDF report on-demand
export const downloadPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get scan with website and issues
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        website: true,
        issues: true,
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Check if scan is completed
    if (scan.status !== 'completed') {
      return res.status(400).json({ error: 'Scan is not completed yet' });
    }

    // Check if PDF already exists in storage
    let pdfBuffer: Buffer;
    const pdfExists = await storageService.exists(id);
    
    if (pdfExists) {
      // Get PDF from storage (S3 or local)
      console.log(`📦 PDF found in storage for scan ${id}, retrieving...`);
      const storedPdf = await storageService.get(id);
      if (storedPdf) {
        pdfBuffer = storedPdf;
        console.log(`✅ PDF retrieved from storage (${pdfBuffer.length} bytes)`);
      } else {
        // Fallback: generate if retrieval failed
        console.log('⚠️  PDF exists but retrieval failed, generating new PDF...');
        pdfBuffer = await generatePDFForScan(scan);
      }
    } else {
      // Generate PDF on-demand
      console.log(`📄 Generating PDF for scan ${id}...`);
      pdfBuffer = await generatePDFForScan(scan);
      
      // Save PDF to storage (S3 or local)
      try {
        await storageService.save(id, pdfBuffer);
        console.log(`✅ PDF saved to storage (${pdfBuffer.length} bytes)`);
        
        // Update scan with report URL if using S3
        const reportUrl = await storageService.getUrl(id);
        if (reportUrl) {
          await prisma.scan.update({
            where: { id },
            data: { reportUrl },
          });
        }
      } catch (storageError) {
        console.error('⚠️  Failed to save PDF to storage:', storageError);
        // Continue anyway - PDF is still sent to user
      }
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="accessibility-report-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
};

