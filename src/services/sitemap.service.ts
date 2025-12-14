import axios from 'axios';

// Extract URLs from sitemap.xml
export const fetchSitemapUrls = async (websiteUrl: string): Promise<string[]> => {
  try {
    // Clean website URL
    const baseUrl = websiteUrl.trim().replace(/\/$/, '');
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    console.log(`Fetching sitemap from: ${sitemapUrl}`);

    // Fetch sitemap
    const response = await axios.get(sitemapUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'DesiA11y-Bot/1.0',
      },
    });

    // Parse XML to extract URLs
    const xml = response.data;
    const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);

    if (!urlMatches || urlMatches.length === 0) {
      console.log('No URLs found in sitemap');
      return [baseUrl]; // Fallback to base URL
    }

    // Extract URLs from <loc> tags
    const urls = urlMatches
      .map((match: string) => match.replace(/<\/?loc>/g, ''))
      .filter((url: string) => url.startsWith('http'))
      .slice(0, 50); // Limit to 50 pages

    console.log(`Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error) {
    console.error('Failed to fetch sitemap:', error instanceof Error ? error.message : error);
    // Fallback: return just the base URL
    const baseUrl = websiteUrl.trim().replace(/\/$/, '');
    return [baseUrl];
  }
};

