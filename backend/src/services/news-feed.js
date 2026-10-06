'use strict';

/**
 * 9 Ghana News Feed Sources
 *
 * Direct RSS feeds are preferred over Google News RSS because the latter
 * strips out <media:content> and <enclosure> image tags.
 * For feeds that still lack images in their RSS, we attempt to scrape the
 * Open Graph image from the article's HTML page as a fallback.
 */
const FEEDS = [
  {
    key: 'myjoyonline',
    name: 'MyJoyOnline',
    color: '#CE1126',
    url: 'https://www.myjoyonline.com/feed/',
    hasImages: true,
  },
  {
    key: 'citinewsroom',
    name: 'Citi Newsroom',
    color: '#006B3F',
    url: 'https://citinewsroom.com/feed/',
    hasImages: true,
  },
  {
    key: 'ghanaiantimes',
    name: 'Ghanaian Times',
    color: '#FCD116',
    url: 'https://ghanaiantimes.com.gh/feed/',
    hasImages: true,
  },
  {
    key: 'graphiconline',
    name: 'Graphic Online',
    color: '#CE1126',
    url: 'https://www.graphic.com.gh/news.html?format=feed&type=rss',
    hasImages: true,
  },
  {
    key: 'modernghana',
    name: 'Modern Ghana',
    color: '#006B3F',
    // Direct RSS — includes images unlike Google News RSS
    url: 'https://www.modernghana.com/rss/news/',
    hasImages: true,
  },
  {
    key: 'ghanaweb',
    name: 'GhanaWeb',
    color: '#FCD116',
    url: 'https://www.ghanaweb.com/GhanaHomePage/rss.xml',
    hasImages: true,
  },
  {
    key: 'peacefm',
    name: 'Peace FM',
    color: '#CE1126',
    url: 'https://peacefmonline.com/feed/',
    hasImages: true,
  },
  {
    key: 'adomonline',
    name: 'Adom Online',
    color: '#006B3F',
    url: 'https://www.adomonline.com/feed/',
    hasImages: true,
  },
  {
    key: 'accramail',
    name: 'Accra Mail',
    color: '#FCD116',
    // No reliable direct RSS — use Google News but scrape OG image as fallback
    url: 'https://news.google.com/rss/search?q=site:theaccramail.com&hl=en-GH&gl=GH&ceid=GH:en',
    hasImages: false,
  },
];

// In-memory cache for fast repeated requests
let cachedArticles = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Decode basic HTML entities
 */
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Strip HTML tags and clean whitespace
 */
function stripHtml(str) {
  if (!str) return '';
  return decodeEntities(str.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Extract Open Graph image from an HTML page.
 * Used as a fallback for feeds that carry no images in their XML.
 */
async function fetchOgImage(pageUrl) {
  if (!pageUrl || !pageUrl.startsWith('http')) return null;
  // Skip Google News redirect URLs — we can't scrape them easily
  if (pageUrl.includes('news.google.com')) return null;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 FixGH/1.0 (image fetcher)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    // Only read the first 20KB — enough to find the <head>
    const reader = res.body.getReader();
    let chunk = '';
    let done = false;
    while (!done && chunk.length < 20000) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) chunk += new TextDecoder().decode(value);
    }
    reader.cancel();

    // og:image
    const ogMatch = chunk.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || chunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch) return ogMatch[1];

    // twitter:image
    const twMatch = chunk.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || chunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twMatch) return twMatch[1];
  } catch {
    // Silently skip — image is optional
  }
  return null;
}

/**
 * Parse an RSS or Atom XML string without heavy dependencies
 */
