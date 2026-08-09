'use strict';

const fs = require('fs');
const path = require('path');
const { parseStatement, parseHomework, parseMarkdownBlocks, parseIdFromFilename } = require('../lib/parser');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROBLEMS_FILE = path.join(DATA_DIR, 'problems.json');
const VIEWS_FILE = path.join(DATA_DIR, 'views.json');
const SOLUTIONS_DIR = path.join(DATA_DIR, 'solutions');
const EXERCISES_DIR = path.join(DATA_DIR, 'exercises');
const HOMEWORK_DIR = path.join(DATA_DIR, 'homework');

// --- Problems ---

function getProblems() {
  try {
    const raw = fs.readFileSync(PROBLEMS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.problems) ? data.problems : [];
  } catch (err) {
    console.error('Failed to read problems.json:', err.message);
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
  if (isNaN(idNum)) return null;
  return getProblems().find((p) => p.id === idNum) || null;
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

function getViews() {
  try {
    if (!fs.existsSync(VIEWS_FILE)) return {};
    return JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}

function getViewCount(id) {
  const views = getViews();
  const key = String(id);
  return views[key] || 0;
}

function incrementView(id) {
  const views = getViews();
  const key = String(id);
  views[key] = (views[key] || 0) + 1;
  try {
    fs.writeFileSync(VIEWS_FILE, JSON.stringify(views, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write views.json:', err.message);
  }
  return views[key];
}

function getTotalViews() {
  const views = getViews();
  return Object.values(views).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
}

module.exports = {
  getProblems,
  getProblemMeta,
  getProblemById,
  getProblemsByIds,
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
