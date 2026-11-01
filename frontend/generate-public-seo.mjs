import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const siteUrl = 'https://campusflowlms.xyz';
const apiUrl = (process.env.VITE_API_URL || 'https://schoolmanagement-production-d78b.up.railway.app').replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);
const distDir = new URL('./dist/', import.meta.url);

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const absoluteMediaUrl = (value) => {
  if (!value) return `${siteUrl}/campusflow-logo.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

async function loadCourses() {
  try {
    const response = await fetch(`${apiUrl}/storefront/courses`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Course API returned ${response.status}`);
    const payload = await response.json();
    const courses = payload?.data ?? payload;
    return Array.isArray(courses) ? courses.filter((course) => course?.id && course?.courseName) : [];
  } catch (error) {
    console.warn(`[seo] Could not load public courses: ${error.message}`);
    return [];
  }
}

function sitemapEntry(path, changefreq, priority) {
  return `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function courseSchema(course) {
  const url = `${siteUrl}/courses/${encodeURIComponent(course.id)}`;
  const description = course.description || `Learn ${course.courseName} with CampusFlow LMS in Cambodia.`;
  const price = Number(course.salePrice ?? course.price ?? 0);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        name: course.courseName,
        description,
        url,
        image: absoluteMediaUrl(course.imageUrl),
        provider: { '@type': 'Organization', name: 'CampusFlow LMS', url: siteUrl },
        inLanguage: ['en', 'km'],
        offers: {
          '@type': 'Offer',
          price: Number.isFinite(price) ? price.toFixed(2) : '0.00',
          priceCurrency: course.currency || 'USD',
          availability: 'https://schema.org/InStock',
          url,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'CampusFlow LMS', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Courses', item: `${siteUrl}/courses` },
          { '@type': 'ListItem', position: 3, name: course.courseName, item: url },
        ],
      },
    ],
  };
}

function coursePage(template, course) {
  const title = `${course.courseName} | CampusFlow LMS`;
  const description = course.description || `Learn ${course.courseName} with practical online courses and local teacher support in Cambodia.`;
  const url = `${siteUrl}/courses/${encodeURIComponent(course.id)}`;
  const image = absoluteMediaUrl(course.imageUrl);
  const schema = JSON.stringify(courseSchema(course)).replace(/</g, '\\u003c');
  const fallback = `<main aria-label="${escapeHtml(course.courseName)}"><p>CampusFlow LMS course</p><h1>${escapeHtml(course.courseName)}</h1><p>${escapeHtml(description)}</p><p>Practical online learning in Cambodia with guided lessons, teacher support, assignments, exams, and KHQR payment.</p><nav aria-label="Course links"><a href="/courses">Browse all courses</a><a href="/register">Create a student account</a></nav></main>`;
  return template
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(image)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(image)}" />`)
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}" />`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">${schema}</script>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${fallback}</div>`);
}

const courses = await loadCourses();
const staticEntries = [
  sitemapEntry('/', 'weekly', '1.0'),
  sitemapEntry('/courses', 'daily', '0.9'),
  sitemapEntry('/community', 'daily', '0.8'),
];
const courseEntries = courses.map((course) => sitemapEntry(`/courses/${encodeURIComponent(course.id)}`, 'weekly', '0.8'));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...courseEntries].join('\n')}\n</urlset>\n`;

await writeFile(new URL('sitemap.xml', distDir), sitemap, 'utf8');

if (courses.length) {
  const template = await readFile(new URL('index.html', distDir), 'utf8');
  await Promise.all(courses.map(async (course) => {
    const directory = new URL(`courses/${encodeURIComponent(course.id)}/`, distDir);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL('index.html', directory), coursePage(template, course), 'utf8');
  }));
}

console.log(`[seo] Generated ${courses.length} public course pages and ${courses.length + 3} sitemap URLs.`);
