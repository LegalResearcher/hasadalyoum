import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getYemenDateParts } from '../api/_lib/yemenDate.js';

const root = new URL('../', import.meta.url);
const read = (relativePath) => readFile(new URL(relativePath, root), 'utf8');

const dateParts = getYemenDateParts('2026-08-17T21:30:00.000Z');
assert.deepEqual(dateParts, { year: '2026', month: '08', day: '18' });

const vercel = JSON.parse(await read('vercel.json'));
const newsRedirect = vercel.rewrites.find((rewrite) => rewrite.source === '/news/:slug');
assert.deepEqual(newsRedirect, {
  source: '/news/:slug',
  destination: '/api/news-redirect?slug=:slug',
});
assert.equal('redirects' in vercel, false);

const [newsApi, newsRedirectApi, sitemapNewsApi, postRedirectApi, articleRedirectApi, postsHook] = await Promise.all([
  read('api/news.js'),
  read('api/news-redirect.js'),
  read('api/sitemap-news.js'),
  read('api/post-redirect.js'),
  read('api/article-redirect.js'),
  read('src/hooks/usePosts.ts'),
]);

assert.match(newsApi, /\.eq\("slug", decodedSlug\)[\s\S]*?\.eq\("status", "published"\)[\s\S]*?\.maybeSingle\(\)/);
assert.doesNotMatch(newsApi, /\.gte\("created_at", startDate\)/);
assert.match(newsApi, /return res\.redirect\(301, encodeURI\(finalUrl\)\)/);
assert.match(sitemapNewsApi, /published_at\.gt\./);
assert.match(sitemapNewsApi, /published_at\.is\.null,created_at\.gt/);
assert.match(newsRedirectApi, /return res\.redirect\(301, encodeURI\(canonicalUrl\)\)/);
assert.match(articleRedirectApi, /X-Robots-Tag', 'noindex, nofollow'/);
assert.match(postRedirectApi, /\.eq\('status', 'published'\)/);
assert.match(postsHook, /\.eq\("slug", slug\)[\s\S]*?\.eq\("status", "published"\)/);

console.log('SEO verification checks passed.');
