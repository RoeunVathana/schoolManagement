import { access, readFile } from 'node:fs/promises';

const dist = new URL('./dist/', import.meta.url);
const requiredFiles = [
  'index.html',
  'favicon.svg',
  'campusflow-logo-square.png',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'courses/index.html',
  'community/index.html',
];

for (const file of requiredFiles) {
  await access(new URL(file, dist));
}

const html = await readFile(new URL('index.html', dist), 'utf8');
const checks = [
  ['site title', /<title>CampusFlow LMS/i],
  ['favicon link', /rel="icon"[^>]+href="\/favicon\.ico"/i],
  ['organization schema', /"@type"\s*:\s*"Organization"/i],
  ['organization logo', /"logo"\s*:\s*"https:\/\/campusflowlms\.xyz\/campusflow-logo-square\.png"/i],
  ['canonical link', /rel="canonical"[^>]+https:\/\/campusflowlms\.xyz\//i],
];

for (const [label, pattern] of checks) {
  if (!pattern.test(html)) throw new Error(`Missing ${label} in dist/index.html`);
}

const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
if (!schemaMatch) throw new Error('Missing JSON-LD schema in dist/index.html');
try {
  JSON.parse(schemaMatch[1]);
} catch (error) {
  throw new Error(`Invalid JSON-LD schema in dist/index.html: ${error.message}`);
}

const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');
if (!sitemap.includes('<urlset') || !sitemap.includes('https://campusflowlms.xyz/')) {
  throw new Error('Generated sitemap is missing the site URL or urlset root');
}

console.log(`SEO assets validated: ${requiredFiles.length} files, metadata and sitemap present.`);
