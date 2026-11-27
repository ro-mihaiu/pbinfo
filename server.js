'use strict';

const path = require('path');
const fs = require('fs');
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch (e) {}
const express = require('express');
const store = require('./data/store');
const i18n = require('./lib/i18n');
const grades = require('./lib/grades');
const parser = require('./lib/parser');
const pbinfo = require('./lib/pbinfo');

const app = express();
const PORT = process.env.PORT || 3000;

// --- App Settings ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
const rateLimit = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const max = 2;
  const entry = rateLimit.get(ip) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count += 1;
  rateLimit.set(ip, entry);
  return entry.count > max;
}

app.use(express.static(path.join(__dirname, 'public')));

// Provide shared locals to all views
app.use((req, res, next) => {
  const selected = req.query.lang;
  const saved = req.headers.cookie?.match(/(?:^|;\s*)pbinfo_lang=(ro|en|fr|de)(?:;|$)/)?.[1];
  const hasSelection = typeof selected === 'string' && Object.hasOwn(i18n.languages, selected);
  const locale = hasSelection ? selected : saved || 'ro';
  if (hasSelection && saved !== locale) {
    res.cookie('pbinfo_lang', locale, { maxAge: 365 * 86400_000, httpOnly: true, sameSite: 'lax', secure: req.secure });
  }
  res.vary('Cookie');
  res.locals.locale = locale;
  res.locals.t = (key) => i18n.t(key, locale);
  res.locals.languageUrl = (language) => {
    const query = new URLSearchParams(req.originalUrl.split('?').slice(1).join('?'));
    query.set('lang', language);
    return `?${query}`;
  };
  res.locals.i18n = i18n;
  res.locals.grades = grades;
  res.locals.path = req.path;
  res.locals.social = {
    instagram: 'https://instagra.ro-mihaiu.xyz',
    discord: 'https://discord.ro-mihaiu.xyz'
  };
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// --- Helpers ---

// Build a resolver that links numeric refs to known problems
function makeLinkResolver() {
  const problems = store.getProblems();
  const idSet = new Set(problems.map((p) => p.id));
  return (id) => (idSet.has(id) ? `/p/${id}` : null);
}

// Count solutions for stats
function countSolutions() {
  return store.listSolutionIds().length;
}

// --- Routes ---

// Home
app.get('/', async (req, res, next) => {
  try {
    const problems = store.getProblems();
    const totalSolutions = countSolutions();
    const recent = [...problems].sort((a, b) => b.id - a.id).slice(0, 6);

    res.render('home', {
      totalProblems: problems.length,
      totalSolutions,
      recent
    });
  } catch (err) {
    next(err);
  }
});

// Archive listing
function renderArchive(req, res) {
  const problems = store.getProblems();
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const requestedGrade = req.query.grade || '';
  const grade = grades.GRADES.includes(Number(requestedGrade)) ? String(requestedGrade) : '';
  const difficulty = req.query.difficulty || '';
  const perPage = 12;

  let filtered = problems;

  if (q) {
    filtered = filtered.filter((p) => {
      const title = (p.titles?.ro || '').toLowerCase();
      const idStr = String(p.id);
      const tags = (p.tags || []).join(' ').toLowerCase();
      return title.includes(q) || idStr.includes(q) || tags.includes(q);
    });
  }

  if (grade) {
    filtered = filtered.filter((p) => String(p.grade) === String(grade));
  }

  if (difficulty) {
    filtered = filtered.filter((p) => String(p.difficulty) === String(difficulty));
  }

  // Default sort: newest uploaded first.
  filtered = [...filtered].sort((a, b) => b.id - a.id);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
  let currentPage = parseInt(req.query.page, 10);
  if (isNaN(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * perPage;
  const pagedProblems = filtered.slice(start, start + perPage);

  const baseQuery = new URLSearchParams();
  if (req.query.q) baseQuery.set('q', req.query.q);
  if (grade) baseQuery.set('grade', grade);
  if (difficulty) baseQuery.set('difficulty', difficulty);

  const makePageUrl = (page) => {
    const params = new URLSearchParams(baseQuery);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `/p?${qs}` : '/p';
  };

  const selectedPages = new Set([1, 2, currentPage, totalPages - 1, totalPages]);
  const sortedPages = [...selectedPages]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const pageItems = [];
  for (let i = 0; i < sortedPages.length; i++) {
    const n = sortedPages[i];
    const prev = i > 0 ? sortedPages[i - 1] : null;
    if (prev !== null && n - prev > 1) {
      pageItems.push({ type: 'ellipsis' });
    }
    pageItems.push({
      type: 'page',
      page: n,
      url: makePageUrl(n),
      current: n === currentPage
    });
  }

  res.render('archive', {
    title: res.locals.t('archive_title'),
    problems: pagedProblems,
    totalResults,
    query: req.query.q || '',
    selectedGrade: grade,
    selectedDifficulty: difficulty,
    hasSolution: (id) => store.hasSolution(id),
    currentPage,
    totalPages,
    pageItems,
    prevPageUrl: currentPage > 1 ? makePageUrl(currentPage - 1) : null,
    nextPageUrl: currentPage < totalPages ? makePageUrl(currentPage + 1) : null
  });
}

app.get('/p', (req, res) => {
  renderArchive(req, res);
});

// Backward-compatible redirect: /archive -> /p
app.get('/archive', (req, res) => {
  const qs = new URLSearchParams(req.query || {}).toString();
  res.redirect(301, qs ? `/p?${qs}` : '/p');
});

// Problems missing a solution and/or statement
function getUnresolvedProblemGroups(categoryDefinitions) {
  const byGrade = new Map();

  function getGradeKey(value) {
    const grade = Number(value);
    return Number.isInteger(grade) && grade > 0 ? grade : null;
  }

  function hasStatement(problem) {
    const parsed = store.getParsedStatement(problem.id);
    if (Array.isArray(parsed) && parsed.some((section) => String(section.content || '').trim())) {
      return true;
    }
    const details = problem.details || {};
    return ['enunt', 'cerinta', 'date_intrare', 'date_iesire', 'restrictii']
      .some((key) => String(details[key] || '').trim().length > 0);
  }

  for (const problem of store.getProblems()) {
    const statementExists = hasStatement(problem);
    const solutionExists = store.hasSolution(problem.id);
    if (statementExists && solutionExists) continue;

    const gradeKey = getGradeKey(problem.grade);
    if (!byGrade.has(gradeKey)) {
      byGrade.set(gradeKey, {
        grade: gradeKey,
        label: gradeKey === null ? 'Clasă nespecificată' : grades.getGradeLabel(gradeKey),
        difficulties: new Map()
      });
    }

    const gradeGroup = byGrade.get(gradeKey);
    const difficultyValue = Number(problem.difficulty);
    const difficulty = Number.isInteger(difficultyValue) && difficultyValue >= 1 && difficultyValue <= 4
      ? difficultyValue
      : null;
    if (!gradeGroup.difficulties.has(difficulty)) {
      gradeGroup.difficulties.set(difficulty, {
        difficulty,
        label: difficulty === null ? 'Nespecificată' : grades.getDifficultyLabel(difficulty),
        count: 0,
        categories: categoryDefinitions.map((category) => ({
          ...category,
          count: 0,
          problems: []
        }))
      });
    }

    const difficultyGroup = gradeGroup.difficulties.get(difficulty);
    const categoryKey = !statementExists && !solutionExists
      ? 'both'
      : !solutionExists
        ? 'solution'
        : 'statement';
    const category = difficultyGroup.categories.find((item) => item.key === categoryKey);
    category.problems.push(problem);
    category.count += 1;
    difficultyGroup.count += 1;
  }

  const gradeGroups = [...byGrade.values()].sort((a, b) => {
    if (a.grade === null) return 1;
    if (b.grade === null) return -1;
    return a.grade - b.grade;
  });

  for (const group of gradeGroups) {
    group.difficulties = [...group.difficulties.values()]
      .sort((a, b) => {
        if (a.difficulty === null) return 1;
        if (b.difficulty === null) return -1;
        return a.difficulty - b.difficulty;
      })
      .map((difficultyGroup) => ({
        ...difficultyGroup,
        categories: difficultyGroup.categories.map((category) => ({
          ...category,
          problems: category.problems.sort((a, b) => a.id - b.id)
        }))
      }));
    group.count = group.difficulties.reduce((sum, difficulty) => sum + difficulty.count, 0);
  }

  return gradeGroups;
}

function summarizeUnresolvedGroups(gradeGroups, categoryDefinitions) {
  const total = gradeGroups.reduce((sum, group) => sum + group.count, 0);
  const categoryTotals = categoryDefinitions.map((definition) => ({
    ...definition,
    count: gradeGroups.reduce((gradeSum, group) => gradeSum + group.difficulties.reduce(
      (difficultySum, difficulty) => difficultySum + difficulty.categories.find((item) => item.key === definition.key).count,
      0
    ), 0)
  }));
  return { gradeGroups, total, categoryTotals };
}

app.get('/n', (req, res) => {
  const query = String(req.query.q || '').trim();
  const categoryDefinitions = ['both', 'solution', 'statement'].map((key) => ({
    key,
    label: res.locals.t(`unresolved_${key}`)
  }));
  const gradeGroups = getUnresolvedProblemGroups(categoryDefinitions);

  if (query) {
    const matchesQuery = (problem) => String(problem.id).includes(query);
    for (const gradeGroup of gradeGroups) {
      for (const difficultyGroup of gradeGroup.difficulties) {
        for (const category of difficultyGroup.categories) {
          category.problems = category.problems.filter(matchesQuery);
          category.count = category.problems.length;
        }
        difficultyGroup.count = difficultyGroup.categories.reduce((sum, category) => sum + category.count, 0);
      }
      gradeGroup.difficulties = gradeGroup.difficulties.filter((difficulty) => difficulty.count > 0);
      gradeGroup.count = gradeGroup.difficulties.reduce((sum, difficulty) => sum + difficulty.count, 0);
    }
    for (let index = gradeGroups.length - 1; index >= 0; index--) {
      if (gradeGroups[index].count === 0) gradeGroups.splice(index, 1);
    }
  }

  const groups = summarizeUnresolvedGroups(gradeGroups, categoryDefinitions);

  res.render('unresolved', {
    title: res.locals.t('unresolved_title'),
    query,
    ...groups
  });
});

// Short change posts generated from recent repository commits
const CHANGELOG_API_URL = 'https://api.github.com/repos/ro-mihaiu/pbinfo/commits?sha=main&since=2026-08-24T21:00:00Z&per_page=100';
const CHANGELOG_CACHE_MS = 10 * 60 * 1000;
const archivedChanges = require('./data/change-history.json').map(createChangePost).filter(Boolean);
let changelogCache = { expiresAt: 0, posts: archivedChanges, stale: true };
let changelogFetchPromise = null;

function createChangePost(commit) {
  const message = String(commit?.commit?.message || '').trim();
  const subject = message.split(/\r?\n/, 1)[0].trim();
  if (!subject || !/^[a-f0-9]{40}$/i.test(String(commit.sha || ''))) return null;

  const lower = subject.toLowerCase();
  let title = 'Actualizare arhivă';
  let summary = 'Arhiva a primit o actualizare. Deschide commitul pentru detaliile exacte ale modificării.';
  if (/unresolved|incomplete|missing statement|missing solution/.test(lower)) {
    title = 'Probleme incomplete, mai ușor de găsit';
    summary = 'Am adăugat organizarea problemelor care nu au încă enunțul și/sau soluția, grupate după clasă și dificultate.';
  } else if (/view|counter/.test(lower)) {
    title = 'Contoarele de vizualizări au fost eliminate';
    summary = 'Am eliminat afișarea și actualizarea contoarelor de vizualizări din paginile arhivei.';
  } else if (/logo|svg|style|design|palette|theme|interface|interfa/.test(lower)) {
    title = 'Interfața arhivei a fost actualizată';
    summary = 'Am îmbunătățit aspectul și elementele vizuale ale site-ului.';
  } else if (/license|terms|copyright|legal|restrict/.test(lower)) {
    title = 'Regulile de utilizare au fost clarificate';
    summary = 'Am actualizat informațiile despre drepturile asupra codului și resurselor proiectului.';
  } else if (/add|create|introduc|new page/.test(lower)) {
    title = 'O funcționalitate nouă în arhivă';
    summary = 'Am adăugat o funcționalitate nouă. Commitul oferă lista exactă a fișierelor și modificărilor.';
  } else if (/fix|correct|repair|bug/.test(lower)) {
    title = 'O problemă a fost corectată';
    summary = 'Am remediat o problemă de funcționare. Deschide commitul pentru detalii.';
  } else if (/sort|group|organ/.test(lower)) {
    title = 'Conținutul a fost reorganizat';
    summary = 'Am îmbunătățit ordinea și gruparea informațiilor din arhivă.';
  }

  const body = message.split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();
  const date = commit.commit?.committer?.date || commit.commit?.author?.date || null;
  return {
    sha: commit.sha.slice(0, 7),
    title,
    summary: body || summary,
    subject,
    date,
    url: 'https://github.com/ro-mihaiu/pbinfo/commit/' + commit.sha
  };
}

async function getRecentChangePosts() {
  if (changelogCache.posts && Date.now() < changelogCache.expiresAt) {
    return { posts: changelogCache.posts, stale: changelogCache.stale };
  }
  if (changelogFetchPromise) return changelogFetchPromise;

  changelogFetchPromise = (async () => {
    try {
      const postsByUrl = new Map(archivedChanges.map(post => [post.url, post]));
      for (let page = 1; ; page++) {
        const response = await fetch(CHANGELOG_API_URL + '&page=' + page, {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pbinfo-archive-changelog' },
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error('GitHub API returned ' + response.status);
        const commits = await response.json();
        for (const commit of commits) {
          const post = createChangePost(commit);
          if (post) postsByUrl.set(post.url, post);
        }
        if (commits.length < 100) break;
      }
      const posts = [...postsByUrl.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
      changelogCache = { expiresAt: Date.now() + CHANGELOG_CACHE_MS, posts, stale: false };
      return { posts, stale: false };
    } catch (err) {
      console.error('Failed to load GitHub changelog:', err.message);
      changelogCache.stale = true;
      changelogCache.expiresAt = Date.now() + 60 * 1000;
      return { posts: changelogCache.posts || [], stale: true };
    } finally {
      changelogFetchPromise = null;
    }
  })();

  return changelogFetchPromise;
}

app.get('/s', async (req, res) => {
  const changelog = await getRecentChangePosts();
  res.render('changes', {
    title: res.locals.t('nav_changes'),
    posts: changelog.posts,
    stale: changelog.stale,
    sourceUrl: 'https://github.com/ro-mihaiu/pbinfo/commits/main'
  });
});

// Homework index
app.get('/h', (req, res) => {
  const homework = store.getAllHomework();
  res.render('homework', {
    title: res.locals.t('homework_title'),
    homework
  });
});

// Homework by grade: /h/clasa-9
app.get('/h/clasa-:grade', (req, res) => {
  const grade = parseInt(req.params.grade, 10);
  if (!grades.GRADES.includes(grade)) {
    return nextNotFound(req, res);
  }
  const homework = store.getAllHomework().filter((h) => h.grade === grade);
  res.render('homework', {
    title: res.locals.t('homework_title'),
    homework,
    activeGrade: grade
  });
});

// Homework by grade/week: /h/clasa-9/s1
app.get('/h/clasa-:grade/s:week', (req, res) => {
  const grade = parseInt(req.params.grade, 10);
  if (!grades.GRADES.includes(grade)) {
    return nextNotFound(req, res);
  }
  const week = `s${req.params.week}`;
  renderHomeworkWeek(res, week, grade);
});

// Homework by week: /h/s1 or /h/2
app.get('/h/:week', (req, res) => {
  let week = req.params.week;
  if (/^\d+$/.test(week)) {
    week = `s${week}`;
  }
  renderHomeworkWeek(res, week);
});

// Backward-compatible redirects for old homework paths
app.get('/tema', (req, res) => {
  res.redirect(301, '/h');
});

app.get('/tema/clasa-:grade', (req, res) => {
  res.redirect(301, `/h/clasa-${req.params.grade}`);
});

app.get('/tema/clasa-:grade/s:week', (req, res) => {
  res.redirect(301, `/h/clasa-${req.params.grade}/s${req.params.week}`);
});

app.get('/tema/:week', (req, res) => {
  res.redirect(301, `/h/${req.params.week}`);
});

function renderHomeworkWeek(res, week, gradeFilter) {
  const meta = store.getHomeworkMeta(week, gradeFilter);
  const raw = meta ? meta.raw : null;
  if (!raw) {
    return res.status(404).render('error', {
      code: 404,
      title: res.locals.t('error_404_title'),
      text: res.locals.t('error_404_text')
    });
  }

  const parsed = parser.parseHomework(raw);
  if (!parsed.grade && meta) parsed.grade = meta.grade;
  const blocks = parser.parseMarkdownBlocks(parsed.content);
  const html = parser.blocksToHtml(blocks, makeLinkResolver());

  // Determine status for referenced problems (has solution or not)
  const allHomeworks = store.getAllHomework();

  res.render('homework-week', {
    title: `${res.locals.t('homework_title')} - ${week}`,
    week,
    grade: parsed.grade,
    html,
    allHomeworks,
    activeGrade: gradeFilter || parsed.grade,
    hasSolution: (id) => store.hasSolution(id)
  });
}

// Legal pages
app.get('/privacy', (req, res) => {
  res.render('legal', {
    title: res.locals.t('legal_privacy'),
    pageKey: 'privacy'
  });
});

app.get('/terms', (req, res) => {
  res.render('legal', {
    title: res.locals.t('legal_terms'),
    pageKey: 'terms'
  });
});

app.get('/cookies', (req, res) => {
  res.render('legal', {
    title: res.locals.t('legal_cookies'),
    pageKey: 'cookies'
  });
});

app.get('/embed', (req, res) => {
  res.render('embed', {
    title: 'Embed'
  });
});

// Client-side log endpoint
app.post('/client-log', (req, res) => {
  const payload = req.body || {};
  console.log('[client-log]', JSON.stringify(payload).slice(0, 500));
  res.status(200).json({ ok: true });
});

// Problem issue reports
async function sendIssueEmail(to, subject, text, replyTo) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.ISSUE_EMAIL_FROM || 'PBInfo Archive <dev@ro-mihaiu.xyz>',
      to: [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!response.ok) {
    console.error('Issue email failed:', response.status, await response.text());
    return false;
  }
  return true;
}

app.post('/p/:id/issues', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const problem = store.getProblemById(id);
  if (!problem) return nextNotFound(req, res);

  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  if (isRateLimited(ip)) return res.redirect(`/p/${id}?issue=rate-limit#issue-form`);
  const issue = String(req.body.issue || '').trim();
  const email = String(req.body.email || '').trim();
  const whatsapp = String(req.body.whatsapp || '').trim();
  const code = String(req.body.code || '').trim();
  const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phone = whatsapp.replace(/[\s().-]/g, '');
  const phoneOk = !whatsapp || /^@?[A-Za-z][A-Za-z0-9._]{2,31}$/.test(whatsapp) || /^(?:\+40|0040|0)7\d{8}$/.test(phone);
  let invalid = '';
  if (!issue) invalid = 'missing-description';
  else if (!email && !whatsapp) invalid = 'missing-contact';
  else if (!emailOk || email.length > 254) invalid = 'invalid-email';
  else if (!phoneOk || whatsapp.length > 100) invalid = 'invalid-whatsapp';
  else if (issue.length > 5000 || code.length > 20000) invalid = 'too-long';
  if (invalid) return res.redirect(`/p/${id}?issue=${invalid}#issue-form`);
  const saved = store.saveIssue({ problemId: id, issue, email: email || null, whatsapp: whatsapp || null, code: code || null });
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  let delivered = false;
  if (webhook) {
    try {
      const base = process.env.SITE_URL || 'https://pbinfo.ro-mihaiu.xyz';
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `Problema ${id}`,
            url: `${base}/p/${id}`,
            description: issue + (code ? `\n\n\`\`\`cpp\n${code.slice(0,1500)}\n\`\`\`` : ''),
            footer: { text: `Contact: ${email || '-'} | ${whatsapp || '-'}` }
          }]
        })
      });
      delivered = response.ok;
      if (!response.ok) console.error('discord webhook failed', response.status);
    } catch (e) { console.error('discord webhook failed', e.message); }
  }
  let ownerEmailed = false;
  let senderEmailed = false;
  const problemUrl = `${process.env.SITE_URL || 'https://pbinfo.ro-mihaiu.xyz'}/p/${id}`;
  try {
    ownerEmailed = await sendIssueEmail(
      'dev@ro-mihaiu.xyz',
      `[PBInfo] Raport pentru problema #${id}`,
      `A fost trimis un raport pentru problema #${id} (${problem.titles.ro}).\n\nPagina: ${problemUrl}\n\nDescriere:\n${issue}\n\nContact: ${email || 'fără email'}${whatsapp ? ` | WhatsApp: ${whatsapp}` : ''}${code ? `\n\nCod C++:\n${code}` : ''}`,
      email || undefined
    );
    if (email && (saved || delivered || ownerEmailed)) {
      senderEmailed = await sendIssueEmail(
        email,
        `Am primit raportul tău pentru problema #${id}`,
        `Salut!\n\nAm primit raportul tău pentru problema #${id} (${problem.titles.ro}). Îți mulțumim că ne-ai ajutat să îmbunătățim arhiva.\n\nPagina: ${problemUrl}\n\nMesajul tău:\n${issue}\n\nVom verifica problema și îți vom răspunde la această adresă dacă avem nevoie de detalii.\n\nEchipa PBInfo Archive\ndev@ro-mihaiu.xyz`
      );
    }
  } catch (err) {
    console.error('Issue email failed:', err.message);
  }
  if (email && ownerEmailed && !senderEmailed) console.error('Issue acknowledgment email was not delivered');
  return res.redirect(`/p/${id}?issue=${delivered || saved || ownerEmailed ? 'sent' : 'error'}#issue-form`);
});

