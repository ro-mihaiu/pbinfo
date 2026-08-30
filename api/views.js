'use strict';

const { Redis } = require('@upstash/redis');

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

function send(res, status, body, cookies = []) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  if (cookies.length > 0) {
    res.setHeader('set-cookie', cookies);
  }
  res.end(JSON.stringify(body));
}

function parseCookies(cookieHeader) {
  const map = {};
  if (!cookieHeader) return map;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx >= 0) {
      const name = pair.slice(0, idx).trim();
      const value = decodeURIComponent(pair.slice(idx + 1).trim());
      map[name] = value;
    }
  });
  return map;
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
    const cookies = parseCookies(req.headers.cookie);

    if (!id || !/^\d+$/.test(id)) {
      return send(res, 400, { error: 'Missing or invalid query parameter: id' });
    }

    const key = `views:p:${id}`;
    const cookieName = `viewed_${id}`;

    if (req.method === 'POST') {
      if (cookies[cookieName]) {
        const count = await redis.get(key);
        return send(res, 200, { id, views: count === null ? 0 : Number(count) });
      }

      const current = await redis.get(key);
      if (current === null) {
        const hashCount = await redis.hget('pbinfo:views', id);
        const base = Number(hashCount) || 0;
        await redis.set(key, base);
      }

      const count = await redis.incr(key);
      await redis.zincrby('views:ranking', 1, id);
      const cookie = `${cookieName}=1; Max-Age=86400; Path=/; SameSite=Lax`;
      return send(res, 200, { id, views: count }, [cookie]);
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
