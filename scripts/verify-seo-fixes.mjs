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

const [
  newsApi,
  newsRedirectApi,
  sitemapNewsApi,
  postRedirectApi,
  articleRedirectApi,
  postsHook,
  readinessApi,
  postEditor,
  jsonImporter,
  scheduledPublisher,
  indexingSignal,
  siteIndex,
  newsBot,
] = await Promise.all([
  read('api/news.js'),
  read('api/news-redirect.js'),
  read('api/sitemap-news.js'),
  read('api/post-redirect.js'),
  read('api/article-redirect.js'),
  read('src/hooks/usePosts.ts'),
  read('api/publish-readiness.js'),
  read('src/pages/admin/PostEditor.tsx'),
  read('src/components/admin/JsonNewsImporter.tsx'),
  read('supabase/functions/publish-scheduled/index.ts'),
  read('supabase/functions/google-indexing/index.ts'),
  read('index.html'),
  read('hasad_news_bot_fixed.py'),
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

assert.match(readinessApi, /canonicalPage:[\s\S]*?sitemap:[\s\S]*?newsSitemap:[\s\S]*?rss:/);
assert.match(readinessApi, /Googlebot\/2\.1/);
assert.match(readinessApi, /ready = Object\.values\(checks\)\.every\(Boolean\)/);
assert.match(postEditor, /published_at: formData\.status === "published" \? \(post\?\.published_at \|\| new Date\(\)\.toISOString\(\)\) : null/);
assert.match(postEditor, /\/api\/publish-readiness\?id=/);
assert.doesNotMatch(postEditor, /functions\.invoke\('google-indexing'/);
assert.match(jsonImporter, /refreshDiscoverySignals/);
assert.doesNotMatch(jsonImporter, /functions\.invoke\("google-indexing"/);
assert.doesNotMatch(jsonImporter, /فهرسة فورية/);
assert.match(scheduledPublisher, /published_at: publishedAt/);
assert.match(scheduledPublisher, /api\/ping-sitemap/);
assert.doesNotMatch(scheduledPublisher, /functions\.invoke\('google-indexing'/);
assert.match(indexingSignal, /IndexNow فقط/);
assert.doesNotMatch(indexingSignal, /indexing\.googleapis\.com/);
assert.match(siteIndex, /rel="alternate" type="application\/rss\+xml"/);
assert.match(newsBot, /log_discovery_ready/);
assert.doesNotMatch(newsBot, /request_google_indexing/);

console.log('SEO verification checks passed.');
