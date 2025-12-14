import { Request, Response } from 'express';
import prisma from '../db/prismaClient';

// Create a new website
export const createWebsite = async (req: Request, res: Response) => {
  try {
    const { url, name } = req.body;

    // Validate input
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Create website
    const website = await prisma.website.create({
      data: {
        url,
        name: name || null,
      },
    });

    res.json(website);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create website' });
  }
};

// Get all websites
export const getAllWebsites = async (req: Request, res: Response) => {
  try {
    const websites = await prisma.website.findMany();
    res.json(websites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
};

