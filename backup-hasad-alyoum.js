#!/usr/bin/env node
/**
 * سكربت نسخ احتياطي كامل — موقع حصاد اليوم (Supabase)
 * مصمم للعمل عبر Termux على الجوال.
 *
 * ما يفعله:
 *   1. يسجّل دخول بحساب أدمن/محرر الموقع (Supabase Auth عادي، ليس حساب Dashboard).
 *   2. يسحب كل الصفوف من كل جدول (مع pagination، بدون حد 1000 صف).
 *   3. يحفظ كل جدول في ملف JSON منفصل + ملف ملخص شامل.
 *
 * ما لا يفعله (ولا يقدر):
 *   - لا ينسخ جدول auth.users (بريد المستخدمين/كلمات المرور المشفّرة).
 *     هذا يتطلب SERVICE_ROLE_KEY، وهو غير متوفر هنا لأنه غير موجود في كود
 *     الموقع أصلًا (محفوظ فقط داخل إعدادات مشروع Supabase نفسه).
 *     إذا استرجعت الوصول للوحة Supabase لاحقًا، يمكن تصدير المستخدمين من هناك.
 *
 * الاستخدام في Termux:
 *   pkg install nodejs
 *   npm install @supabase/supabase-js
 *   ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node backup-hasad-alyoum.js
 *
 * (تقدر بديلًا تعدّل القيم مباشرة بالأسفل بدل متغيرات البيئة، لكن يفضّل
 *  عدم حفظ كلمة المرور داخل ملف قد ترفعه أو تشاركه لاحقًا)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============ الإعدادات (من .env الموقع) ============
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zfukvvhtkzwztpxoitak.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdWt2dmh0a3p3enRweG9pdGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDk4ODgsImV4cCI6MjA3OTY4NTg4OH0.-Hyue82adxdIaJ6JsqLomW6P5MG3d90rB4vDp2wyGEU';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ضع-بريد-الأدمن-هنا';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ضع-كلمة-المرور-هنا';

const OUTPUT_DIR = path.join(__dirname, 'backup-' + new Date().toISOString().slice(0, 10));
const PAGE_SIZE = 1000; // الحد الافتراضي لكل طلب من Supabase REST

// كل الجداول في public schema
const TABLES = [
  'categories',
  'authors',
  'tags',
  'profiles',
  'user_roles',
  'posts',
  'post_tags',
  'post_media',
  'post_revisions',
  'post_views',
  'breaking_news',
  'media',
  'site_settings',
  'notification_settings',
  'push_subscriptions',
  'ad_banners',
  'category_settings',
  'migrations_log',
];

async function fetchAllRows(supabase, table) {
  let allRows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true }) // ترتيب ثابت يمنع تكرار/تخطي صفوف بين الصفحات
      .range(from, to);

    if (error) {
      return { rows: allRows, error: error.message };
    }
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break; // وصلنا آخر صفحة
    from += PAGE_SIZE;
  }

  return { rows: allRows, error: null };
}

async function main() {
  if (ADMIN_EMAIL.includes('ضع-') || ADMIN_PASSWORD.includes('ضع-')) {
    console.error('❌ عدّل ADMIN_EMAIL و ADMIN_PASSWORD أولًا (بمتغيرات البيئة أو داخل الملف).');
    process.exit(1);
  }

  console.log('🔄 الاتصال بـ Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔐 تسجيل الدخول بحساب الأدمن...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authError) {
    console.error('❌ فشل تسجيل الدخول:', authError.message);
    console.error('   تأكد من صحة البريد/كلمة المرور، وأن الحساب له دور admin أو editor في user_roles.');
    process.exit(1);
  }

  console.log(`✅ تم تسجيل الدخول: ${authData.user.email} (user_id: ${authData.user.id})`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const summary = {};

  for (const table of TABLES) {
    process.stdout.write(`📦 نسخ جدول ${table} ... `);
    const { rows, error } = await fetchAllRows(supabase, table);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${table}.json`),
      JSON.stringify(rows, null, 2),
      'utf-8'
    );
    summary[table] = { count: rows.length, error: error || null };
    console.log(error ? `⚠️  (${rows.length} صف — خطأ: ${error})` : `✅ (${rows.length} صف)`);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_summary.json'),
    JSON.stringify(
      { backed_up_at: new Date().toISOString(), project_url: SUPABASE_URL, tables: summary },
      null,
      2
    ),
    'utf-8'
  );

  console.log('\n📊 ملخص النسخ الاحتياطي:');
  for (const [table, info] of Object.entries(summary)) {
    console.log(`   ${table}: ${info.count} صف${info.error ? ' ⚠️ ' + info.error : ''}`);
  }
  console.log(`\n✅ اكتمل. الملفات في: ${OUTPUT_DIR}`);
  console.log('⚠️  تذكير: جدول auth.users (بيانات المستخدمين الفعلية) لم يُنسخ — يحتاج service_role key، راجع أعلى الملف.');

  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error('❌ خطأ غير متوقع:', err);
  process.exit(1);
});
