'use strict';

const express = require('express');
const { fetchAllFeeds, FEEDS } = require('../services/news-feed');

const router = express.Router();

/**
 * GET /api/news
 * Query parameters:
 *   source: optional sourceKey (e.g. 'myjoyonline', 'citinewsroom', etc.)
 *   limit: maximum number of articles to return (default 50)
 *   refresh: 'true' to bypass in-memory cache and fetch fresh
 */
router.get('/news', async (req, res) => {
  try {
    const { source, limit = 50, refresh } = req.query;
    const forceRefresh = refresh === 'true' || refresh === '1';

    let articles = await fetchAllFeeds(forceRefresh);

    if (source && source !== 'all') {
      articles = articles.filter(a => a.sourceKey.toLowerCase() === source.toLowerCase());
    }

    const max = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    res.json(articles.slice(0, max));
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to retrieve news feed' });
  }
});

/**
 * GET /api/news/sources
 * Returns all configured Ghanaian news sources for filtering
 */
router.get('/news/sources', (req, res) => {
  const sources = FEEDS.map(f => ({
    key: f.key,
    name: f.name,
    color: f.color,
  }));
  res.json(sources);
});

module.exports = router;
