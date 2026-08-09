'use strict';

const fs = require('fs');
const path = require('path');

// Recognized PBInfo-style statement headings (Romanian)
const HEADINGS = [
  'Cerința',
  'Cerinţa',
  'Date de intrare',
  'Date de ieșire',
  'Date de iesire',
  'Restricții și precizări',
  'Restricţii şi precizări',
  'Exemplu',
  'Explicație',
  'Explicatie'
];

/**
 * Parse a raw statement text into structured sections.
 * Any text before the first recognized heading becomes the intro.
 * @param {string} raw The raw exercise text.
 * @returns {Array<{heading: string|null, content: string}>}
 */
function parseStatement(raw) {
  if (!raw) return [];

  const lines = String(raw).replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let currentHeading = null;
  let currentContent = [];

  const flush = () => {
    if (currentHeading !== undefined && currentHeading !== null) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n').trim()
      });
    } else if (currentContent.join('\n').trim()) {
      sections.push({
        heading: null,
        content: currentContent.join('\n').trim()
      });
    }
    currentContent = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    let matched = null;
    for (const h of HEADINGS) {
      if (trimmed === h || trimmed.replace(/[:#\s]+$/, '') === h) {
        matched = h;
        break;
      }
    }
    if (matched) {
      flush();
      currentHeading = matched;
    } else {
      currentContent.push(line);
    }
  }
  flush();

  return sections.filter((s) => s.content.length > 0);
}

/**
 * Extract the numeric problem ID from a filename.
 * e.g. "1234.cpp" -> 1234, "1234.txt" -> 1234
 * @param {string} filename
 * @returns {number|null}
 */
function parseIdFromFilename(filename) {
  if (!filename) return null;
  const base = path.basename(filename);
  const match = base.match(/^(\d+)(?:\.[a-zA-Z]+)?$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse a homework markdown-like file into {grade, week, content}.
 * Supports simple frontmatter with grade/week values.
 * @param {string} raw
 */
function parseHomework(raw) {
  if (!raw) return { grade: null, week: null, content: '' };

  const text = String(raw).replace(/\r\n/g, '\n');
  let grade = null;
  let week = null;
  let content = text;

  // Frontmatter: ---\nkey: value\n---\n
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (fmMatch) {
    const lines = fmMatch[1].split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z]+)\s*:\s*(.+)\s*$/);
      if (m) {
        const key = m[1].toLowerCase();
        const value = m[2].trim();
        if (key === 'grade') grade = parseInt(value.replace(/\D/g, ''), 10) || null;
        if (key === 'week') week = value;
      }
    }
    content = text.slice(fmMatch[0].length);
  }

  return { grade, week, content };
}

/**
 * Parse markdown-like content into an HTML-safe structured array.
 * Returns array of blocks: {type: 'h1'|'h2'|'p'|'ul'|'ol'|'code', content, items}
 */
function parseMarkdownBlocks(content) {
  if (!content) return [];
  const lines = String(content).split('\n');
  const blocks = [];
  let listBuffer = null; // {type, items}

  const flushList = () => {
    if (listBuffer) {
      blocks.push({ ...listBuffer });
      listBuffer = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    // Heading levels
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      flushList();
      blocks.push({ type: hMatch[1].length === 1 ? 'h1' : 'h2', content: hMatch[2] });
      continue;
    }
    // Unordered list
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }
    // Ordered list
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(olMatch[1]);
      continue;
    }
// Fenced code block
    const codeFence = trimmed.match(/^```\s*([a-zA-Z]*)\s*$/);
    if (codeFence) {
      flushList();
      blocks.push({ type: 'code', lang: codeFence[1] || '', content: '' });
      continue;
    }
    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    // Paragraph
    flushList();
    blocks.push({ type: 'p', content: trimmed });
  }
  flushList();

  // Post-process fenced code blocks: merge lines between fences
  const result = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  for (const block of blocks) {
    if (block.type === 'code') {
      if (inCode) {
        // closing fence
        result.push({ type: 'code', lang: codeLang, content: codeLines.join('\n') });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
        codeLang = block.lang;
      }
      continue;
    }
    if (inCode) {
      // plain line inside code block
      codeLines.push(block.type === 'p' ? block.content : block.content);
    } else {
      result.push(block);
    }
  }
  if (inCode) {
    result.push({ type: 'code', lang: codeLang, content: codeLines.join('\n') });
  }
  return result;
}

/**
 * Convert parsed markdown blocks into HTML string (safe, links, code).
 * Exercise references like "1234" or "1234.cpp" become clickable links.
 * @param {Array} blocks blocks from parseMarkdownBlocks
 * @param {function} linkResolver optional function(id) => href or null
 */
function blocksToHtml(blocks, linkResolver) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');

  // Turn inline code and links into HTML
  const inline = (text) => {
    // escape first
    let out = esc(text);
    // inline code `x`
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    // markdown links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return out;
  };

  // Link exercise references (standalone numbers like 1234 or 1234.cpp)
  const withRefs = (text) => {
    if (!linkResolver) return text;
    return text.replace(/(\b\d{2,6}\b)(?:\.cpp\b)?/g, (m, id) => {
      const href = linkResolver(parseInt(id, 10));
      if (href) {
        return `<a href="${href}" class="exercise-link">${m}</a>`;
      }
      return m;
    });
  };

  const renderBlock = (b) => {
    switch (b.type) {
      case 'h1':
        return `<h2 class="hw-h">${inline(withRefs(b.content))}</h2>`;
      case 'h2':
        return `<h3 class="hw-h">${inline(withRefs(b.content))}</h3>`;
      case 'p':
        return `<p>${inline(withRefs(b.content))}</p>`;
      case 'ul':
        return `<ul>${b.items.map((i) => `<li>${inline(withRefs(i))}</li>`).join('')}</ul>`;
      case 'ol':
        return `<ol>${b.items.map((i) => `<li>${inline(withRefs(i))}</li>`).join('')}</ol>`;
      case 'code':
        return `<pre class="hw-code"><code class="language-${esc(b.lang)}">${esc(b.content)}</code></pre>`;
      case 'hr':
        return `<hr>`;
      default:
        return '';
    }
  };

  return (blocks || []).map(renderBlock).join('\n');
}

module.exports = {
  HEADINGS,
  parseStatement,
  parseIdFromFilename,
  parseHomework,
  parseMarkdownBlocks,
  blocksToHtml
};
