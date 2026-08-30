'use strict';

const { Redis } = require('@upstash/redis');

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204, {});
  }

  if (!redis) {
    return send(res, 500, { error: 'Redis not configured' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = url.searchParams.get('id');

    if (!id || !/^\d+$/.test(id)) {
      return send(res, 400, { error: 'Missing or invalid query parameter: id' });
    }

    const key = `views:p:${id}`;

    if (req.method === 'POST') {
      const count = await redis.incr(key);
      return send(res, 200, { id, views: count });
    }

    if (req.method === 'GET') {
      const count = await redis.get(key);
      return send(res, 200, { id, views: count === null ? 0 : Number(count) });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/views]', err);
    return send(res, 500, { error: 'Internal server error' });
  }
};
