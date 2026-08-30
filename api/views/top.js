'use strict';

const { Redis } = require('@upstash/redis');

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204, {});
  }

  if (!redis) {
    return send(res, 500, { error: 'Redis not configured' });
  }

  if (req.method !== 'GET') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let limit = parseInt(url.searchParams.get('limit') || '8', 10);
    if (isNaN(limit) || limit < 1) limit = 8;
    if (limit > 100) limit = 100;

    const raw = await redis.zrange('views:ranking', 0, limit - 1, { rev: true, withScores: true });
    const items = [];
    if (raw.length > 0 && Array.isArray(raw[0])) {
      for (const pair of raw) {
        items.push({ id: pair[0], views: Math.round(Number(pair[1])) });
      }
    } else {
      for (let i = 0; i < raw.length; i += 2) {
        items.push({ id: raw[i], views: Math.round(Number(raw[i + 1])) });
      }
    }

    return send(res, 200, items);
  } catch (err) {
    console.error('[api/views/top]', err);
    return send(res, 500, { error: 'Internal server error' });
  }
};
