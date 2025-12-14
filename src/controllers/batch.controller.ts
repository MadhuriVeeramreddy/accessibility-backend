import { Request, Response } from 'express';
import prisma from '../db/prismaClient';
import { addScanJob } from '../queues/backgroundProcessor';
import { fetchSitemapUrls } from '../services/sitemap.service';

// Create a full website scan (sitemap-based)
export const createFullScan = async (req: Request, res: Response) => {
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

    // Fetch URLs from sitemap
    const urls = await fetchSitemapUrls(website.url);

    // Create parent scan
    const parentScan = await prisma.scan.create({
      data: {
        websiteId,
        status: 'queued',
        totalPages: urls.length,
        completedPages: 0,
      },
    });

    // Create child scans for each URL and process in background
    for (const url of urls) {
      const childScan = await prisma.scan.create({
        data: {
          websiteId,
          pageUrl: url,
          parentScanId: parentScan.id,
          status: 'queued',
        },
      });

      // Process scan in background (non-blocking, no Redis needed)
      addScanJob({
        scanId: childScan.id,
        websiteId,
        parentScanId: parentScan.id,
      });
    }

    res.json({
      ...parentScan,
      message: `Queued ${urls.length} pages for scanning`,
    });
  } catch (error) {
    console.error('Failed to create full scan:', error);
    res.status(500).json({ error: 'Failed to create full scan' });
  }
};

// Get scan progress
export const getScanProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get parent scan
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        childScans: {
          select: {
            id: true,
            pageUrl: true,
            status: true,
            score: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Calculate progress
    const completedCount = scan.childScans.filter(
      (child) => child.status === 'completed'
    ).length;

    res.json({
      id: scan.id,
      status: scan.status,
      totalPages: scan.totalPages || scan.childScans.length,
      completedPages: completedCount,
      progress: scan.totalPages
        ? Math.round((completedCount / scan.totalPages) * 100)
        : 0,
      pages: scan.childScans,
    });
  } catch (error) {
    console.error('Failed to fetch scan progress:', error);
    res.status(500).json({ error: 'Failed to fetch scan progress' });
  }
};

