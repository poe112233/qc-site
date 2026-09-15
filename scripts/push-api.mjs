import fs from 'fs';
import path from 'path';

const TOKEN = process.env.GH_TOKEN;
const REPO = 'poe112233/qc-site';
const BASE = process.cwd();
const BASE_API = 'https://api.github.com';

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'User-Agent': 'codex',
    Accept: 'application/vnd.github+json',
    ...extra,
  };
}

async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: headers() };
  if (body !== null) {
    opts.body = JSON.stringify(body);
    opts.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${String(text).slice(0, 500)}`);
  }
  return data;
}

function collectFiles(dir, prefix = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'images_tmp') continue;
      results.push(...collectFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

async function getBranchHead() {
  try {
    const branch = await api(`${BASE_API}/repos/${REPO}/branches/main`);
    return branch.commit.sha;
  } catch {
    return null;
  }
}

async function getFileSha(fileRelPath) {
  try {
    const res = await fetch(
      `${BASE_API}/repos/${REPO}/contents/${encodeURIComponent(fileRelPath)}`,
      { headers: headers() }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET ${fileRelPath} -> ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.sha;
  } catch (e) {
    if (e.message.includes('404')) return null;
    throw e;
  }
}

async function main() {
  const publicDir = path.join(BASE, 'public');
  const siteFiles = [
    ...collectFiles(publicDir),
    ...['package.json', 'package-lock.json', '.gitignore'].filter(f => fs.existsSync(path.join(BASE, f))).map(f => ({
      fullPath: path.join(BASE, f),
      relPath: f,
    })),
    ...collectFiles(path.join(BASE, 'scripts'), 'scripts'),
  ];
  console.log(`Uploading ${siteFiles.length} files...`);

  // Resume from state file
  const stateFile = path.join(BASE, 'push_state.json');
  let startIdx = 0;
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    startIdx = state.startIdx || 0;
    console.log(`Resuming from index ${startIdx}`);
  }

  for (let i = startIdx; i < siteFiles.length; i++) {
    const { fullPath, relPath } = siteFiles[i];
    const content = fs.readFileSync(fullPath);
    const b64 = content.toString('base64');

    const body = {
      message: `Upload ${relPath}`,
      content: b64,
      encoding: 'base64',
    };

    try {
      const fileSha = await getFileSha(relPath);
      if (fileSha) {
        body.sha = fileSha;
      }
      await api(`${BASE_API}/repos/${REPO}/contents/${relPath}`, 'PUT', body);
    } catch (e) {
      console.log(`  retry ${relPath}: ${e.message.slice(0, 100)}`);
      await new Promise(r => setTimeout(r, 3000));
      const fileSha = await getFileSha(relPath);
      const body2 = { message: `Upload ${relPath} (retry)`, content: b64, encoding: 'base64' };
      if (fileSha) body2.sha = fileSha;
      await api(`${BASE_API}/repos/${REPO}/contents/${relPath}`, 'PUT', body2);
    }
    fs.writeFileSync(stateFile, JSON.stringify({ startIdx: i + 1 }));
    if ((i + 1) % 20 === 0 || i + 1 === siteFiles.length) {
      console.log(`  ${i + 1}/${siteFiles.length} done`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  console.log('All files uploaded!');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