function parseRssXml(xmlText, feed) {
  const items = [];
  const itemBlocks = xmlText.match(/<item[\s\S]*?<\/item>/gi)
    || xmlText.match(/<entry[\s\S]*?<\/entry>/gi)
    || [];

  for (const block of itemBlocks) {
    try {
      // 1. Title
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      let title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').trim();
      title = stripHtml(title);

      // Clean up Google News title format: "Article Title - Source Name"
      if (title.includes(' - ') && feed.url.includes('news.google.com')) {
        const parts = title.split(' - ');
        parts.pop();
        title = parts.join(' - ');
      }

      if (!title) continue;

      // 2. Link
      let link = '';
      const linkMatch = block.match(/<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      if (linkMatch) {
        link = (linkMatch[1] || linkMatch[2] || '').trim();
      } else {
        const linkHrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (linkHrefMatch) link = linkHrefMatch[1].trim();
      }
      // Strip CDATA wrappers sometimes left in link text
      link = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

      // 3. Published Date
      const dateMatch = block.match(/<(?:pubDate|published|updated)[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:pubDate|published|updated)>/i);
      const rawDate = dateMatch ? (dateMatch[1] || dateMatch[2] || '').trim() : '';
      let publishedAt = new Date().toISOString();
      if (rawDate) {
        const parsed = Date.parse(rawDate);
        if (!isNaN(parsed)) publishedAt = new Date(parsed).toISOString();
      }

      // 4. Description / Snippet
      const descMatch = block.match(/<(?:description|summary|content:encoded|content)[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:description|summary|content:encoded|content)>/i);
      const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || '') : '';
      const description = stripHtml(rawDesc).slice(0, 220);

      // 5. Image Extraction
      // Priority: media:content → media:thumbnail → enclosure → embedded <img> in description
      let imageUrl = null;

      const mediaContentMatch = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
      if (mediaContentMatch) {
        imageUrl = mediaContentMatch[1];
      }

      if (!imageUrl) {
        const mediaThumbnailMatch = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
        if (mediaThumbnailMatch) imageUrl = mediaThumbnailMatch[1];
      }

      if (!imageUrl) {
        const enclosureMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i)
          || block.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i)
          || block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
        if (enclosureMatch) imageUrl = enclosureMatch[1];
      }

      if (!imageUrl) {
        const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) imageUrl = imgMatch[1];
      }

      // Basic validation — must be http/https
      if (imageUrl && !imageUrl.startsWith('http')) imageUrl = null;

      items.push({
        id: `${feed.key}-${Buffer.from(title.slice(0, 40)).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`,
        title,
        description,
        link,
        imageUrl,
        needsOgFetch: !imageUrl && !!link, // flag for OG fallback
        source: feed.name,
        sourceKey: feed.key,
        sourceColor: feed.color,
        publishedAt,
      });
    } catch {
      // Ignore individually malformed items
    }
  }

  return items;
}

/**
 * Fetch a single feed with timeout and custom User-Agent.
 * For items that have no image in the RSS, try fetching OG image from the article page.
 */
async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FixGH/1.0',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[news-feed] ${feed.name} returned HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseRssXml(xml, feed).slice(0, 15);

    // For items with no image, attempt OG scrape in parallel (max 5 per feed)
    const needsFetch = items.filter(it => it.needsOgFetch).slice(0, 5);
    if (needsFetch.length > 0) {
      await Promise.all(
        needsFetch.map(async (item) => {
          const og = await fetchOgImage(item.link);
          if (og) item.imageUrl = og;
        })
      );
    }

    // Strip the internal flag before returning
    return items.map(({ needsOgFetch: _, ...rest }) => rest);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[news-feed] Failed to fetch ${feed.name}:`, err.message);
    return [];
  }
}

/**
 * Fetch all feeds concurrently and cache results
 */
async function fetchAllFeeds(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedArticles && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedArticles;
  }

  console.log('[news-feed] Fetching live news from 9 Ghanaian sources...');
  const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));

  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Sort descending by publication date
  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  if (allArticles.length > 0) {
    cachedArticles = allArticles;
    lastCacheTime = now;
    console.log(`[news-feed] Successfully aggregated ${allArticles.length} live articles.`);
  }

  return cachedArticles || [];
}

module.exports = {
  fetchAllFeeds,
  FEEDS,
};
