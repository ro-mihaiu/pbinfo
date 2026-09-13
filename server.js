'use strict';

const path = require('path');
const express = require('express');
const store = require('./data/store');
const i18n = require('./lib/i18n');
const grades = require('./lib/grades');
const parser = require('./lib/parser');

const app = express();
const PORT = process.env.PORT || 3000;

// --- App Settings ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Provide shared locals to all views
app.use((req, res, next) => {
  res.locals.t = i18n.t;
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
    const totalViews = await store.getTotalViews();
    const recent = [...problems].sort((a, b) => b.id - a.id).slice(0, 6);

    res.render('home', {
      totalProblems: problems.length,
      totalSolutions,
      totalViews,
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
    title: i18n.t('archive_title'),
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

// Homework index
app.get('/h', (req, res) => {
  const homework = store.getAllHomework();
  res.render('homework', {
    title: i18n.t('homework_title'),
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
    title: i18n.t('homework_title'),
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
      title: i18n.t('error_404_title'),
      text: i18n.t('error_404_text')
    });
  }

  const parsed = parser.parseHomework(raw);
  if (!parsed.grade && meta) parsed.grade = meta.grade;
  const blocks = parser.parseMarkdownBlocks(parsed.content);
  const html = parser.blocksToHtml(blocks, makeLinkResolver());

  // Determine status for referenced problems (has solution or not)
  const allHomeworks = store.getAllHomework();

  res.render('homework-week', {
    title: `${i18n.t('homework_title')} - ${week}`,
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
    title: i18n.t('legal_privacy'),
    pageKey: 'privacy'
  });
});

app.get('/terms', (req, res) => {
  res.render('legal', {
    title: i18n.t('legal_terms'),
    pageKey: 'terms'
  });
});

app.get('/cookies', (req, res) => {
  res.render('legal', {
    title: i18n.t('legal_cookies'),
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
app.post('/p/:id/issues', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const problem = store.getProblemById(id);
  if (!problem) return nextNotFound(req, res);

  const issue = String(req.body.issue || '').trim();
  const email = String(req.body.email || '').trim();
  const whatsapp = String(req.body.whatsapp || '').trim();
  if (!issue || (!email && !whatsapp) || issue.length > 5000 || email.length > 254 || whatsapp.length > 100) {
    return res.status(400).redirect(`/p/${id}?issue=invalid#issue-form`);
  }
  const saved = store.saveIssue({ problemId: id, issue, email: email || null, whatsapp: whatsapp || null });
  return res.redirect(`/p/${id}?issue=${saved ? 'sent' : 'error'}#issue-form`);
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
  const views = await store.incrementView(id);

  res.render('problem', {
    title: `#${problem.id} · ${problem.titles?.ro || String(id)}`,
    problem,
    solution,
    hasSolution: !!solution,
    statement,
    views,
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
    title: i18n.t('error_404_title'),
    text: i18n.t('error_404_text')
  });
}

app.use((req, res) => nextNotFound(req, res));

// 500 handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', {
    code: 500,
    title: i18n.t('error_500_title'),
    text: i18n.t('error_500_text')
  });
});

app.listen(PORT, () => {
  console.log(`Arhiva PBInfo rulând pe http://localhost:${PORT}`);
});
