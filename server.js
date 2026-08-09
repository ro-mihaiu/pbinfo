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
  return (id) => (idSet.has(id) ? `/problema/${id}` : null);
}

// Count solutions for stats
function countSolutions() {
  return store.listSolutionIds().length;
}

// --- Routes ---

// Home
app.get('/', (req, res) => {
  const problems = store.getProblems();
  const totalSolutions = countSolutions();
  const totalViews = store.getTotalViews();
  const recent = [...problems].sort((a, b) => b.id - a.id).slice(0, 6);

  res.render('home', {
    title: i18n.t('brand'),
    totalProblems: problems.length,
    totalSolutions,
    totalViews,
    recent
  });
});

// Archive
app.get('/archive', (req, res) => {
  const problems = store.getProblems();
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const grade = req.query.grade || '';
  const tag = req.query.tag || '';

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

  if (tag) {
    filtered = filtered.filter((p) => (p.tags || []).includes(tag));
  }

  // Collect all unique tags for the filter dropdown
  const allTags = [...new Set(problems.flatMap((p) => (p.tags || []).map((t) => t.toLowerCase())))].sort();

  res.render('archive', {
    title: i18n.t('archive_title'),
    problems: filtered,
    totalResults: filtered.length,
    query: req.query.q || '',
    selectedGrade: grade,
    selectedTag: tag,
    allTags,
    hasSolution: (id) => store.hasSolution(id)
  });
});

// Homework index
app.get('/tema', (req, res) => {
  const homework = store.getAllHomework();
  res.render('homework', {
    title: i18n.t('homework_title'),
    homework
  });
});

// Homework by grade: /tema/clasa-9
app.get('/tema/clasa-:grade', (req, res) => {
  const grade = parseInt(req.params.grade, 10);
  const homework = store.getAllHomework().filter((h) => h.grade === grade);
  res.render('homework', {
    title: i18n.t('homework_title'),
    homework,
    activeGrade: grade
  });
});

// Homework by grade/week: /tema/clasa-9/s1
app.get('/tema/clasa-:grade/s:week', (req, res) => {
  const grade = parseInt(req.params.grade, 10);
  const week = `s${req.params.week}`;
  renderHomeworkWeek(res, week, grade);
});

// Homework by week: /tema/s1 or /tema/2
app.get('/tema/:week', (req, res) => {
  let week = req.params.week;
  if (/^\d+$/.test(week)) {
    week = `s${week}`;
  }
  renderHomeworkWeek(res, week);
});

function renderHomeworkWeek(res, week, gradeFilter) {
  const raw = store.getHomeworkFile(week);
  if (!raw) {
    return res.status(404).render('error', {
      code: 404,
      title: i18n.t('error_404_title'),
      text: i18n.t('error_404_text')
    });
  }

  const parsed = parser.parseHomework(raw);
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

// Client-side log endpoint
app.post('/client-log', (req, res) => {
  const payload = req.body || {};
  console.log('[client-log]', JSON.stringify(payload).slice(0, 500));
  res.status(200).json({ ok: true });
});

// Problem detail: GET /problema/:id (numeric only)
app.get('/problema/:id', (req, res) => {
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
  const statement = store.getParsedStatement(id);
  const views = store.incrementView(id);

  res.render('problem', {
    title: problem.titles?.ro || String(id),
    problem,
    solution,
    hasSolution: !!solution,
    statement,
    views,
    prev,
    next,
    difficultyLabel: grades.getDifficultyLabel(problem.difficulty),
    gradeLabel: grades.getGradeLabel(problem.grade)
  });
});

// Backward-compatible redirect: old /:id problem links -> /problema/:id
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
  res.redirect(301, `/problema/${id}`);
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
