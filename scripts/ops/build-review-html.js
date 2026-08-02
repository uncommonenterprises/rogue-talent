/**
 * scripts/ops/build-review-html.js
 * ---------------------------------------------------------------------------
 * Turn a PM proposals markdown file into a single self-contained HTML reading
 * view — every proposal in full (screen, user reaction, severity, proposal,
 * files, effort, impact) with its evidence screenshot(s) inlined as data URLs,
 * so the .html works on its own with no external files.
 *
 * This is a STANDING output of every product-manager run: after the PM agent
 * writes ux-reports/proposals/<journey>-<date>.md, run this to produce
 * ux-reports/review/<journey>-<date>.html. (The PM agent is sandboxed without
 * Bash and cannot base64-encode images itself, so the orchestrating Claude Code
 * runs this generator as the final step of the run — see
 * .claude/agents/product-manager.md.)
 *
 * The HTML is a READ-ONLY reading view. Approval still happens by editing the
 * Status:/Note: lines in the markdown — never in the HTML.
 *
 * USAGE:
 *   node scripts/ops/build-review-html.js [path/to/proposals.md]
 *   # with no arg, uses the most-recently-modified file in ux-reports/proposals/
 * ---------------------------------------------------------------------------
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const PROPOSALS_DIR = path.join(REPO_ROOT, 'ux-reports', 'proposals');
const REVIEW_DIR = path.join(REPO_ROOT, 'ux-reports', 'review');

const KEYS = [
  'Journey', 'Screen', 'Severity', 'Evidence', 'User view',
  'Proposal', 'Touches', 'Effort', 'Impact', 'Status', 'Note',
];
const KEY_RE = new RegExp('^(' + KEYS.map(k => k.replace(/ /g, '\\s')).join('|') + '):\\s?(.*)$');

function pickProposalsFile(argPath) {
  if (argPath) return path.resolve(argPath);
  const files = fs
    .readdirSync(PROPOSALS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('sample-'))
    .map(f => ({ f, m: fs.statSync(path.join(PROPOSALS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!files.length) {
    console.error('No proposals .md files found in', PROPOSALS_DIR);
    process.exit(1);
  }
  return path.join(PROPOSALS_DIR, files[0].f);
}

function parse(md) {
  const lines = md.split(/\r?\n/);
  const header = { title: '', meta: '', intro: [] };
  const proposals = [];
  let cur = null; // current proposal
  let field = null; // current field key being accumulated
  let seenFirstProposal = false;

  const pushLine = (obj, key, text) => {
    obj[key] = obj[key] ? obj[key] + '\n' + text : text;
  };

  for (const line of lines) {
    if (line.startsWith('# ')) {
      header.title = line.slice(2).trim();
      continue;
    }
    const propMatch = line.match(/^##\s+(RT-[0-9]+-[0-9]+)\s*[—-]\s*(.*)$/);
    if (propMatch) {
      seenFirstProposal = true;
      cur = { id: propMatch[1], title: propMatch[2].trim() };
      proposals.push(cur);
      field = null;
      continue;
    }
    if (line.trim() === '---') { field = null; continue; }

    if (!seenFirstProposal) {
      // still in header/intro region
      if (!header.meta && /^Agent run:/i.test(line)) { header.meta = line.trim(); continue; }
      if (line.trim()) header.intro.push(line.trim());
      continue;
    }

    // inside a proposal
    const km = line.match(KEY_RE);
    if (km) {
      field = km[1].replace(/\s+/g, ' ');
      cur[field] = km[2].trim();
    } else if (field && line.trim()) {
      pushLine(cur, field, line.trim());
    }
  }
  return { header, proposals };
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// minimal inline markdown: **bold**, `code`
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>');
}

// join accumulated multi-line field into flowing text
function flow(s) {
  return inline(String(s || '').replace(/\n+/g, ' ').trim());
}

function extractScreenshots(evidence) {
  if (!evidence) return [];
  return evidence
    .split(',')
    .map(s => s.trim())
    .map(s => {
      const m = s.match(/screenshots\/[\w.\-]+\.(?:png|jpe?g)/i);
      return m ? m[0] : null;
    })
    .filter(Boolean);
}

function dataUrl(relFromUxReports) {
  const abs = path.join(REPO_ROOT, 'ux-reports', relFromUxReports);
  if (!fs.existsSync(abs)) return null;
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const b64 = fs.readFileSync(abs).toString('base64');
  return `data:image/${mime};base64,${b64}`;
}

function sevClass(sev) {
  const s = (sev || '').toLowerCase();
  if (s.includes('blocker')) return 'sev-blocker';
  if (s.includes('friction')) return 'sev-friction';
  return 'sev-polish';
}

function build({ header, proposals }, sourceBasename) {
  const cards = proposals.map(p => {
    const shots = extractScreenshots(p.Evidence)
      .map(rel => ({ rel, url: dataUrl(rel) }))
      .filter(x => x.url);
    const imgs = shots.length
      ? shots
          .map(
            s =>
              `<figure><img src="${s.url}" alt="${esc(s.rel)}" loading="lazy"><figcaption>${esc(
                s.rel.replace('screenshots/', '')
              )}</figcaption></figure>`
          )
          .join('\n')
      : '<div class="no-shot">No screenshot — server-side / config observation</div>';

    return `
    <article class="card" id="${esc(p.id)}">
      <div class="card-head">
        <span class="badge ${sevClass(p.Severity)}">${esc((p.Severity || '').toUpperCase())}</span>
        <h2><span class="rid">${esc(p.id)}</span> ${inline(p.title)}</h2>
        <span class="status">Status: ${esc(p.Status || 'PENDING')}</span>
      </div>
      <div class="card-body">
        <div class="detail">
          <dl>
            <dt>Screen</dt><dd>${flow(p.Screen)}</dd>
            <dt>Effort · Impact</dt><dd><span class="pill">${esc(p.Effort || '?')}</span> ${flow(p.Impact)}</dd>
          </dl>
          <div class="uv"><span class="uv-label">What the model thinks</span><blockquote>${flow(p['User view'])}</blockquote></div>
          <div class="prop"><span class="prop-label">Proposed change</span><p>${flow(p.Proposal)}</p></div>
          <div class="touches"><span class="touches-label">Likely touches</span><p>${flow(p.Touches)}</p></div>
        </div>
        <div class="shots">${imgs}</div>
      </div>
    </article>`;
  });

  const counts = proposals.reduce((a, p) => {
    const c = sevClass(p.Severity).replace('sev-', '');
    a[c] = (a[c] || 0) + 1;
    return a;
  }, {});

  const introHtml = header.intro
    .filter(Boolean)
    .map(par => `<p>${inline(par)}</p>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(header.title || 'UX Review')}</title>
<style>
  :root{
    --accent:#2B57FF; --ink900:#14161c; --ink700:#3a3f4b; --ink500:#6b7280;
    --ink200:#e4e7ec; --ink100:#f2f4f7; --surface:#ffffff; --page:#f7f8fa;
    --red:#d23b3b; --amber:#b7791f; --amber-bg:#fff6e6; --red-bg:#fdecec;
    --hair:#e4e7ec;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --ink900:#f2f4f7; --ink700:#c7cbd4; --ink500:#9aa1ad; --ink200:#2c313c;
      --ink100:#20242d; --surface:#171a21; --page:#0f1116; --hair:#2c313c;
      --amber:#e0a94a; --amber-bg:#2a2314; --red:#f0716f; --red-bg:#2a1717;
    }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--page);color:var(--ink900);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    line-height:1.5;font-size:15px}
  .wrap{max-width:1100px;margin:0 auto;padding:32px 20px 80px}
  header.top{border-bottom:2px solid var(--ink900);padding-bottom:18px;margin-bottom:8px}
  h1{font-size:26px;margin:0 0 6px;letter-spacing:-0.01em}
  .meta{color:var(--ink500);font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .readonly{background:var(--accent);color:#fff;border-radius:8px;padding:10px 14px;margin:16px 0 24px;
    font-size:13.5px;font-weight:600;display:flex;gap:8px;align-items:center}
  .summary{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}
  .chip{border:1px solid var(--hair);border-radius:999px;padding:4px 12px;font-size:12.5px;font-weight:600;background:var(--surface)}
  .chip b{font-weight:700}
  .intro{background:var(--surface);border:1px solid var(--hair);border-left:3px solid var(--accent);
    border-radius:8px;padding:14px 16px;margin:0 0 28px;font-size:14px;color:var(--ink700)}
  .intro p{margin:0 0 10px}.intro p:last-child{margin:0}
  .card{background:var(--surface);border:1px solid var(--hair);border-radius:12px;
    margin:0 0 22px;overflow:hidden;scroll-margin-top:16px}
  .card-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
    padding:14px 18px;border-bottom:1px solid var(--hair)}
  .card-head h2{font-size:17px;margin:0;flex:1;min-width:240px;letter-spacing:-0.01em}
  .rid{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:var(--ink500);margin-right:6px}
  .status{font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--ink500);
    font-family:ui-monospace,Menlo,monospace}
  .badge{font-size:11px;font-weight:800;letter-spacing:.06em;padding:4px 9px;border-radius:6px;white-space:nowrap}
  .sev-blocker{background:var(--red-bg);color:var(--red)}
  .sev-friction{background:var(--amber-bg);color:var(--amber)}
  .sev-polish{background:var(--ink100);color:var(--ink500)}
  .card-body{display:grid;grid-template-columns:1fr 0.85fr;gap:0}
  .detail{padding:16px 18px;min-width:0}
  .shots{padding:16px 18px;background:var(--ink100);display:flex;flex-direction:column;gap:14px;min-width:0}
  dl{margin:0 0 12px;display:grid;grid-template-columns:auto 1fr;gap:4px 14px}
  dt{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink500);padding-top:2px}
  dd{margin:0;font-size:14px}
  .pill{display:inline-block;background:var(--ink900);color:var(--surface);border-radius:5px;
    padding:1px 7px;font-size:11px;font-weight:700;margin-right:4px}
  .uv,.prop,.touches{margin:12px 0 0}
  .uv-label,.prop-label,.touches-label{display:block;font-size:11px;font-weight:700;
    text-transform:uppercase;letter-spacing:.05em;color:var(--ink500);margin-bottom:4px}
  blockquote{margin:0;padding:10px 12px;border-left:3px solid var(--ink200);background:var(--page);
    border-radius:0 6px 6px 0;font-style:italic;color:var(--ink700);font-size:14px}
  .prop p{margin:0;font-size:14px}
  .touches p{margin:0;font-size:12.5px;color:var(--ink500);font-family:ui-monospace,Menlo,monospace;
    word-break:break-word}
  code{background:var(--ink100);border:1px solid var(--hair);border-radius:4px;padding:0 4px;
    font-size:12px;font-family:ui-monospace,Menlo,monospace}
  figure{margin:0}
  figure img{width:100%;height:auto;border:1px solid var(--hair);border-radius:8px;display:block;background:#fff}
  figcaption{font-size:11px;color:var(--ink500);margin-top:5px;font-family:ui-monospace,Menlo,monospace}
  .no-shot{color:var(--ink500);font-size:13px;font-style:italic;align-self:center;text-align:center;padding:24px 8px}
  footer{margin-top:32px;color:var(--ink500);font-size:12px;text-align:center}
  @media (max-width:760px){
    .card-body{grid-template-columns:1fr}
    .shots{background:var(--surface);border-top:1px solid var(--hair)}
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1>${esc(header.title || 'UX Review')}</h1>
    <div class="meta">${esc(header.meta)}</div>
  </header>
  <div class="readonly">Reading view — approval happens in the markdown file (edit the Status: lines there). Nothing here changes state.</div>
  <div class="summary">
    <span class="chip"><b>${proposals.length}</b> proposals</span>
    <span class="chip sev-blocker"><b>${counts.blocker || 0}</b> blocker</span>
    <span class="chip sev-friction"><b>${counts.friction || 0}</b> friction</span>
    <span class="chip sev-polish"><b>${counts.polish || 0}</b> polish</span>
  </div>
  ${introHtml ? `<div class="intro">${introHtml}</div>` : ''}
  ${cards.join('\n')}
  <footer>Generated from ${esc(sourceBasename)} · scripts/ops/build-review-html.js · read-only</footer>
</div>
</body>
</html>`;
}

function main() {
  const src = pickProposalsFile(process.argv[2]);
  const md = fs.readFileSync(src, 'utf8');
  const parsed = parse(md);
  const base = path.basename(src, '.md');
  const html = build(parsed, base + '.md');
  if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });
  const out = path.join(REVIEW_DIR, base + '.html');
  fs.writeFileSync(out, html);
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  console.log(`Wrote ${path.relative(REPO_ROOT, out)} (${parsed.proposals.length} proposals, ${kb} KB)`);
}

main();
