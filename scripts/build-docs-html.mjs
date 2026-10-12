// scripts/build-docs-html.mjs
// Compiles the entire /docs markdown suite into standalone HTML files and a unified interactive portal.
import fs from 'node:fs';
import path from 'node:path';

const DOCS_DIR = path.resolve('docs');
const OUTPUT_INDEX = path.join(DOCS_DIR, 'index.html');

const DOC_FILES = [
  { id: 'audit', filename: 'AUDIT-REPORT.md', htmlName: 'AUDIT-REPORT.html', title: 'Executive Audit & System Summary' },
  { id: 'readme', filename: 'README.md', htmlName: 'README.html', title: 'Master Overview & Architecture Index' },
  { id: 'prd', filename: '01-PRD.md', htmlName: '01-PRD.html', title: '01 – Product Requirements Document' },
  { id: 'trd', filename: '02-TRD.md', htmlName: '02-TRD.html', title: '02 – Technical Requirements Document' },
  { id: 'flow', filename: '03-App-Flow.md', htmlName: '03-App-Flow.html', title: '03 – Application Flow & Screen Inventory' },
  { id: 'design', filename: '04-Design-Brief.md', htmlName: '04-Design-Brief.html', title: '04 – Design Brief & UI Tokens' },
  { id: 'schema', filename: '05-Backend-Schema.md', htmlName: '05-Backend-Schema.html', title: '05 – Backend Schema & API Catalog' },
  { id: 'plan', filename: '06-Implementation-Plan.md', htmlName: '06-Implementation-Plan.html', title: '06 – As-Built Implementation Plan' },
  { id: 'questions', filename: '07-Open-Questions.md', htmlName: '07-Open-Questions.html', title: '07 – Open Questions & Risk Registry' },
  { id: 'consistency', filename: '08-Consistency-Report.md', htmlName: '08-Consistency-Report.html', title: '08 – Codebase Consistency Audit' },
];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const htmlParts = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];
  let inList = false;
  let listType = 'ul';

  function flushList() {
    if (inList) {
      htmlParts.push(`</${listType}>`);
      inList = false;
    }
  }

  function flushTable() {
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<div class="table-container"><table>';
      const headerRow = tableRows[0];
      tableHtml += '<thead><tr>';
      headerRow.forEach((cell) => {
        tableHtml += `<th>${cell}</th>`;
      });
      tableHtml += '</tr></thead>';

      if (tableRows.length > 1) {
        tableHtml += '<tbody>';
        for (let i = 1; i < tableRows.length; i++) {
          tableHtml += '<tr>';
          tableRows[i].forEach((cell) => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody>';
      }
      tableHtml += '</table></div>';
      htmlParts.push(tableHtml);
      inTable = false;
      tableRows = [];
    }
  }

  function formatInline(str) {
    let s = escapeHtml(str);

    // Confidence tags with styled chips
    s = s.replace(/\[CONFIRMED:?\s*([^\]]*)\]/g, '<span class="badge badge-confirmed">CONFIRMED: $1</span>');
    s = s.replace(/\[CONFIRMED\]/g, '<span class="badge badge-confirmed">CONFIRMED</span>');
    s = s.replace(/\[INFERRED:?\s*([^\]]*)\]/g, '<span class="badge badge-inferred">INFERRED: $1</span>');
    s = s.replace(/\[INFERRED\]/g, '<span class="badge badge-inferred">INFERRED</span>');
    s = s.replace(/\[UNKNOWN:?\s*([^\]]*)\]/g, '<span class="badge badge-unknown">UNKNOWN: $1</span>');
    s = s.replace(/\[UNKNOWN\]/g, '<span class="badge badge-unknown">UNKNOWN</span>');

    // Bold + Italic
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Markdown Links -> Local HTML link replacement if target is one of our docs
    s = s.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, href) => {
      let targetHref = href;
      for (const f of DOC_FILES) {
        if (targetHref.endsWith(f.filename)) {
          targetHref = f.htmlName;
          break;
        }
      }
      const isExternal = targetHref.startsWith('http');
      return `<a href="${targetHref}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    });

    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const rawCode = codeBuffer.join('\n');
        if (codeLang.toLowerCase() === 'mermaid') {
          htmlParts.push(`<div class="mermaid-wrapper"><div class="mermaid-label">Diagram (${escapeHtml(codeLang)})</div><div class="mermaid">${escapeHtml(rawCode)}</div></div>`);
        } else {
          htmlParts.push(`<div class="code-block"><div class="code-header"><span>${escapeHtml(codeLang || 'plaintext')}</span><button class="copy-btn" onclick="copySnippet(this)">Copy</button></div><pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(rawCode)}</code></pre></div>`);
        }
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
        continue;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeBuffer = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      flushList();
      flushTable();
      htmlParts.push('<hr class="divider" />');
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      if (/^\|[\s:-|]+\|$/.test(line.trim())) {
        continue;
      }
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => formatInline(c.trim()));
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Blockquotes
    if (line.trim().startsWith('>')) {
      flushList();
      const quoteText = line.trim().replace(/^>\s?/, '');
      htmlParts.push(`<blockquote>${formatInline(quoteText)}</blockquote>`);
      continue;
    }

    // Headers
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      flushList();
      const text = h1[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      htmlParts.push(`<h1 id="${id}">${formatInline(text)}</h1>`);
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flushList();
      const text = h2[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      htmlParts.push(`<h2 id="${id}">${formatInline(text)}</h2>`);
      continue;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      flushList();
      const text = h3[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      htmlParts.push(`<h3 id="${id}">${formatInline(text)}</h3>`);
      continue;
    }
    const h4 = line.match(/^####\s+(.*)$/);
    if (h4) {
      flushList();
      const text = h4[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      htmlParts.push(`<h4 id="${id}">${formatInline(text)}</h4>`);
      continue;
    }

    // Lists
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
        htmlParts.push('<ul>');
      }
      let content = ulMatch[2];
      if (content.startsWith('[ ] ')) {
        content = `<input type="checkbox" disabled /> ` + content.slice(4);
      } else if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        content = `<input type="checkbox" checked disabled /> ` + content.slice(4);
      }
      htmlParts.push(`<li>${formatInline(content)}</li>`);
      continue;
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
        htmlParts.push('<ol>');
      }
      htmlParts.push(`<li>${formatInline(olMatch[2])}</li>`);
      continue;
    }

    flushList();

    if (line.trim().length === 0) {
      continue;
    }

    htmlParts.push(`<p>${formatInline(line.trim())}</p>`);
  }

  flushList();
  flushTable();

  return htmlParts.join('\n');
}

const COMMON_CSS = `
  :root {
    --color-brand-primary: #0f3d2e;
    --color-brand-primary-light: #165b45;
    --color-brand-accent: #d97706;
    --color-brand-accent-hover: #b45309;
    --color-bg-base: #0f172a;
    --color-bg-surface: #1e293b;
    --color-bg-surface-elevated: #334155;
    --color-text-main: #f8fafc;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-danger: #ef4444;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-sans);
    background-color: var(--color-bg-base);
    color: var(--color-text-main);
    line-height: 1.6;
  }
  a { color: #38bdf8; text-decoration: none; }
  a:hover { text-decoration: underline; }

  h1 {
    font-size: 2.2rem; font-weight: 800; color: #ffffff;
    margin-bottom: 1rem; border-bottom: 2px solid var(--color-border);
    padding-bottom: 0.5rem; letter-spacing: -0.03em;
  }
  h2 { font-size: 1.5rem; font-weight: 700; color: #ffffff; margin-top: 2rem; margin-bottom: 0.75rem; letter-spacing: -0.02em; }
  h3 { font-size: 1.2rem; font-weight: 600; color: #cbd5e1; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  h4 { font-size: 1rem; font-weight: 600; color: #94a3b8; margin-top: 1.25rem; margin-bottom: 0.25rem; }
  p { margin-bottom: 1.2rem; font-size: 0.95rem; color: #cbd5e1; }
  blockquote {
    border-left: 4px solid var(--color-brand-accent);
    background-color: rgba(217, 119, 6, 0.1);
    padding: 12px 18px; margin: 1.5rem 0; border-radius: 0 8px 8px 0;
    font-size: 0.9rem; color: #e2e8f0;
  }
  hr.divider { border: 0; height: 1px; background-color: var(--color-border); margin: 2rem 0; }
  ul, ol { margin: 0 0 1.5rem 1.5rem; color: #cbd5e1; font-size: 0.95rem; }
  li { margin-bottom: 0.4rem; }

  /* Badges */
  .badge { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; margin: 0 2px; vertical-align: middle; }
  .badge-confirmed { background-color: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
  .badge-inferred { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
  .badge-unknown { background-color: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

  /* Tables */
  .table-container { overflow-x: auto; margin: 1.5rem 0; border: 1px solid var(--color-border); border-radius: 8px; background-color: var(--color-bg-surface); }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
  th { background-color: rgba(0, 0, 0, 0.3); color: #e2e8f0; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
  td { padding: 10px 14px; border-bottom: 1px solid var(--color-border); color: #cbd5e1; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background-color: rgba(255, 255, 255, 0.02); }

  /* Code & Mermaid */
  code { font-family: var(--font-mono); font-size: 0.85em; background-color: rgba(0, 0, 0, 0.4); padding: 2px 5px; border-radius: 4px; color: #fca5a5; }
  .code-block, .mermaid-wrapper { margin: 1.5rem 0; background-color: #0b1120; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
  .code-header, .mermaid-label { display: flex; justify-content: space-between; align-items: center; background-color: rgba(0, 0, 0, 0.4); padding: 6px 12px; font-size: 0.75rem; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); font-family: var(--font-mono); }
  .copy-btn { background-color: var(--color-bg-surface-elevated); border: 1px solid var(--color-border); color: var(--color-text-main); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }
  .copy-btn:hover { background-color: var(--color-brand-accent); }
  pre { padding: 14px; overflow-x: auto; font-family: var(--font-mono); font-size: 0.85rem; color: #e2e8f0; line-height: 1.5; }
  pre code { background: none; padding: 0; color: inherit; }
  .mermaid { padding: 16px; overflow-x: auto; background-color: #0f172a; text-align: center; }

  @media print {
    body { background: #ffffff !important; color: #000000 !important; }
    .topbar, .copy-btn, .header-nav { display: none !important; }
    h1, h2, h3 { color: #000000 !important; }
    p, td, li { color: #222222 !important; }
    table, th, td { border-color: #cccccc !important; }
  }
`;

const MERMAID_SCRIPT = `
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    }
  </script>
`;

const COPY_SCRIPT = `
  <script>
    function copySnippet(button) {
      const code = button.closest('.code-block').querySelector('code').innerText;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = button.innerText;
        button.innerText = 'Copied!';
        setTimeout(() => { button.innerText = originalText; }, 2000);
      });
    }
  </script>
`;

console.log('Building HTML documentation suite from', DOCS_DIR);

const docsData = [];

for (const item of DOC_FILES) {
  const filePath = path.join(DOCS_DIR, item.filename);
  if (fs.existsSync(filePath)) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const parsedHtml = parseMarkdown(rawContent);

    docsData.push({
      id: item.id,
      filename: item.filename,
      htmlName: item.htmlName,
      title: item.title,
      html: parsedHtml,
    });

    // Also output standalone individual HTML file
    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(item.title)} | RideNDine Documentation</title>
  <style>
    ${COMMON_CSS}
    .header-nav {
      background-color: var(--color-bg-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .header-nav .brand {
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-nav .links {
      display: flex;
      gap: 16px;
      font-size: 0.875rem;
    }
    .container {
      max-width: 1024px;
      margin: 32px auto;
      padding: 0 24px;
    }
  </style>
</head>
<body>
  <div class="header-nav">
    <div class="brand">
      <a href="index.html" style="color: #ffffff; text-decoration: none;">RideNDine Documentation</a>
      <span class="badge badge-confirmed">Commit: 5599c2e5</span>
    </div>
    <div class="links">
      <a href="index.html">← Back to Portal</a>
      <a href="AUDIT-REPORT.html">Executive Summary</a>
      <a href="01-PRD.html">01-PRD</a>
      <a href="02-TRD.html">02-TRD</a>
      <a href="05-Backend-Schema.html">Schema</a>
      <button class="copy-btn" onclick="window.print()" style="padding: 4px 10px;">Print / PDF</button>
    </div>
  </div>

  <main class="container">
    ${parsedHtml}
  </main>

  ${COPY_SCRIPT}
  ${MERMAID_SCRIPT}
</body>
</html>`;

    const outPath = path.join(DOCS_DIR, item.htmlName);
    fs.writeFileSync(outPath, standaloneHtml, 'utf-8');
    console.log(`✓ Generated standalone ${item.htmlName}`);
  } else {
    console.warn(`! Missing source file: ${item.filename}`);
  }
}

// Generate the unified index.html portal
const portalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RideNDine Complete Technical Documentation Portal</title>
  <style>
    ${COMMON_CSS}
    body {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .sidebar {
      width: 330px;
      min-width: 330px;
      background-color: var(--color-bg-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      height: 100%;
      z-index: 20;
      transition: transform 0.3s ease;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(135deg, var(--color-brand-primary) 0%, #06231a 100%);
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .brand-badge {
      display: inline-block;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 9999px;
      background-color: var(--color-brand-accent);
      color: #ffffff;
      font-weight: 600;
      margin-top: 4px;
    }

    .search-box {
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      background-color: var(--color-bg-base);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text-main);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--color-brand-accent);
    }

    .doc-nav-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 8px;
      list-style: none;
    }

    .nav-item { margin-bottom: 4px; }

    .nav-link {
      display: block;
      padding: 10px 14px;
      border-radius: 6px;
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      cursor: pointer;
    }

    .nav-link:hover {
      background-color: var(--color-bg-surface-elevated);
      color: var(--color-text-main);
      text-decoration: none;
    }

    .nav-link.active {
      background-color: var(--color-brand-primary);
      color: #ffffff;
      font-weight: 600;
      border-left: 3px solid var(--color-brand-accent);
    }

    .sidebar-footer {
      padding: 14px 16px;
      border-top: 1px solid var(--color-border);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background-color: rgba(0, 0, 0, 0.2);
    }

    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    .topbar {
      height: 56px;
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      color: var(--color-text-main);
      font-size: 1.25rem;
      cursor: pointer;
    }

    .meta-badges {
      display: flex;
      gap: 12px;
      align-items: center;
      font-size: 0.8rem;
    }

    .meta-tag {
      background-color: var(--color-bg-base);
      border: 1px solid var(--color-border);
      padding: 4px 10px;
      border-radius: 4px;
      color: var(--color-text-muted);
    }

    .print-btn {
      background-color: var(--color-bg-surface-elevated);
      color: var(--color-text-main);
      border: 1px solid var(--color-border);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
    }
    .print-btn:hover {
      background-color: var(--color-brand-primary);
      border-color: var(--color-brand-primary-light);
    }

    .content-pane {
      flex: 1;
      overflow-y: auto;
      padding: 40px 60px;
      scroll-behavior: smooth;
    }

    .doc-section {
      display: none;
      max-width: 1024px;
      margin: 0 auto;
    }

    .doc-section.active {
      display: block;
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 900px) {
      .sidebar { position: absolute; left: -330px; }
      .sidebar.open { left: 0; }
      .mobile-menu-btn { display: block; }
      .content-pane { padding: 20px 16px; }
    }
  </style>
</head>
<body>

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="brand-title">RideNDine</div>
      <div class="brand-badge">Audit & Spec Portal</div>
    </div>

    <div class="search-box">
      <input type="text" id="searchInput" class="search-input" placeholder="Search documents..." />
    </div>

    <ul class="doc-nav-list" id="docNav">
      ${docsData
        .map(
          (doc, index) => `
        <li class="nav-item">
          <a class="nav-link ${index === 0 ? 'active' : ''}" onclick="switchDoc('${doc.id}', event)">
            ${doc.title}
          </a>
        </li>`
        )
        .join('')}
    </ul>

    <div class="sidebar-footer">
      <div>Commit: <strong>5599c2e5</strong></div>
      <div>Audit Date: <strong>October 7, 2026</strong></div>
    </div>
  </aside>

  <div class="main-wrapper">
    <header class="topbar">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span id="activeDocTitle" style="font-weight: 600; font-size: 0.95rem;">${docsData[0].title}</span>
      </div>

      <div class="meta-badges">
        <span class="meta-tag">104 Pages / 354 APIs</span>
        <span class="meta-tag">112 Tables</span>
        <span class="meta-tag">Score: 4.6/5.0</span>
        <button class="print-btn" onclick="window.print()">Print / PDF</button>
      </div>
    </header>

    <main class="content-pane" id="contentPane">
      ${docsData
        .map(
          (doc, index) => `
        <article class="doc-section ${index === 0 ? 'active' : ''}" id="doc-${doc.id}">
          ${doc.html}
        </article>`
        )
        .join('')}
    </main>
  </div>

  <script>
    function switchDoc(docId, ev) {
      document.querySelectorAll('.doc-section').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

      const targetDoc = document.getElementById('doc-' + docId);
      if (targetDoc) {
        targetDoc.classList.add('active');
      }

      if (ev && ev.currentTarget) {
        ev.currentTarget.classList.add('active');
        document.getElementById('activeDocTitle').innerText = ev.currentTarget.innerText;
      }
      document.getElementById('contentPane').scrollTop = 0;

      if (window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.remove('open');
      }
    }

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
    }

    document.getElementById('searchInput').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase().trim();
      const navLinks = document.querySelectorAll('.nav-link');

      navLinks.forEach(link => {
        const text = link.innerText.toLowerCase();
        if (text.includes(query) || query === '') {
          link.closest('.nav-item').style.display = 'block';
        } else {
          link.closest('.nav-item').style.display = 'none';
        }
      });
    });
  </script>
  ${COPY_SCRIPT}
  ${MERMAID_SCRIPT}
</body>
</html>`;

fs.writeFileSync(OUTPUT_INDEX, portalHtml, 'utf-8');
console.log('✓ Successfully generated unified portal at:', OUTPUT_INDEX);
