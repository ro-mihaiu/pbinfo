'use strict';

const origin = 'https://www.pbinfo.ro';
const checks = new Map();
const cacheDuration = 60 * 60 * 1000;

function problemUrl(id) {
  return `${origin}/probleme/${id}`;
}

async function checkProblemPage(id) {
  try {
    const response = await fetch(problemUrl(id), {
      signal: AbortSignal.timeout(1800)
    });
    const finalUrl = new URL(response.url);
    if (response.status !== 404 || finalUrl.origin !== origin ||
        !new RegExp(`^/probleme/${id}(?:/[^/]+)?/?$`).test(finalUrl.pathname)) {
      await response.body?.cancel();
      return response.ok ? false : null;
    }
    const html = await response.text();
    return /<title>\s*www\.pbinfo\.ro\s*<\/title>/i.test(html) &&
      /<h1\b[^>]*>\s*404\s*<\/h1>/i.test(html) &&
      /<h1\b[^>]*>\s*Pagina nu există\.\s*<\/h1>/i.test(html) ? true : null;
  } catch {
    return null;
  }
}

function isOfficialPageMissing(id) {
  const now = Date.now();
  const existing = checks.get(id);
  if (existing && existing.expiresAt > now) return existing.result;

  const check = { expiresAt: Infinity };
  check.result = checkProblemPage(id).then((missing) => {
    check.expiresAt = Date.now() + (missing === null ? 60_000 : cacheDuration);
    return missing === true;
  });
  checks.set(id, check);
  return check.result;
}

module.exports = { isOfficialPageMissing, problemUrl };
