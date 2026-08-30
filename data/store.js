'use strict';

const fs = require('fs');
const path = require('path');
const { parseStatement, parseHomework, parseMarkdownBlocks, parseIdFromFilename } = require('../lib/parser');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROBLEMS_FILE = path.join(DATA_DIR, 'problems.json');
const PROBLEMS_JSONL_FILE = path.join(DATA_DIR, 'problems.jsonl');
const ISSUES_FILE = path.join(DATA_DIR, 'issues.jsonl');
const VIEWS_FILE = path.join(DATA_DIR, 'views.json');
const SOLUTIONS_DIR = path.join(DATA_DIR, 'solutions');
const EXERCISES_DIR = path.join(DATA_DIR, 'exercises');
const HOMEWORK_DIR = path.join(DATA_DIR, 'homework');
const VIEWS_KEY = 'pbinfo:views';

// Vercel's filesystem is read-only between invocations. When Redis credentials
// are present, keep counters in Upstash Redis; otherwise retain local behavior.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
let redis = null;
if (redisUrl && redisToken) {
  try {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({ url: redisUrl, token: redisToken });
  } catch (err) {
    console.error('Failed to load Upstash Redis:', err.message);
  }
}

// --- Problems ---

function getProblems() {
  try {
    const raw = fs.readFileSync(PROBLEMS_JSONL_FILE, 'utf-8');
    const difficultyMap = { usoara: 1, ușoară: 1, usoară: 1, medie: 2, dificil: 3, dificila: 3, dificilă: 3, concurs: 4 };
    const problems = raw.split(/\r?\n/).filter(Boolean).map((line) => {
      try {
        const row = JSON.parse(line);
        return {
          id: Number(row.id),
          titles: { ro: row.title || `Problema ${row.id}`, en: '' },
          difficulty: typeof row.dificultate === 'number' ? row.dificultate : (difficultyMap[String(row.dificultate || '').toLowerCase()] || null),
          grade: row.clasa ?? null,
          tags: Array.isArray(row.tags) ? row.tags : [], notes: {},
          details: { enunt: row.enunt || '', cerinta: row.cerinta || '', date_intrare: row.date_intrare || '', date_iesire: row.date_iesire || '', restrictii: row.restrictii || '', exemple: Array.isArray(row.exemple) ? row.exemple : [] }
        };
      } catch (err) { return null; }
    }).filter((problem) => problem && Number.isInteger(problem.id));
    const byId = new Map(problems.map((problem) => [problem.id, problem]));
    for (let id = 1; id <= 4776; id += 1) {
      if (!byId.has(id)) byId.set(id, { id, titles: { ro: `Problema ${id}`, en: '' }, difficulty: null, grade: null, tags: [], notes: {}, details: { enunt: '', cerinta: '', date_intrare: '', date_iesire: '', restrictii: '', exemple: [] } });
    }
    return [...byId.values()].sort((a, b) => a.id - b.id);
  } catch (err) {
    console.error('Failed to read problems.jsonl:', err.message);
    return [];
  }
}

function getProblemMeta() {
  try {
    const raw = fs.readFileSync(PROBLEMS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data.meta || {};
  } catch (err) {
    return {};
  }
}

function getProblemById(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum) || idNum < 1 || idNum > 4776) return null;
  return getProblems().find((p) => p.id === idNum) || null;
}

function saveIssue(issue) {
  try {
    fs.appendFileSync(ISSUES_FILE, `${JSON.stringify({ ...issue, createdAt: new Date().toISOString() })}\n`, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save issue:', err.message);
    return false;
  }
}

function getProblemsByIds(ids) {
  const set = new Set(ids.map((i) => parseInt(i, 10)));
  return getProblems().filter((p) => set.has(p.id));
}

// --- Solutions ---

function getSolutionPath(id) {
  return path.join(SOLUTIONS_DIR, `${id}.cpp`);
}

function getSolution(id) {
  const file = getSolutionPath(id);
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch (err) {
    return null;
  }
}

function hasSolution(id) {
  try {
    return fs.existsSync(getSolutionPath(id));
  } catch (err) {
    return false;
  }
}

function listSolutionIds() {
  try {
    const files = fs.readdirSync(SOLUTIONS_DIR);
    return files
      .map((f) => parseIdFromFilename(f))
      .filter((id) => id !== null);
  } catch (err) {
    return [];
  }
}

// --- Statements / Exercises ---

function getExercisePath(id) {
  const txt = path.join(EXERCISES_DIR, `${id}.txt`);
  const md = path.join(EXERCISES_DIR, `${id}.md`);
  return fs.existsSync(txt) ? txt : fs.existsSync(md) ? md : null;
}

function getExercise(id) {
  const file = getExercisePath(id);
  if (!file) return null;
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch (err) {
    return null;
  }
}

function getParsedStatement(id) {
  const raw = getExercise(id);
  if (!raw) return null;
  return parseStatement(raw);
}

// --- Homework ---

function listHomeworkFiles() {
  try {
    return fs.readdirSync(HOMEWORK_DIR).filter((f) => /\.md$/.test(f)).sort();
  } catch (err) {
    return [];
  }
}

function getHomeworkFile(week) {
  const file = path.join(HOMEWORK_DIR, `${week}.md`);
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch (err) {
    return null;
  }
}

/**
 * Get all homework entries with parsed metadata.
 * @returns {Array<{week: string, grade: number|null, raw: string}>}
 */
function getAllHomework() {
  return listHomeworkFiles().map((file) => {
    const week = path.basename(file, '.md');
    const raw = getHomeworkFile(week);
    if (!raw) return { week, grade: null, raw: '' };
    const parsed = parseHomework(raw);
    return { week, grade: parsed.grade, raw };
  });
}

function getGradeOfHomework(week) {
  const raw = getHomeworkFile(week);
  if (!raw) return null;
  return parseHomework(raw).grade;
}

// --- Views ---

async function getViews() {
  if (redis) {
    try {
      return (await redis.hgetall(VIEWS_KEY)) || {};
    } catch (err) {
      console.error('Failed to read views from Redis:', err.message);
    }
  }

  try {
    if (!fs.existsSync(VIEWS_FILE)) return {};
    return JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}

async function getViewCount(id) {
  const key = String(id);
  if (redis) {
    try {
      return Number(await redis.hget(VIEWS_KEY, key)) || 0;
    } catch (err) {
      console.error('Failed to read view count from Redis:', err.message);
    }
  }
  const views = await getViews();
  return Number(views[key]) || 0;
}

async function incrementView(id) {
  const key = String(id);
  if (redis) {
    try {
      const count = await redis.get(`views:p:${key}`);
      if (count !== null) {
        return Number(count);
      }
      const hashCount = await redis.hget(VIEWS_KEY, key);
      return Number(hashCount) || 0;
    } catch (err) {
      console.error('Failed to read view count from Redis:', err.message);
    }
  }

  const views = await getViews();
  return Number(views[key]) || 0;
}

async function getTotalViews() {
  const views = await getViews();
  return Object.values(views).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
}

module.exports = {
  getProblems,
  getProblemMeta,
  getProblemById,
  getProblemsByIds,
  saveIssue,
  getSolution,
  getSolutionPath,
  hasSolution,
  listSolutionIds,
  getExercise,
  getExercisePath,
  getParsedStatement,
  listHomeworkFiles,
  getHomeworkFile,
  getAllHomework,
  getGradeOfHomework,
  getViews,
  getViewCount,
  incrementView,
  getTotalViews
};
