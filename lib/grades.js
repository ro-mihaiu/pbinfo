'use strict';

// Grade constants and labels (Romanian)
const GRADES = [9, 10, 11];

// Grade label map
const GRADE_LABELS = {
  9: 'Clasa a IX-a',
  10: 'Clasa a X-a',
  11: 'Clasa a XI-a'
};

// Difficulty labels (Romanian)
const DIFFICULTY_LABELS = {
  1: 'Ușor',
  2: 'Mediu',
  3: 'Dificil',
  4: 'Concurs'
};

// Difficulty short labels
const DIFFICULTY_SHORT = {
  1: 'ușoară',
  2: 'medie',
  3: 'dificilă',
  4: 'concurs'
};

function getGradeLabel(grade) {
  if (grade === undefined || grade === null || grade === '') return '';
  return GRADE_LABELS[grade] || `Clasa a ${grade}-a`;
}

function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || 'Mediu';
}

module.exports = {
  GRADES,
  GRADE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_SHORT,
  getGradeLabel,
  getDifficultyLabel
};