// Problem detail renderer
async function renderProblemById(req, res) {
  const idParam = req.params.id;
  if (!/^\d+(\.\d+)?$/.test(idParam)) {
    return nextNotFound(req, res);
  }

  const id = parseInt(idParam, 10);
  const problem = store.getProblemById(id);
  if (!problem) {
    return nextNotFound(req, res);
  }

  const all = store.getProblems();
  const idx = all.findIndex((p) => p.id === id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  const solution = store.getSolution(id);
  const parsedStatement = store.getParsedStatement(id);
  const statement = (parsedStatement && parsedStatement.length > 0) ? parsedStatement : Object.entries({
    'Enunț': problem.details?.enunt,
    'Cerință': problem.details?.cerinta,
    'Date de intrare': problem.details?.date_intrare,
    'Date de ieșire': problem.details?.date_iesire,
    'Restricții și precizări': problem.details?.restrictii
  }).filter(([, content]) => content).map(([heading, content]) => ({ heading, content }));
  const examples = problem.details?.exemple || [];
  const officialPageMissing = await pbinfo.isOfficialPageMissing(id);

  res.render('problem', {
    title: `#${problem.id} · ${problem.titles?.ro || String(id)}`,
    problem,
    solution,
    hasSolution: !!solution,
    statement,
    officialPageMissing,
    officialProblemUrl: pbinfo.problemUrl(id),
    prev,
    next,
    difficultyLabel: grades.getDifficultyLabel(problem.difficulty),
    gradeLabel: grades.getGradeLabel(problem.grade),
    examples,
    issueStatus: req.query.issue || ''
  });
}

// Primary problem route
app.get('/p/:id', (req, res, next) => {
  renderProblemById(req, res).catch(next);
});

// Backward-compatible redirect: /problema/:id -> /p/:id
app.get('/problema/:id', (req, res) => {
  res.redirect(301, `/p/${req.params.id}`);
});

// Backward-compatible redirect: old /:id problem links -> /p/:id
app.get('/:id', (req, res) => {
  const idParam = req.params.id;
  if (!/^\d+(\.\d+)?$/.test(idParam)) {
    return nextNotFound(req, res);
  }
  const id = parseInt(idParam, 10);
  const problem = store.getProblemById(id);
  if (!problem) {
    return nextNotFound(req, res);
  }
  res.redirect(301, `/p/${id}`);
});

// 404 handler
function nextNotFound(req, res) {
  res.status(404).render('error', {
    code: 404,
    title: res.locals.t('error_404_title'),
    text: res.locals.t('error_404_text')
  });
}

app.use((req, res) => nextNotFound(req, res));

// 500 handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', {
    code: 500,
    title: res.locals.t('error_500_title'),
    text: res.locals.t('error_500_text')
  });
});

app.listen(PORT, () => {
  console.log(`Arhiva PBInfo rulând pe http://localhost:${PORT}`);
});
