"""
hasad_news_bot.py
──────────────────────────────────────────────────────────────────────
يسحب أخبار آخر 24 ساعة من روابط RSS محددة، يعيد صياغتها عبر Gemini
بما يطابق الهوية التحريرية المستقلة لـ "حصاد اليوم"،
وينشرها تلقائياً في جدول posts.

المتطلبات:
    pip install requests pillow beautifulsoup4

طريقة الاستخدام:
    1. عبّئ قسم الإعدادات بالأسفل (RSS_FEEDS).
    2. نفّذ ملف SQL المرفق مرة واحدة في Supabase SQL Editor
       (يضيف عمود source_url لمنع تكرار نشر نفس الخبر).
    3. شغّل: python hasad_news_bot.py
       سيعرض تحليلاً أولاً (كم خبر جديد وجد) ثم يطلب كتابة 'تأكيد' قبل النشر الفعلي.
"""

from __future__ import annotations

import html
import io
import json
import logging
import os
import random
import re
import string
import sys
import time
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup, Tag

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

# ══════════════════════════════════════════════════════════════════════
#  ⚙️  الإعدادات — عدّل هنا فقط
# ══════════════════════════════════════════════════════════════════════

# ▶️ تفعيل مصدر "عدن تايم" الحي (RSS_ADEN_TM_FULL_URL) ضمن وضع الاستخراج
# الكامل "1"، لكن **محصوراً فقط بخبرين من أقسامه**: "رياضة" (رياض) و"عرب
# وعالم" — أي خبر من عدن تايم قسمه المكتشف من صفحته أي شيء آخر (أخبار عدن،
# كتابات، أخبار محافظات اليمن، أخبار وتقارير) يُستبعد تلقائياً من النشر
# (بدون تخمين قسمه) عبر SITE_CATEGORY_MAP المحصور بالأسفل. أخبار "رياض"
# تُنشر بقسم موقعك "رياضة"، وأخبار "عرب وعالم" تُنشر بقسم موقعك "شؤون
# دولية". أعد هذي القيمة لـ False لإيقاف عدن تايم بالكامل مرة أخرى (يعمل
# البوت وقتها بالمصادر الأربعة الثانية فقط، بدون سؤالك أيضاً).
ADEN_TM_ENABLED = False

# روابط/ملفات RSS التي تريد السحب منها — كل ملف مربوط بقسمه الصحيح مباشرة
# (كل ملف = لقطة ثابتة من قسم واحد محدد بموقع "عدن تايم"، فما فيه حاجة
# لتصنيف يدوي أو تخمين بالذكاء الاصطناعي — القسم معروف مسبقاً لكل ملف).
RSS_FEED_CATEGORIES = {
    "/storage/emulated/0/Download/hasad_bot/aden-tm-akhbar-wataqarir.xml": "أخبار وتقارير",
    "/storage/emulated/0/Download/hasad_bot/aden-tm-akhbar-aden.xml": "أخبار محلية",
    "/storage/emulated/0/Download/hasad_bot/aden-tm-riyada.xml": "رياضة",
    "/storage/emulated/0/Download/hasad_bot/aden-tm-kitabat.xml": "آراء واتجاهات",
}

# (للتوافق فقط — الكود الفعلي يستخدم RSS_FEED_CATEGORIES بالأعلى)
RSS_FEEDS = list(RSS_FEED_CATEGORIES.keys())

# رابط RSS "المساء" الإضافي — مصدر منفصل عن ملفات XML المحلية بالأعلى
# (يُنسب تلقائياً لقسم "أخبار وتقارير" عند السحب منه)
RSS_MASA_URL = "https://masa-press.net/category/اهم-الاخبار/feed/"
RSS_MASA_CATEGORY = "أخبار وتقارير"

# رابط RSS الحي لموقع عدن تايم (مباشر من الإنترنت، وليس ملف XML محلي ثابت) —
# يُستخدم حصراً بوضع "1" (استخراج الخبر كاملاً): البوت يسحب روابط الأخبار من
# هذا الفيد، ثم يفتح كل رابط فعلياً عبر extract_article ليجلب النص الكامل
# من صفحة الخبر نفسها بدل الاكتفاء بملخص الفيد.
RSS_ADEN_TM_FULL_URL = "https://www.aden-tm.net/feed"
RSS_ADEN_TM_FULL_CATEGORY = "أخبار وتقارير"

# رابط RSS "الاتحاد برس" الإضافي — مصدر منفصل يُستخدم حصراً بوضع "1"
# (استخراج الخبر كاملاً)، بنفس منطق فيد "المساء" تماماً: يُفتح كل رابط
# فعلياً عبر extract_article ليجلب النص الكامل من
# صفحة الخبر نفسها بدل الاكتفاء بملخص الفيد، والقسم يُسأل عنه المستخدم عند
# التشغيل بشكل منفصل (بدون أي تصحيح تلقائي للقسم مثل عدن تايم —
# SITE_CATEGORY_MAP لا يُطبَّق عليه).
# ⚠️ فلترة BLOCKED_KEYWORDS تُطبَّق عليه (تُطبَّق حالياً على كل الفيدات).
RSS_ALITTIHAD_FULL_URL = "https://alittihadpress.com/rss.php?topic=1"
RSS_ALITTIHAD_FULL_CATEGORY = "أخبار وتقارير"

# كلمات محظورة — أي خبر من ملفات XML المحلية يحتوي إحداها (بالعنوان أو النص)
# يُتجاوز بالكامل: لا يُرسل لـ Gemini، ولا تُعاد صياغته، ولا يُنشر.
# لا تُطبَّق هذه الفلترة على مصدر RSS المساء (RSS_MASA_URL) — مسموح بدونها.
BLOCKED_KEYWORDS = ["مواقيت الأذان", "مليشيا"]

# ملف يخزّن روابط الأخبار التي اخترت منعها نهائياً عبر choose_excluded_items
# (رقم الخبر أثناء التشغيل). يُقرأ في بداية كل تشغيل جديد ليُستبعد أي خبر
# رابطه موجود هنا تلقائياً، حتى لو لم يُنشر أبداً بجدول posts (وبالتالي لا
# يظهر ضمن existing_urls). هذا مستقل تماماً عن Supabase.
BLOCKED_LINKS_FILE = "/storage/emulated/0/Download/hasad_bot/blocked_links.json"

# يتتبّع الأخبار المجدولة (status=scheduled) اللي لسا ما اتأكدنا من نشرها
# فعلياً ولا أرسلنا رابطها لتيليجرام بعد — يُفحص هذا الملف بأول كل تشغيلة
# جديدة للسكربت (شوف check_and_notify_scheduled_posts)
PENDING_SCHEDULED_FILE = "/storage/emulated/0/Download/hasad_bot/pending_scheduled.json"

# بيانات Lovable Cloud الخاصة بموقع حصاد اليوم (مفتاح publishable/anon)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zfukvvhtkzwztpxoitak.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip() or os.getenv("SUPABASE_SERVICE_KEY", "").strip()
SUPABASE_SERVICE_KEY = SUPABASE_ANON_KEY  # اسم قديم داخل السكربت للتوافق فقط؛ القيمة anon وليست service_role.
# مهم: لأن هذا المفتاح anon، لا تطلب من PostgREST إرجاع سجل scheduled بعد الإدراج؛
# RLS يخفي الأخبار غير المنشورة عن anon، لذلك يضيف البوت id محلياً ويستخدم return=minimal.

# اختر رقم القسم عند التشغيل — موقع حصاد اليوم يعتمد على جدول categories
# (كل قسم له id ثابت)، لذا يُستخدم get_category_id() لتحويل الاسم إلى
# category_id فعلي قبل الإدراج (بخلاف الجنوب فويس اللي يخزّن اسم القسم كنص).
# يُستخدم هذا القاموس فقط في الوضع اليدوي (لو اخترت N عند سؤال "تفعيل التلقائي؟")
CATEGORY_OPTIONS = {
    "1": "أخبار وتقارير",
    "2": "شؤون دولية",
    "3": "آراء واتجاهات",
    "4": "رياضة",
    "5": "أخبار محلية",
    "6": "اليمن في الصحافة",
}

# أي خبر يُنشر بأحد هذه الأقسام يُعلَّم تلقائياً ⭐ مميز (is_featured=true) ليظهر
# بسلايدر الصفحة الرئيسية
FEATURED_SLIDER_CATEGORIES = {"أخبار وتقارير"}

# مسارات ملفات أخبار جاهزة (اختياري) — ملف نصي فيه عدة أخبار مفصولة بعناوين مرقّمة
# مثال شكل الملف:
#   1 - عنوان الخبر الأول
#   نص الخبر الأول...
#
#   2 - عنوان الخبر الثاني
#   نص الخبر الثاني...
NEWS_FILES = [
    # "/path/to/اخبار.txt",
]

# النافذة الزمنية: أخبار آخر كم ساعة تُسحب
HOURS_WINDOW = 24

# الأقسام المستثناة من إعادة الصياغة الكاملة عبر Gemini — تُنشر بنص مقالها
# الأصلي حرفياً (بدون أي تعديل) مع نسب المقال لكاتبه (حقل author)، لأنها
# مقالات رأي منسوبة لكتّاب بأسمائهم ولا يجوز التعديل على متنها. العنوان فقط
# يُعاد صياغته عبر Gemini (rewrite_title_only) ليتماشى مع الهوية التحريرية،
# دون المساس بأي حرف من نص المقال نفسه.
# ⚠️ يعتمد الاستثناء على القسم الأصلي لملف RSS المصدر (RSS_FEED_CATEGORIES)
# ويُطبَّق في الوضعين التلقائي واليدوي معاً.
NO_REWRITE_CATEGORIES = {"آراء واتجاهات"}

# ⚠️ طريقة التعامل مع Gemini لكل الفيدات وكل الأقسام (ما عدا مقالات الرأي
# أعلاه، اللي تبقى بمنطقها الثابت دائماً) لم تعد مربوطة بمصدر معين بالكود —
# أصبحت سؤالاً تفاعلياً عند كل تشغيل عبر choose_gemini_mode() (انظر أسفل
# الملف): 1) عنوان+متن عبر Gemini (الافتراضي) 2) عنوان فقط عبر Gemini
# 3) بدون Gemini إطلاقاً (حرفي كما استُخرج).

# الأقسام التي تُنشر أخبارها دائماً بدون صورة (يُترك حقل image_url فارغاً
# ولا تُجلب/تُضغط/تُرفع أي صورة لها، حتى لو توفّر رابط صورة بالمصدر).
NO_IMAGE_CATEGORIES = set()

# اسم افتراضي يُستخدم لو ملف الـ RSS ما فيه اسم كاتب صريح لمقال رأي
DEFAULT_OPINION_AUTHOR = "كتّاب عدن تايم"

# نص يوضع بحقل source للتمييز بين المحتوى الخاص والمسحوب
SOURCE_LABEL = "حصاد اليوم | متابعات"

TABLE_NAME = "posts"
MAX_RETRIES = 6
MAX_BACKOFF = 60
REQUEST_TIMEOUT = 60

# ══════════════════════════════════════════════════════════════════════
#  🖼️  إعدادات معالجة ورفع صور الأخبار (Supabase Storage)
# ══════════════════════════════════════════════════════════════════════

SUPABASE_IMAGE_BUCKET = "post-images"   # اسم الـ bucket العام في Supabase Storage
IMAGE_MAX_DIMENSION = 1200              # أقصى عرض/ارتفاع بالبكسل
IMAGE_TARGET_MAX_BYTES = 100 * 1024     # 100 كيلوبايت
IMAGE_START_QUALITY = 85                # جودة WebP الابتدائية
IMAGE_MIN_QUALITY = 30                  # أدنى جودة مسموحة أثناء الضغط التدريجي
IMAGE_QUALITY_STEP = 5                  # مقدار تقليل الجودة بكل محاولة

# ══════════════════════════════════════════════════════════════════════
#  🚫🖼️  فحص شعار المصدر بالصورة (مطابقة محلية بدون أي API خارجي)
# ══════════════════════════════════════════════════════════════════════

# مجلد تحفظ فيه صور كاملة عليها شعار عدن تايم/المساء برس (الصورة كاملة كما
# تُنشر، وليس مقصوصة). أي صورة (jpg/jpeg/png/webp) تضعها هنا تُقارَن تلقائياً
# بكل صورة خبر جديدة (كاملة، مقابل كاملة) قبل رفعها. لو ما فيه أي صورة
# بالمجلد، الفحص يُتجاوز تلقائياً وتُنشر الصور عادي (بدون توقف البوت).
BLOCKED_LOGOS_DIR = "/storage/emulated/0/Download/hasad_bot/blocked_logos"

# حجم "البصمة المرئية" (average hash) — 8 يعني مقارنة على أساس 64 بت
LOGO_HASH_SIZE = 8

# أقصى فرق مسموح بين بصمتين ليُعتبرا "نفس الشعار" (من أصل 64 بت)
LOGO_MATCH_MAX_DISTANCE = 6

# ══════════════════════════════════════════════════════════════════════
#  📢  تليجرام — إرسال العنوان والرابط تلقائياً بعد كل نشر
# ══════════════════════════════════════════════════════════════════════

TELEGRAM_ENABLED = True
# نفس بوت الجنوب فويس — تأكد إنه مُضاف كأدمن بقناة @hasadalyoum أيضاً،
# وإلا الإرسال بيفشل بخطأ "chat not found" أو "bot is not a member".
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHANNEL_ID = "@hasadalyoum"

# 🔔 محادثة خاصة (وليست القناة العامة) لإرسال تنبيهات تقنية داخلية فقط
# (مثل تجاوز حجم جداول النظام cron/net لحد معيّن). لا علاقة لها بنشر الأخبار.
# نفس محادثة الإدارة المستخدمة بمشروع الجنوب فويس.
ADMIN_TELEGRAM_CHAT_ID = "85820797"
SYSTEM_LOGS_ALERT_THRESHOLD = 50_000  # سجل — حد التنبيه لكل من الجدولين

SITE_BASE_URL = "https://hasadalyoum.vercel.app"
# ⚠️ هذا الدومين المؤقت من Vercel هو المعتمد فعلياً حالياً (بطلب صريح).
# لو ارتبط دومين hasadalyoum.com لاحقاً بالموقع، حدّث هذا المتغير فوراً
# وإلا كل روابط تيليجرام والأرشفة بجوجل ستستمر تفتح على النطاق القديم.

# ⚠️ تم حذف SITE_SHARE_URL_BASE (كان يشير لمسار /share غير موجود بالموقع
# فعلاً، فكل رابط يُرسل لتيليجرام كان يفتح صفحة 404). الرابط الصحيح الآن
# يُبنى عبر build_canonical_url() بنفس صيغة الموقع: /YYYY/MM/DD/slug


def send_to_telegram(title: str, article_url: str) -> bool:
    if not TELEGRAM_ENABLED or not TELEGRAM_BOT_TOKEN:
        return False
    text = (
        f"{title}\n\n"
        f'أقرأ التفاصيل من "حصاد اليوم": {article_url}\n\n'
        f"📲 تابعونا على:  ⤵\n\n"
        f"✅ تيليجرام: https://t.me/hasadalyoum"
    )
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHANNEL_ID, "text": text}
    try:
        r = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            return True
        log.warning(f"  ⚠️  فشل إرسال تليجرام [{r.status_code}]: {r.text[:200]}")
        return False
    except requests.RequestException as e:
        log.warning(f"  ⚠️  خطأ إرسال تليجرام: {e}")
        return False


def send_admin_alert(text: str) -> bool:
    """يرسل رسالة تنبيه تقني لمحادثة خاصة (ADMIN_TELEGRAM_CHAT_ID) — منفصلة
    تماماً عن قناة نشر الأخبار العامة. لا توقف تشغيل البوت أبداً لو فشلت."""
    if not TELEGRAM_ENABLED or not TELEGRAM_BOT_TOKEN or not ADMIN_TELEGRAM_CHAT_ID:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": ADMIN_TELEGRAM_CHAT_ID, "text": text}
    try:
        r = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            return True
        log.warning(f"  ⚠️  فشل إرسال تنبيه إداري [{r.status_code}]: {r.text[:200]}")
        return False
    except requests.RequestException as e:
        log.warning(f"  ⚠️  خطأ إرسال تنبيه إداري: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════
#  👁️  تحديث المشاهدات + 📡 الأرشفة (Google Indexing) — نفس آلية لوحة التحكم
# ══════════════════════════════════════════════════════════════════════

AUTO_SEED_VIEWS = True
GOOGLE_INDEXING_ENABLED = True


def seed_views(post_id: str) -> None:
    """نسخة طبق الأصل من دالة seedViewsForPost بلوحة تحكم الموقع (AdminPanel.tsx):
    تجيب views + created_at الحاليين للخبر، وتحسب المشاهدات حسب عمر الخبر
    (diffMin = الفرق بالدقائق بين الآن و created_at) بدل رقم ثابت:
        - عمر الخبر أقل من 60 دقيقة  → 150-388
        - عمر الخبر بين 60-300 دقيقة → 455-700
        - عمر الخبر أكثر من 300 دقيقة → 600-1500
      (لو كانت عنده مشاهدات سابقة ≥150: يُضاف لها 10-59 فقط، بدل استبدالها)."""
    if not AUTO_SEED_VIEWS or not post_id:
        return
    try:
        url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?id=eq.{post_id}&select=id,views_count,created_at"
        r = requests.get(url, headers=sb_headers(), timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            log.warning(f"  ⚠️  تعذّر جلب بيانات الخبر لتحديث المشاهدات [{r.status_code}]: {r.text[:300]}")
            return
        if not r.json():
            log.warning(f"  ⚠️  تعذّر جلب بيانات الخبر لتحديث المشاهدات: لم يُعثر على السجل بالجدول (id={post_id})")
            return
        post = r.json()[0]
        current = post.get("views_count") or 0
        created_at = datetime.fromisoformat(post["created_at"].replace("Z", "+00:00"))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        diff_min = (now - created_at).total_seconds() / 60

        if current < 150:
            if diff_min < 60:
                final = random.randint(150, 388)
            elif diff_min < 300:
                final = random.randint(455, 700)
            else:
                final = random.randint(600, 1500)
        else:
            final = current + random.randint(10, 59)

        patch_url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?id=eq.{post_id}"
        pr = requests.patch(patch_url, headers=sb_headers(), json={"views_count": final}, timeout=REQUEST_TIMEOUT)
        if pr.status_code not in (200, 204):
            log.warning(f"  ⚠️  فشل تحديث المشاهدات [{pr.status_code}]: {pr.text[:200]}")
        else:
            log.info(f"  👁️  تحسين المشاهدات ({final})")
    except (requests.RequestException, ValueError, KeyError) as e:
        log.warning(f"  ⚠️  خطأ تحديث المشاهدات: {e}")


YEMEN_TZ = timezone(timedelta(hours=3))  # توقيت اليمن (Asia/Aden) — لا يوجد توقيت صيفي


def build_canonical_url(slug: str, created_at_iso: str) -> str:
    """يبني رابط المقال الرسمي (نفس صيغة postUrl.ts بالموقع): /YYYY/MM/DD/slug
    ⚠️ الموقع (postUrl.ts → getPostUrl) يحسب السنة/الشهر/اليوم عبر
    date.getFullYear()/getMonth()/getDate() — وهذي تُحسب بتوقيت متصفح
    الزائر المحلي (توقيت اليمن UTC+3 عملياً). لازم نطابق نفس الحساب هنا
    وإلا الرابط يشاور على يوم مختلف عمّا يتوقعه الموقع = "الخبر غير موجود"."""
    dt = datetime.fromisoformat(created_at_iso)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(YEMEN_TZ)
    return f"{SITE_BASE_URL}/{dt.year:04d}/{dt.month:02d}/{dt.day:02d}/{slug}"


def request_google_indexing(urls: list) -> None:
    """يستدعي دالة google-indexing بمشروع Supabase لطلب أرشفة الروابط فوراً
    بجوجل — نفس الدالة المستخدمة بلوحة تحكم الموقع."""
    if not GOOGLE_INDEXING_ENABLED or not urls:
        return
    try:
        url = f"{SUPABASE_URL}/functions/v1/google-indexing"
        r = requests.post(url, headers=sb_headers(),
                           json={"urls": urls, "type": "URL_UPDATED"}, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            log.info(f"  📡 أُرسل للأرشفة (Google Indexing)")
        else:
            log.warning(f"  ⚠️  فشل إرسال الأرشفة [{r.status_code}]: {r.text[:200]}")
    except requests.RequestException as e:
        log.warning(f"  ⚠️  خطأ إرسال الأرشفة: {e}")

# ══════════════════════════════════════════════════════════════════════
#  🔑  مفاتيح Gemini ونماذجه (تدوير تلقائي عند نفاذ الحصة)
# ══════════════════════════════════════════════════════════════════════

GEMINI_API_KEYS = [k.strip() for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k.strip()]

GEMINI_MODELS = [
    "gemini-2.5-flash",        # النموذج الوحيد — كل المفاتيح تستخدمه
]

_current_model_idx = 0
_current_key_idx = 0


def current_model() -> str:
    return GEMINI_MODELS[_current_model_idx]


def current_key() -> str:
    return GEMINI_API_KEYS[_current_key_idx]


def model_url() -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{current_model()}:generateContent"
    )


class DailyQuotaExceeded(Exception):
    pass


# ══════════════════════════════════════════════════════════════════════
#  📋  اللوغر
# ══════════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("hasad_news_bot.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════
#  ⏳  محدد المعدّل (Rate Limiter) — بسيط
# ══════════════════════════════════════════════════════════════════════

class RateLimiter:
    def __init__(self, requests_per_minute: int = 12):
        self.min_interval = 60.0 / max(requests_per_minute, 1)
        self._last = 0.0

    def wait(self):
        now = time.time()
        elapsed = now - self._last
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last = time.time()


RATE_LIMITER = RateLimiter(requests_per_minute=12)


# ══════════════════════════════════════════════════════════════════════
#  📡  سحب وتحليل RSS
# ══════════════════════════════════════════════════════════════════════

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "media": "http://search.yahoo.com/mrss/",
    "dc": "http://purl.org/dc/elements/1.1/",
}

IMG_TAG_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)


def strip_html(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def extract_image_url(item: ET.Element, description_raw: str, content_encoded_raw: str) -> Optional[str]:
    """يبحث عن رابط صورة الخبر داخل عنصر <item> بترتيب الأولويات:
    media:content ← media:thumbnail ← enclosure ← أول <img> داخل content:encoded أو description."""
    media_content = item.find("media:content", NS)
    if media_content is not None:
        url = (media_content.get("url") or "").strip()
        if url:
            return url

    media_thumbnail = item.find("media:thumbnail", NS)
    if media_thumbnail is not None:
        url = (media_thumbnail.get("url") or "").strip()
        if url:
            return url

    enclosure = item.find("enclosure")
    if enclosure is not None:
        url = (enclosure.get("url") or "").strip()
        enc_type = (enclosure.get("type") or "").lower()
        if url and (not enc_type or enc_type.startswith("image")):
            return url

    for raw_html in (content_encoded_raw, description_raw):
        if raw_html:
            m = IMG_TAG_RE.search(raw_html)
            if m:
                return html.unescape(m.group(1).strip())

    return None


def fetch_feed(url: str, category: str) -> list[dict]:
    # يدعم رابط إنترنت (http/https) أو مسار ملف XML محلي على الجهاز
    if url.startswith("http://") or url.startswith("https://"):
        try:
            resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            raw_content = resp.content
        except requests.RequestException as e:
            log.warning(f"  ⚠️  فشل سحب {url}: {e}")
            return []
    else:
        try:
            with open(url, "rb") as f:
                raw_content = f.read()
        except OSError as e:
            log.warning(f"  ⚠️  فشل قراءة الملف المحلي {url}: {e}")
            return []

    try:
        root = ET.fromstring(raw_content)
    except ET.ParseError as e:
        log.warning(f"  ⚠️  فشل تحليل XML من {url}: {e}")
        return []

    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date_raw = item.findtext("pubDate") or ""
        description = item.findtext("description") or ""
        content_encoded = item.findtext("content:encoded", namespaces=NS) or ""
        author_raw = (item.findtext("author") or item.findtext("dc:creator") or "").strip()

        if not title or not link:
            continue

        pub_date = parse_pub_date(pub_date_raw, source_url=url)

        image_url = extract_image_url(item, description, content_encoded)

        body = content_encoded or description
        items.append({
            "title": strip_html(title),
            "link": link,
            "pub_date": pub_date,
            "raw_body": strip_html(body),
            "source_feed": url,
            "image_url": image_url,
            "category": category,
            "author": strip_html(author_raw) or None,
        })
    return items


def parse_pub_date(pub_date_raw: str, source_url: str = "") -> datetime:
    """
    تحليل تاريخ النشر من مصادر RSS/XML متعددة الصيغ.

    المشكلة الأصلية: parsedate_to_datetime تتوقع صيغة RFC-822 القياسية فقط
    (مثل "Sat, 04 Jul 2026 15:11:31 GMT"). أي مصدر يكتب التاريخ بصيغة
    مختلفة (شائع بالملفات المحلية المُصدَّرة يدوياً) كان يتسبب بفشل صامت
    ويُستبدل التاريخ الحقيقي بوقت تشغيل البوت نفسه (datetime.now()) —
    وهذا ما يفسر ظهور عدة أخبار بنفس التوقيت بالضبط في RSS/الموقع.

    الحل: تجربة عدة صيغ شائعة قبل الاستسلام، مع تسجيل تحذير واضح
    لو فشلت كل المحاولات (بدل الفشل الصامت السابق).
    """
    raw = (pub_date_raw or "").strip()
    if not raw:
        log.warning(f"  ⚠️  تاريخ نشر فارغ من المصدر {source_url or '(غير معروف)'} — استُخدم وقت البوت الحالي كبديل.")
        return datetime.now(timezone.utc)

    # 1) الصيغة القياسية RFC-822 (المتوقعة أصلاً بمعظم فيدات RSS)
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass

    # 2) صيغ شائعة بديلة (ISO 8601 وصيغ عربية/محلية مألوفة)
    fallback_formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ]
    cleaned = raw.replace("Z", "+00:00")
    for fmt in fallback_formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            continue

    # 3) فشلت كل المحاولات — نسجل تحذير صريح بدل الفشل الصامت
    log.warning(
        f"  ⚠️  تعذّر تحليل تاريخ النشر '{raw}' من المصدر {source_url or '(غير معروف)'} "
        "— استُخدم وقت تشغيل البوت كبديل مؤقت. يُفضّل فحص صيغة التاريخ بهذا المصدر."
    )
    return datetime.now(timezone.utc)


def contains_blocked_keyword(title: str, body: str) -> bool:
    """يفحص إذا كان عنوان/متن الخبر يحتوي أياً من BLOCKED_KEYWORDS، لمنعه من
    الإرسال لـGemini أو النشر (تُطبَّق على كل الفيدات ما عدا المستثناة عبر
    BLOCKED_KEYWORDS_EXEMPT_SOURCES)."""
    texts = [title or "", body or ""]
    combined = " ".join(t for t in texts if t)
    return any(kw in combined for kw in BLOCKED_KEYWORDS)


# مصادر مستثناة تماماً من فلترة BLOCKED_KEYWORDS (تُطبَّق على كل الفيدات
# الأخرى بدون استثناء). حالياً: المساء + الاتحاد برس.
BLOCKED_KEYWORDS_EXEMPT_SOURCES = {RSS_MASA_URL, RSS_ALITTIHAD_FULL_URL}


def collect_recent_items(feed_categories: Optional[dict] = None) -> list[dict]:
    if feed_categories is None:
        feed_categories = RSS_FEED_CATEGORIES
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOURS_WINDOW)
    all_items = []
    for feed_url, category in feed_categories.items():
        log.info(f"📡 سحب: {feed_url}  ← القسم: {category}")
        items = fetch_feed(feed_url, category)
        recent = [it for it in items if it["pub_date"] >= cutoff]
        log.info(f"   ↳ {len(items)} خبر إجمالي، {len(recent)} خلال آخر {HOURS_WINDOW} ساعة")
        if feed_url in BLOCKED_KEYWORDS_EXEMPT_SOURCES:
            all_items.extend(recent)
            continue
        before = len(recent)
        recent = [it for it in recent if not contains_blocked_keyword(it["title"], it["raw_body"])]
        blocked = before - len(recent)
        if blocked:
            log.info(f"   ↳ 🚫 تم تجاوز {blocked} خبر يحتوي كلمات محظورة (لن يُرسل لـ Gemini أو يُنشر)")
        all_items.extend(recent)
    return all_items


# ══════════════════════════════════════════════════════════════════════
#  📰  استخراج نص الخبر الكامل من صفحته (المنطق الجديد — extract_article_test.py)
# ──────────────────────────────────────────────────────────────────────
#  مدمجة حرفياً كما هي من extract_article_test.py، بدون أي تعديل على
#  منطقها الداخلي. تُستخدم فقط عندما يختار المستخدم وضع "1" عند التشغيل
#  (استخراج الخبر كاملاً بفتح كل صفحة، بدل الاكتفاء بملخص/متن RSS).
#  ⚠️ أسماء الثوابت العامة (REQUEST_TIMEOUT/HEADERS/DEBUG) في السكربت
#  الأصلي أُعيدت تسميتها بادئة ARTICLE_ لتفادي أي تعارض مع ثوابت البوت
#  الحالية (خصوصاً REQUEST_TIMEOUT=60 المستخدم بباقي طلبات الشبكة بالبوت).
# ══════════════════════════════════════════════════════════════════════

ARTICLE_REQUEST_TIMEOUT = 30
ARTICLE_HEADERS = {"User-Agent": "Mozilla/5.0 (Android; Mobile) NewsBot/1.0"}

# مطفأ افتراضياً هنا (كان True بسكربت الاختبار المستقل للتشخيص التفاعلي) —
# داخل البوت الكامل تشغيله لكل خبر سيغرق سجل اللوغ بتفاصيل كل خطوة استخراج.
# فعّله يدوياً إذا احتجت تشخيص مشكلة استخراج معينة.
ARTICLE_DEBUG = False

# حد أدنى لطول نص العنصر عشان يُعتبر "فقرة حقيقية محتملة" وليس زر/رابط قصير
MIN_LEAF_LEN = 25

# إذا الاستخراج المحلي (JSON-LD + ترتيب الصفحة + تجميع الكتل) رجّع أقل من
# هذا العدد من الحروف، نعتبره فاشلاً/غير كافي ونجرب Jina Reader كحل أخير
MIN_ACCEPTABLE_LOCAL_LEN = 150

# وسوم لا تحتوي أبداً نص مقال حقيقي — تُستبعد قبل أي تحليل
ALWAYS_STRIP_TAGS = ("script", "style", "iframe", "form", "noscript", "svg")

# محارف تحكم خفية (Zero-Width / BOM) تظهر أحياناً بمنتصف الكلمات بالنصوص
# العربية المنسوخة من الويب، وتسبب رمز غريب (�) عند الطباعة/التخزين
ZERO_WIDTH_RE = re.compile(r"[\u200b\u200c\u200d\u200e\u200f\ufeff]")


def _clean_text(text: str) -> str:
    """يشيل محارف التحكم الخفية ويهذّب المسافات الزايدة."""
    text = ZERO_WIDTH_RE.sub("", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


# أسطر مفردة تُتجاهل (تُتخطى فقط، بدون إيقاف الاستخراج) حتى لو وقعت
# داخل نطاق المتن — لأنها ليست جزءاً من الخبر نفسه
NOISE_LINE_PATTERNS = [
    r"^شارك$",
    r"^المصدر\s*/",
    r"^تابعونا على",
    r"^متابعات خاصة",     # مثل: "متابعات خاصة _ المساء برس"
    r"صحيفة (الكترونية|إلكترونية) تأسست",  # فقرة "عن الصحيفة" بالفوتر (نص ثابت لا يتغير، يظهر بأغلب صفحات نفس الموقع)
    r"^!Image\s*\d+",      # تعليق/بديل صورة (مكرر غالباً لنفس عنوان الخبر أو صور كتّاب)
    r"^آخر تحديث\s*:",     # توقيت آخر تحديث للموقع (ثابت بكل الصفحات، مو جزء من الخبر)
    r"^انشر",              # سطر أزرار المشاركة الاجتماعية المتلاصقة (مثل: "انشرFacebookTwitterEmail...")
    r"^تفاصيل\s*:",        # رابط ترويجي داخلي لخبر آخر مضمّن وسط المتن (مثل العربي نيوز: "تفاصيل: ...")، مو جزء من سرد الخبر نفسه
    r"^\s*$",
]

# صيغة توقيت مميزة لويدجت "آخر الأخبار/أحدث المنشورات" الثابت (يتكرر بكل
# صفحات الموقع): "السبت/04/يوليو/2026 - 05:07 م" — بشرطات مائلة بين
# اليوم/الشهر/السنة، تختلف عن توقيت الخبر الحقيقي "السبت - 04 يوليو 2026 -
# 10:14 م بتوقيت عدن" (بمسافات وشرطات عادية). نستخدمها كعلامة توقف مبكرة
# وأدق من "احدث المنشورات" نفسها، لأن التيزرات تبدأ قبل تلك العبارة أحياناً.
STOP_REGEX_PATTERNS = [
    re.compile(r"^\S+/\d{1,2}/\S+/\d{4}\s*-\s*\d{1,2}:\d{2}\s*[صم]\.?\s*$"),
]


def _hits_stop_regex(text: str) -> bool:
    return any(p.match(text.strip()) for p in STOP_REGEX_PATTERNS)

# علامات توقف: أول عنصر بالكتلة الفائزة نصه يطابقها = نهاية المتن الفعلي
STOP_MARKERS = [
    "مواضيع قد تهمك",
    "قد يعجبك ايضا",
    "قد يعجبك أيضا",
    "أخبار أخرى قد تعجبك",
    "المقال السابق",
    "المقال التالي",
    "الأكثر قراءة",
    "أحدث المنشورات",
    "احدث المنشورات",
    "مقالات ذات صلة",
    "التعليقات",
    "أضف تعليق",
    "اترك تعليقاً",
    "اترك رد",
    "شارك المقال",
]


def _extract_by_doc_order(h1: Optional[Tag], soup: BeautifulSoup) -> list[str]:
    """يمشي بترتيب ظهور الصفحة بعد العنوان ويلقط كل <p>/<h2-4>، متوقفاً عند
    أول علامة توقف (تعليقات/مقالات ذات صلة/إلخ)."""
    start_node = h1 or soup.body or soup
    paragraphs = []
    for el in start_node.find_all_next(["p", "h2", "h3", "h4"]):
        text = _clean_text(el.get_text(" ", strip=True))
        if not text:
            continue
        if _hits_stop_regex(text):
            break
        if _text_hits_stop_marker(text):
            break
        if _is_noise_line(text):
            continue
        if len(text) < 20:
            continue
        paragraphs.append(text)
    return paragraphs


def _is_noise_line(text: str) -> bool:
    """يفحص لو السطر بالكامل يطابق نمط ضجيج معروف. نستخدم re.search (مو
    re.match) لأن بعض الأنماط (مثل فقرة 'عن الصحيفة' بالفوتر) قد لا تبدأ
    بالضبط من أول حرف بالسطر."""
    text = text.strip()
    return any(re.search(p, text) for p in NOISE_LINE_PATTERNS)


def _text_hits_stop_marker(text: str) -> bool:
    text = text.strip()
    return any(marker in text for marker in STOP_MARKERS)


def _own_visible_text_len(tag: Tag) -> int:
    return len(tag.get_text(" ", strip=True))


def _find_leaf_blocks(soup: BeautifulSoup) -> list[Tag]:
    """يرجع كل العناصر اللي هي 'كتلة نص' فعلية (مو مجرد غلاف لعناصر أخرى)."""
    leaves = []
    for tag in soup.find_all(True):
        if tag.name in ALWAYS_STRIP_TAGS:
            continue
        text_len = _own_visible_text_len(tag)
        if text_len < MIN_LEAF_LEN:
            continue
        has_big_child = any(
            isinstance(c, Tag) and c.name not in ALWAYS_STRIP_TAGS
            and _own_visible_text_len(c) >= MIN_LEAF_LEN
            for c in tag.find_all(True, recursive=False)
        )
        if has_big_child:
            continue
        leaves.append(tag)
    return leaves


def _walk_jsonld(node) -> list[dict]:
    found = []
    if isinstance(node, dict):
        found.append(node)
        for v in node.values():
            found.extend(_walk_jsonld(v))
    elif isinstance(node, list):
        for item in node:
            found.extend(_walk_jsonld(item))
    return found


def _extract_from_jsonld(soup: BeautifulSoup) -> Optional[dict]:
    scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
    if ARTICLE_DEBUG:
        print(f"  🔧 عدد وسوم JSON-LD الموجودة: {len(scripts)}")

    for script in scripts:
        raw = script.string or script.get_text() or ""
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for obj in _walk_jsonld(data):
            body = obj.get("articleBody") or obj.get("text")
            if body and isinstance(body, str) and len(body) > MIN_LEAF_LEN:
                title = obj.get("headline") or obj.get("name")
                body = _clean_text(body)
                if ARTICLE_DEBUG:
                    print(f"  ✅ لقيت articleBody داخل JSON-LD ({len(body)} حرف)")
                return {"title": _clean_text(title) if title else title,
                        "body": body,
                        "paragraphs": [p.strip() for p in body.split("\n") if p.strip()]}
    return None


# ──────────────────────────────────────────────────────────────────────
# حل احتياطي: Jina AI Reader — يفتح الصفحة فعلياً (بمحرك متصفح خفي على
# سيرفرات Jina) ويشغّل جافاسكربت، ويرجع النص النهائي الجاهز كماركداون.
# مجاني، بدون تسجيل، بدون مفتاح API — فقط GET عادي.
# ──────────────────────────────────────────────────────────────────────

JINA_READER_BASE = "https://r.jina.ai/"

# أسطر تعتبر "قائمة تنقل/روابط" مو متن خبر حقيقي، تظهر كثير بمخرجات Jina
_MD_LINK_ONLY_RE = re.compile(r"^[-*+]?\s*!?\[[^\]]*\]\([^)]*\)\s*$")
_MD_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def _strip_markdown_noise(text: str) -> str:
    """يشيل تنسيق الماركداون تماماً، بالترتيب الصحيح من الداخل للخارج:
    أولاً الصور (حتى المتداخلة داخل رابط، مثل [![نص](رابط_صورة)](رابط_وجهة)
    التي يستخدمها هذا الموقع لكل الإعلانات والأيقونات) تُحذف بالكامل مع نصها
    البديل (alt text)، ثم أي رابط نصي متبقٍ [نص](رابط) يتحول لنصه فقط."""
    # صور (مع دعم title اختياري بين علامتي تنصيص داخل الأقواس) — تُحذف بالكامل
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', "", text)
    # روابط نصية متبقية بعد حذف الصور — نحتفظ بالنص فقط
    text = _MD_LINK_RE.sub(r"\1", text)
    text = re.sub(r"^#+\s*", "", text)          # عناوين ماركداون (#, ##...)
    text = re.sub(r"[*_`]+", "", text)           # تنسيق غامق/مائل
    return _clean_text(text)


def fetch_via_jina(url: str) -> Optional[str]:
    """يرجع محتوى الصفحة كنص/ماركداون بعد تشغيل جافاسكربت فعلياً، أو None
    لو فشل الطلب."""
    reader_url = JINA_READER_BASE + url
    try:
        resp = requests.get(reader_url, headers=ARTICLE_HEADERS, timeout=ARTICLE_REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as e:
        if ARTICLE_DEBUG:
            print(f"  ⚠️  فشل طلب Jina Reader: {e}")
        return None
    if ARTICLE_DEBUG:
        print(f"  🔧 Jina Reader رجّع {len(resp.text)} حرف")
    return resp.text


def extract_via_jina(url: str, fallback_title: Optional[str] = None) -> Optional[dict]:
    raw = fetch_via_jina(url)
    if not raw:
        return None

    # مخرجات Jina العادية تجي بصيغة:
    #   Title: ...
    #   URL Source: ...
    #   Markdown Content:
    #   <المحتوى الفعلي هنا>
    title = fallback_title
    if not title:
        m = re.search(r"^Title:\s*(.+)$", raw, re.MULTILINE)
        if m:
            title = _clean_text(m.group(1))

    if "Markdown Content:" in raw:
        content = raw.split("Markdown Content:", 1)[1]
    else:
        content = raw

    paragraphs: list[str] = []
    for line in content.splitlines():
        line = ZERO_WIDTH_RE.sub("", line).strip()
        if not line:
            continue
        cleaned = _strip_markdown_noise(line)
        if not cleaned:
            continue
        if _hits_stop_regex(cleaned):
            if ARTICLE_DEBUG:
                print(f"  ⛔ (Jina) توقف عند توقيت تيزر: \"{cleaned[:60]}\"")
            break
        if _text_hits_stop_marker(cleaned):
            if ARTICLE_DEBUG:
                print(f"  ⛔ (Jina) توقف عند: \"{cleaned[:60]}\"")
            break
        if _is_noise_line(cleaned):
            continue
        if len(cleaned) < 25:
            continue
        paragraphs.append(cleaned)

    if not paragraphs:
        return None

    body = "\n\n".join(paragraphs)
    if ARTICLE_DEBUG:
        print(f"  ✅ (Jina) استخرجت {len(paragraphs)} فقرة، {len(body)} حرف")
    return {"title": title, "body": body, "paragraphs": paragraphs}


def _detect_site_category(h1: Optional[Tag]) -> Optional[str]:
    """يحاول قراءة اسم القسم الفعلي للخبر كما يعرضه موقع عدن تايم بعنوان
    (h2/h3) يظهر مباشرة قبل عنوان الخبر الرئيسي (h1) بالصفحة، مثل
    'اخبار رياضية' أو 'اخبار عدن'. يُستخدم فقط بوضع '1' مع فيد عدن تايم
    لتصحيح قسم النشر تلقائياً بدل تثبيته على قسم واحد لكل الفيد."""
    if h1 is None:
        return None
    for tag in h1.find_all_previous(["h2", "h3"]):
        text = _clean_text(tag.get_text(strip=True))
        if text:
            return text
    return None


def extract_article(url: str) -> Optional[dict]:
    try:
        resp = requests.get(url, headers=ARTICLE_HEADERS, timeout=ARTICLE_REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  ⚠️  فشل جلب الصفحة مباشرة ({e}) — أجرب Jina Reader كحل احتياطي")
        # فشل الطلب المباشر بالكامل (غالباً 403 من حماية ضد البوتات مثل
        # Cloudflare) لا يعني فشل الاستخراج نهائياً — Jina Reader يفتح
        # الصفحة فعلياً بمتصفح حقيقي من سيرفراته الخاصة، وغالباً يتجاوز هذا
        # النوع من الحظر. بدون هذه المحاولة، كان الخبر يفشل استخراجه بالكامل
        # ويُنشر بملخص RSS القصير الأصلي بدل متنه الكامل.
        return extract_via_jina(url)

    if ARTICLE_DEBUG:
        print(f"  🔧 حجم HTML المستلم: {len(resp.content)} بايت")

    soup = BeautifulSoup(resp.content, "html.parser")

    h1 = soup.find("h1")
    if h1 is None:
        # بعض المواقع (مثل الاتحاد برس) تضع عنوان الخبر داخل h2/h3 بدل h1،
        # فنحدده بمطابقة نصه مع meta[og:title] عشان نبدأ المشي بترتيب الصفحة
        # من مكانه الصحيح، بدل ما نبدأ من أول الصفحة كلها (قوائم التنقل...)
        # وننتهي بالتقاط عناوين أخبار أخرى غير مرتبطة من قسم "أخبار قد تعجبك".
        og_title_tag = soup.find("meta", attrs={"property": "og:title"})
        og_title = _clean_text(og_title_tag.get("content", "")) if og_title_tag else None
        if og_title:
            for candidate in soup.find_all(["h2", "h3"]):
                if _clean_text(candidate.get_text(" ", strip=True)) == og_title:
                    h1 = candidate
                    break
    title = _clean_text(h1.get_text(strip=True)) if h1 else None
    if ARTICLE_DEBUG:
        print(f"  🔧 العنوان (h1): {title}")

    site_category = _detect_site_category(h1)
    if ARTICLE_DEBUG:
        print(f"  🔧 القسم المكتشف من الصفحة: {site_category}")

    def _with_cat(d: Optional[dict]) -> Optional[dict]:
        if d is not None:
            d.setdefault("site_category", site_category)
        return d

    jsonld_result = _extract_from_jsonld(soup)
    if jsonld_result:
        if not jsonld_result.get("title"):
            jsonld_result["title"] = title
        return _with_cat(jsonld_result)

    for tag_name in ALWAYS_STRIP_TAGS:
        for t in soup.find_all(tag_name):
            t.decompose()

    doc_order_paragraphs = _extract_by_doc_order(h1, soup)
    total_len = sum(len(p) for p in doc_order_paragraphs)
    if ARTICLE_DEBUG:
        print(f"  🔧 نتيجة الاستخراج بترتيب ظهور الصفحة: {len(doc_order_paragraphs)} "
              f"فقرة، {total_len} حرف")

    if total_len >= MIN_ACCEPTABLE_LOCAL_LEN:
        return _with_cat({"title": title, "body": "\n\n".join(doc_order_paragraphs),
                "paragraphs": doc_order_paragraphs})

    if ARTICLE_DEBUG:
        print("  ℹ️  المحتوى المستخرج بترتيب الصفحة قصير جداً — أجرب تجميع الكتل النصية")

    leaves = _find_leaf_blocks(soup)
    if ARTICLE_DEBUG:
        print(f"  🔧 عدد كتل النص (leaf blocks) بكل الصفحة: {len(leaves)}")

    best_paragraphs: list[str] = []
    if leaves:
        groups: dict[int, dict] = {}
        for leaf in leaves:
            parent = leaf.parent
            key = id(parent)
            g = groups.setdefault(key, {"parent": parent, "leaves": [], "total_len": 0})
            g["leaves"].append(leaf)
            g["total_len"] += _own_visible_text_len(leaf)

        best = max(groups.values(), key=lambda g: g["total_len"])
        if ARTICLE_DEBUG:
            print(f"  🔧 عدد المجموعات (parents) المرشحة: {len(groups)}")

        for leaf in best["leaves"]:
            text = _clean_text(leaf.get_text(" ", strip=True))
            if _hits_stop_regex(text):
                if ARTICLE_DEBUG:
                    print(f"  ⛔ توقف عند توقيت تيزر: \"{text[:60]}\"")
                break
            if _text_hits_stop_marker(text):
                if ARTICLE_DEBUG:
                    print(f"  ⛔ توقف عند: \"{text[:60]}\"")
                break
            if _is_noise_line(text):
                continue
            best_paragraphs.append(text)

    best_total_len = sum(len(p) for p in best_paragraphs)
    if best_total_len >= MIN_ACCEPTABLE_LOCAL_LEN:
        return _with_cat({"title": title, "body": "\n\n".join(best_paragraphs),
                "paragraphs": best_paragraphs})

    # ── كل المحاولات المحلية ما كفت (يعني الأغلب المحتوى مبني بجافاسكربت) ──
    if ARTICLE_DEBUG:
        print("  ℹ️  كل الطرق المحلية رجّعت محتوى قصير/فاضي — أجرب Jina Reader")

    jina_result = extract_via_jina(url, fallback_title=title)
    if jina_result:
        return _with_cat(jina_result)

    # آخر ما نرجع له: أفضل نتيجة محلية توصلنا لها، ولو قصيرة
    if best_total_len > total_len:
        return _with_cat({"title": title, "body": "\n\n".join(best_paragraphs),
                "paragraphs": best_paragraphs})
    return _with_cat({"title": title, "body": "\n\n".join(doc_order_paragraphs),
            "paragraphs": doc_order_paragraphs})


# خريطة تحويل اسم القسم كما يظهر فعلياً بصفحة الخبر بموقع عدن تايم إلى أحد
# أقسام "حصاد اليوم" المعتمدة — تُستخدم فقط بوضع "1" لتصحيح قسم كل خبر من
# عدن تايم تلقائياً حسب قسمه الحقيقي، بدل تثبيته دائماً على "أخبار وتقارير".
# أي قسم مصدر غير مذكور هنا، أو تعذّر اكتشافه من الصفحة، يعني استبعاد الخبر
# كاملاً من النشر (بدل تخمين قسمه أو نشره بقسم خاطئ).
# ⚠️ بطلب صريح: محصورة حالياً على قسمين فقط (رياضة + عرب وعالم) — أي خبر
# عدن تايم من قسم "كتابات"/"اخبار عدن"/"اخبار وتقارير"/"اخبار محافظات
# اليمن" يُستبعد تلقائياً الآن (كان يُنشر سابقاً قبل هذا التحديد). لإرجاع
# أي قسم من هذي للنشر مرة أخرى، فقط أضف سطره القديم هنا من جديد.
SITE_CATEGORY_MAP = {
    "رياض": "رياضة",              # يغطي: رياضة / اخبار رياضية / الرياضة
    "عرب وعالم": "شؤون دولية",
}


def map_site_category(site_category: Optional[str]) -> Optional[str]:
    """يرجّع اسم القسم المطابق بموقعنا، أو None لو القسم المكتشف غير معروف
    أو لم يُكتشف أصلاً (حالة None تعني: استبعد الخبر من النشر)."""
    if not site_category:
        return None
    for key, target in SITE_CATEGORY_MAP.items():
        if key in site_category:
            return target
    return None


def apply_full_extraction(items: list[dict]) -> None:
    """يُستدعى فقط بوضع '1' (استخراج الخبر كاملاً). يمشي على كل خبر بالقائمة
    (من عدن تايم أو المساء برس أو الاتحاد برس معاً)
    ويفتح رابطه فعلياً عبر extract_article()، ويستبدل raw_body بالنص الكامل
    المستخرج من الصفحة نفسها بدل الاكتفاء بملخص/متن RSS القصير. العنوان
    الأصلي القادم من RSS يبقى كما هو (لا يُستبدل)، وأي خبر يفشل استخراجه
    كاملاً يحتفظ بـ raw_body الأصلي من RSS كما هو (بدون إيقاف تشغيل البوت).
    لأخبار عدن تايم فقط: يصحّح القسم تلقائياً حسب القسم الفعلي المكتشف من
    صفحة الخبر (عبر SITE_CATEGORY_MAP)؛ وأي خبر قسمه غير معروف أو تعذّر
    اكتشافه يُعلَّم بـ "_excluded" ليُستبعد من النشر تماماً بدل تخمين قسمه.
    قسم أخبار المساء والاتحاد برس لا يُمس إطلاقاً ويبقى
    كما اختاره المستخدم عند التشغيل."""
    total = len(items)
    for idx, it in enumerate(items, start=1):
        log.info(f"  🧲 [{idx}/{total}] استخراج الخبر الكامل: {it['link'][:80]}")
        result = extract_article(it["link"])
        if result and result.get("body") and len(result["body"]) >= MIN_ACCEPTABLE_LOCAL_LEN:
            it["raw_body"] = result["body"]
            if it.get("source_feed") == RSS_ADEN_TM_FULL_URL:
                corrected = map_site_category(result.get("site_category"))
                if corrected is None:
                    log.info(
                        f"     ↳ 🚫 قسم غير معروف/تعذّر اكتشافه "
                        f"({result.get('site_category')!r}) — سيُستبعد الخبر من النشر."
                    )
                    it["_excluded"] = True
                elif corrected != it["category"]:
                    log.info(f"     ↳ 🗂️  تصحيح القسم تلقائياً: {it['category']} → {corrected}")
                    it["category"] = corrected
        else:
            log.warning(
                f"  ⚠️  تعذّر استخراج الخبر كاملاً لهذا الرابط — سيُستخدم نص RSS "
                "الأصلي بدلاً منه (بدون إيقاف التشغيل)."
            )


# ══════════════════════════════════════════════════════════════════════
#  🗄️  Supabase REST API
# ══════════════════════════════════════════════════════════════════════

SB_HEADERS: Optional[dict] = None


def sb_headers() -> dict:
    global SB_HEADERS
    if SB_HEADERS is None:
        if not SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_ANON_KEY غير مضبوط. أضفه كمتغير بيئة قبل تشغيل البوت.")
        SB_HEADERS = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
    return SB_HEADERS


def summarize_sb_error(response: requests.Response) -> str:
    try:
        data = response.json()
        if isinstance(data, dict):
            parts = [data.get("message"), data.get("details"), data.get("hint"), data.get("code")]
            return " | ".join(str(p) for p in parts if p)[:500]
    except ValueError:
        pass
    return response.text[:500]


def cleanup_system_logs() -> None:
    """ينظّف سجلات النظام المتراكمة (cron.job_run_details و net._http_response)
    عبر دالة RPC آمنة (cleanup_system_logs) بقاعدة البيانات. لا يوقف تشغيل
    البوت أبداً حتى لو فشل التنظيف (مثلاً لو الدالة غير موجودة بعد بقاعدة البيانات)."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/cleanup_system_logs"
    try:
        r = requests.post(url, headers=sb_headers(), json={}, timeout=REQUEST_TIMEOUT)
        if r.status_code in (200, 204):
            try:
                data = r.json()
            except ValueError:
                data = {}
            cron_n = data.get("deleted_cron_job_run_details")
            net_n = data.get("deleted_net_http_response")
            parts = []
            if cron_n == -1:
                parts.append("cron.job_run_details غير متاح")
            elif cron_n is not None:
                parts.append(f"cron: {cron_n} سجل")
            if net_n == -1:
                parts.append("net._http_response غير متاح")
            elif net_n is not None:
                parts.append(f"net: {net_n} سجل")
            summary = " | ".join(parts) if parts else "بدون تفاصيل إضافية"
            log.info(f"🧹 تم تنظيف سجلات النظام الأقدم من 72 ساعة ({summary})")
        else:
            log.warning(f"⚠️  تعذّر تنظيف سجلات النظام [{r.status_code}]: {r.text[:200]}")
    except requests.RequestException as e:
        log.warning(f"⚠️  تعذّر تنظيف سجلات النظام (خطأ اتصال): {e}")


def check_system_logs_size() -> None:
    """يتحقق من عدد صفوف cron.job_run_details و net._http_response عبر دالة
    RPC (get_system_logs_counts) بقاعدة البيانات. لو أي منهما تجاوز
    SYSTEM_LOGS_ALERT_THRESHOLD، يرسل تنبيهاً لمحادثة الإدارة الخاصة (وليس
    قناة الأخبار العامة). لا يوقف تشغيل البوت أبداً حتى لو فشل الفحص."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/get_system_logs_counts"
    try:
        r = requests.post(url, headers=sb_headers(), json={}, timeout=REQUEST_TIMEOUT)
        if r.status_code not in (200, 204):
            log.warning(f"⚠️  تعذّر فحص حجم سجلات النظام [{r.status_code}]: {r.text[:200]}")
            return
        try:
            data = r.json()
        except ValueError:
            data = {}
        cron_n = data.get("cron_count")
        net_n = data.get("net_count")
        exceeded = []
        if isinstance(cron_n, int) and cron_n > SYSTEM_LOGS_ALERT_THRESHOLD:
            exceeded.append(f"cron.job_run_details: {cron_n:,} سجل")
        if isinstance(net_n, int) and net_n > SYSTEM_LOGS_ALERT_THRESHOLD:
            exceeded.append(f"net._http_response: {net_n:,} سجل")
        if exceeded:
            msg = (
                "🚨 تنبيه (حصاد اليوم): تجاوز حجم جداول سجلات النظام الحد "
                f"المسموح ({SYSTEM_LOGS_ALERT_THRESHOLD:,} سجل):\n\n"
                + "\n".join(f"• {line}" for line in exceeded)
                + "\n\nتحقّق من جدولة cron.schedule('cleanup-system-logs-6h') "
                  "وتأكد أنها تعمل بشكل صحيح."
            )
            log.warning(f"⚠️  {msg}")
            send_admin_alert(msg)
        else:
            log.info(
                f"✅ حجم سجلات النظام طبيعي (cron: {cron_n}, net: {net_n})"
            )
    except requests.RequestException as e:
        log.warning(f"⚠️  تعذّر فحص حجم سجلات النظام (خطأ اتصال): {e}")


# كاش بالذاكرة لتفادي استعلام Supabase عن نفس القسم أكثر من مرة بنفس التشغيلة
_CATEGORY_ID_CACHE: dict[str, Optional[str]] = {}


def get_category_id(name: str) -> Optional[str]:
    """يرجّع id القسم من جدول categories بموقع حصاد اليوم عبر اسمه، أو None
    لو القسم غير موجود بالجدول (يعني: استبعد الخبر من النشر بدل تخمين قسمه)."""
    if name in _CATEGORY_ID_CACHE:
        return _CATEGORY_ID_CACHE[name]

    url = f"{SUPABASE_URL}/rest/v1/categories"
    try:
        r = requests.get(url, headers=sb_headers(),
                          params={"name": f"eq.{name}", "select": "id,name,slug"},
                          timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        rows = r.json()
        if not rows:
            # محاولة ثانية بمطابقة تقريبية في حال اختلاف بسيط بالتشكيل/المسافات
            r = requests.get(url, headers=sb_headers(),
                              params={"name": f"ilike.*{name}*", "select": "id,name,slug"},
                              timeout=REQUEST_TIMEOUT)
            r.raise_for_status()
            rows = r.json()
        if not rows:
            log.warning(f"⚠️  لم يُعثر على قسم باسم '{name}' بجدول categories.")
            _CATEGORY_ID_CACHE[name] = None
            return None
        category_id = rows[0]["id"]
        log.info(f"📂 التصنيف: {rows[0]['name']} (id={category_id})")
        _CATEGORY_ID_CACHE[name] = category_id
        return category_id
    except requests.RequestException as e:
        log.warning(f"⚠️  فشل الاتصال أثناء البحث عن القسم '{name}': {e}")
        return None


def load_blocked_links() -> set:
    """يقرأ روابط الأخبار الممنوعة نهائياً من ملف BLOCKED_LINKS_FILE (لو موجود).
    يرجّع set فارغ لو الملف غير موجود أو تالف، بدون إيقاف البوت."""
    try:
        with open(BLOCKED_LINKS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return set(data) if isinstance(data, list) else set()
    except FileNotFoundError:
        return set()
    except (json.JSONDecodeError, OSError) as e:
        log.warning(f"⚠️  تعذّر قراءة ملف الروابط المحظورة دائماً ({BLOCKED_LINKS_FILE}): {e}")
        return set()


def save_blocked_link(link: str) -> None:
    """يضيف رابط خبر لملف الحظر الدائم (BLOCKED_LINKS_FILE) فوراً، بحيث
    يبقى مستبعداً في كل التشغيلات القادمة حتى لو أُلغيت الجلسة الحالية
    قبل مرحلة 'تأكيد' النشر."""
    if not link:
        return
    blocked = load_blocked_links()
    if link in blocked:
        return
    blocked.add(link)
    try:
        import os
        os.makedirs(os.path.dirname(BLOCKED_LINKS_FILE), exist_ok=True)
        with open(BLOCKED_LINKS_FILE, "w", encoding="utf-8") as f:
            json.dump(sorted(blocked), f, ensure_ascii=False, indent=2)
    except OSError as e:
        log.warning(f"⚠️  تعذّر حفظ الحظر الدائم لهذا الرابط ({BLOCKED_LINKS_FILE}): {e}")


def load_pending_scheduled() -> list:
    """يقرأ قائمة الأخبار المجدولة اللي لسا ما اتأكدنا من نشرها ولا أرسلنا
    رابطها لتيليجرام بعد. يرجّع قائمة فارغة لو الملف غير موجود أو تالف."""
    try:
        with open(PENDING_SCHEDULED_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except FileNotFoundError:
        return []
    except (json.JSONDecodeError, OSError) as e:
        log.warning(f"⚠️  تعذّر قراءة ملف الأخبار المجدولة المعلّقة ({PENDING_SCHEDULED_FILE}): {e}")
        return []


def save_pending_scheduled(pending: list) -> None:
    """يحفظ قائمة الأخبار المجدولة المعلّقة (بعد الإضافة أو الإزالة)."""
    try:
        import os
        os.makedirs(os.path.dirname(PENDING_SCHEDULED_FILE), exist_ok=True)
        with open(PENDING_SCHEDULED_FILE, "w", encoding="utf-8") as f:
            json.dump(pending, f, ensure_ascii=False, indent=2)
    except OSError as e:
        log.warning(f"⚠️  تعذّر حفظ ملف الأخبار المجدولة المعلّقة ({PENDING_SCHEDULED_FILE}): {e}")


def get_bot_post_status(post_id: str) -> Optional[dict]:
    """يفحص حالة خبر مجدول عبر RPC آمن؛ لأن RLS يخفي scheduled عن anon."""
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/get_bot_post_status",
            headers=sb_headers(),
            json={"_post_id": post_id},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as e:
        log.warning(f"  ⚠️  تعذّر الاتصال بدالة فحص الخبر المجدول: {e}")
        return None
    if r.status_code != 200:
        log.warning(f"  ⚠️  تعذّر فحص الخبر المجدول عبر RPC [{r.status_code}]: {summarize_sb_error(r)}")
        return None
    try:
        data = r.json()
    except ValueError:
        return None
    return data[0] if isinstance(data, list) and data else data if isinstance(data, dict) else None


def check_and_notify_scheduled_posts() -> None:
    """
    يُستدعى بأول كل تشغيلة للسكربت (قبل جلب أي أخبار جديدة).

    يفحص كل خبر بقائمة PENDING_SCHEDULED_FILE (أخبار سبق جدولتها بجلسة
    سابقة) ويتحقق من حالتها الحالية بقاعدة البيانات:
      - لو status = published  → صار منشوراً فعلياً (الـ Cron نشره) →
        يُرسل رابطه لتيليجرام الآن لأول مرة، ثم يُحذف من قائمة الانتظار.
      - لو status = scheduled  → لسا ما نُشر → يبقى بقائمة الانتظار
        بدون أي إرسال، ويُعاد فحصه بالتشغيلة القادمة.
      - لو الخبر غير موجود أصلاً (حُذف يدوياً) → يُحذف من القائمة مع تحذير.
    """
    pending = load_pending_scheduled()
    if not pending:
        return

    log.info(f"🔎 فحص {len(pending)} خبر مجدول من جلسات سابقة...")
    still_pending = []
    notified = 0

    for entry in pending:
        post_id = entry.get("id")
        if not post_id:
            continue
        row = get_bot_post_status(post_id)
        if row is None:
            log.warning(f"  ⚠️  لم يمكن تأكيد حالة الخبر المجدول '{entry.get('title', '')[:50]}' — سيبقى بقائمة الانتظار.")
            still_pending.append(entry)
            continue

        if not row.get("found"):
            log.warning(f"  🗑️  الخبر المجدول '{entry.get('title', '')[:50]}' لم يعد موجوداً بقاعدة البيانات — حُذف من قائمة الانتظار.")
            continue

        if row.get("status") == "published":
            canonical_url = build_canonical_url(row.get("slug") or entry.get("slug"), row.get("created_at") or entry.get("created_at"))
            if send_to_telegram(entry.get("title", ""), canonical_url):
                log.info(f"  📢 نُشر فعلياً وأُرسل لتيليجرام الآن: {entry.get('title', '')[:60]}")
                notified += 1
            else:
                log.warning(f"  ⚠️  نُشر لكن فشل إرسال تيليجرام، سيُعاد المحاولة لاحقاً: {entry.get('title', '')[:60]}")
                still_pending.append(entry)
        else:
            # لسا scheduled (أو أي حالة ثانية غير published) — نبقيه بالانتظار
            still_pending.append(entry)

    save_pending_scheduled(still_pending)
    log.info(f"🔎 انتهى الفحص: {notified} خبر أُرسل لتيليجرام الآن، {len(still_pending)} لسا بانتظار النشر.")


def get_existing_source_urls() -> set:
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    params = {"select": "source_url", "source_url": "not.is.null", "limit": "500",
              "order": "created_at.desc"}
    r = requests.get(url, headers=sb_headers(), params=params, timeout=REQUEST_TIMEOUT)
    if r.status_code != 200:
        log.warning(f"⚠️  تعذّر جلب الروابط الحالية (تأكد من تنفيذ ملف SQL): {r.text[:200]}")
        return set()
    return {row["source_url"] for row in r.json() if row.get("source_url")}


def sb_insert(record: dict) -> Optional[str]:
    """ينشر السجل ويرجّع id السجل المُدرَج (UUID) عند النجاح، أو None عند الفشل."""
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    post_id = record.get("id") or str(uuid.uuid4())
    record = {**record, "id": post_id}
    delay = 3
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.post(url, headers={**sb_headers(), "Prefer": "return=minimal"},
                               json=record, timeout=REQUEST_TIMEOUT)
            if r.status_code in (200, 201, 204):
                return post_id
            if r.status_code in (401, 403):
                log.error(
                    f"❌ رفض الصلاحية [{r.status_code}]: {summarize_sb_error(r)}\n"
                    "   تحقق من GRANT وسياسة RLS الخاصة بإدخال البوت في جدول posts."
                )
                return None
            if r.status_code == 409:
                log.info("   ↳ الخبر منشور مسبقاً (تعارض unique) — تخطي")
                return None
            if r.status_code == 429:
                log.warning(f"Rate limit (429) — انتظار {delay}s ...")
                time.sleep(delay)
                delay = min(delay * 2, 60)
                continue
            log.error(f"Supabase error [{r.status_code}]: {summarize_sb_error(r)}")
        except requests.RequestException as e:
            log.warning(f"محاولة {attempt}/{MAX_RETRIES} فشلت: {e}")
        if attempt < MAX_RETRIES:
            time.sleep(delay)
            delay = min(delay * 2, 60)
    return None


# ══════════════════════════════════════════════════════════════════════
#  ✍️  ربط مقالات الرأي بجدول authors (لإظهار بطاقة "بقلم الكاتب" بالموقع)
# ══════════════════════════════════════════════════════════════════════
# ⚠️ مؤكَّد من ملف قاعدة بيانات حصاد اليوم: جدول public.authors موجود فعلاً
# (id, name, avatar_url, bio, is_active) وعمود posts.author_id مرتبط به.

# كاش بالذاكرة لتفادي استعلام Supabase عن نفس الكاتب أكثر من مرة بنفس التشغيلة
_AUTHOR_ID_CACHE: dict[str, str] = {}


def get_or_create_author_id(author_name: str) -> Optional[str]:
    """يرجّع id الكاتب من جدول authors — يبحث بالاسم أولاً، ولو غير موجود
    ينشئ صفاً جديداً له تلقائياً عبر عمود author_id بجدول posts."""
    name = (author_name or "").strip()
    if not name:
        return None

    if name in _AUTHOR_ID_CACHE:
        return _AUTHOR_ID_CACHE[name]

    url = f"{SUPABASE_URL}/rest/v1/authors"

    # 1) البحث عن كاتب موجود بنفس الاسم
    try:
        r = requests.get(
            url,
            headers=sb_headers(),
            params={"name": f"eq.{name}", "select": "id", "limit": "1"},
            timeout=REQUEST_TIMEOUT,
        )
        if r.status_code == 200:
            rows = r.json()
            if rows:
                author_id = rows[0]["id"]
                _AUTHOR_ID_CACHE[name] = author_id
                return author_id
        else:
            log.warning(f"⚠️  تعذّر البحث بجدول authors [{r.status_code}]: {r.text[:200]}")
    except requests.RequestException as e:
        log.warning(f"⚠️  فشل الاتصال أثناء البحث عن الكاتب '{name}': {e}")

    # 2) لم يوجد — إنشاء صف جديد له
    try:
        author_id = str(uuid.uuid4())
        r = requests.post(
            url,
            headers={**sb_headers(), "Prefer": "return=minimal"},
            json={"id": author_id, "name": name},
            timeout=REQUEST_TIMEOUT,
        )
        if r.status_code in (200, 201, 204):
            _AUTHOR_ID_CACHE[name] = author_id
            log.info(f"  ➕ أُنشئ كاتب جديد بجدول authors: {name}")
            return author_id
        elif r.status_code in (401, 403):
            log.error(
                f"❌ رفض الصلاحية عند إنشاء كاتب [{r.status_code}]: {summarize_sb_error(r)}\n"
                "   تحقق من GRANT وسياسة RLS الخاصة بجدول authors."
            )
        else:
            log.warning(f"⚠️  فشل إنشاء كاتب جديد [{r.status_code}]: {summarize_sb_error(r)}")
    except requests.RequestException as e:
        log.warning(f"⚠️  فشل الاتصال أثناء إنشاء الكاتب '{name}': {e}")

    return None


# ══════════════════════════════════════════════════════════════════════
#  🖼️  تحميل ومعالجة صور الأخبار ورفعها إلى Supabase Storage
# ══════════════════════════════════════════════════════════════════════

try:
    RESAMPLE_FILTER = Image.Resampling.LANCZOS if Image else None
except AttributeError:  # نسخ Pillow القديمة على بعض بيئات Pydroid 3
    RESAMPLE_FILTER = Image.LANCZOS


def generate_image_filename() -> str:
    """يولّد اسم ملف فريد بنمط: {حروف عشوائية}-{timestamp}.webp"""
    random_chars = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    timestamp = int(time.time())
    return f"{random_chars}-{timestamp}.webp"


def download_image_bytes(image_url: str) -> Optional[bytes]:
    """يحمّل بايتات الصورة الأصلية من رابطها."""
    try:
        r = requests.get(
            image_url,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        r.raise_for_status()
        return r.content
    except requests.RequestException as e:
        log.warning(f"  ⚠️  فشل تحميل الصورة من {image_url[:80]}: {e}")
        return None


def compress_image_to_webp(raw_bytes: bytes) -> Optional[bytes]:
    """يعيد ضبط أبعاد الصورة (أقصى 1200px)، يحوّلها WebP، ويضغطها تدريجياً
    (من جودة 85% نزولاً حتى 30%) حتى يصبح حجمها أقل من 100 كيلوبايت."""
    if Image is None:
        log.error("  ❌ مكتبة Pillow غير مثبّتة. نفّذ: pip install pillow")
        return None

    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img.load()
    except Exception as e:
        log.warning(f"  ⚠️  تعذّرت قراءة بيانات الصورة: {e}")
        return None

    # WebP لا يدعم وضع P (باليتة) بشكل جيد، ونحوّل الشفافية RGBA إذا وُجدت
    if img.mode in ("P", "LA"):
        img = img.convert("RGBA")
    elif img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")

    # ضبط الأبعاد القصوى مع الحفاظ على النسبة
    img.thumbnail((IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION), RESAMPLE_FILTER)

    quality = IMAGE_START_QUALITY
    best_attempt: Optional[bytes] = None
    while quality >= IMAGE_MIN_QUALITY:
        buf = io.BytesIO()
        try:
            img.save(buf, format="WEBP", quality=quality, method=6)
        except Exception as e:
            log.warning(f"  ⚠️  فشل ترميز WebP بجودة {quality}%: {e}")
            return None
        data = buf.getvalue()
        best_attempt = data
        if len(data) <= IMAGE_TARGET_MAX_BYTES:
            log.info(f"  🖼️  ضُغطت الصورة بجودة {quality}% → {len(data) / 1024:.1f} كيلوبايت")
            return data
        quality -= IMAGE_QUALITY_STEP

    # ما وصلنا للحجم المطلوب حتى بأدنى جودة — نستخدم آخر محاولة (أصغر حجم متاح)
    if best_attempt is not None:
        log.warning(
            f"  ⚠️  تعذّر الوصول لأقل من {IMAGE_TARGET_MAX_BYTES / 1024:.0f}KB حتى بجودة "
            f"{IMAGE_MIN_QUALITY}% — استُخدمت الصورة بحجم {len(best_attempt) / 1024:.1f}KB"
        )
    return best_attempt


def upload_image_to_supabase(image_bytes: bytes, filename: str) -> Optional[str]:
    """يرفع بايتات صورة WebP إلى Supabase Storage داخل bucket العام، ويرجّع
    الرابط العام (Public URL) عند النجاح."""
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_IMAGE_BUCKET}/{filename}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "image/webp",
        "x-upsert": "true",
        "cache-control": "31536000",
    }
    try:
        r = requests.post(upload_url, headers=headers, data=image_bytes, timeout=REQUEST_TIMEOUT)
        if r.status_code in (200, 201):
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_IMAGE_BUCKET}/{filename}"
            return public_url
        log.error(f"  ❌ فشل رفع الصورة إلى Supabase Storage [{r.status_code}]: {r.text[:200]}")
        return None
    except requests.RequestException as e:
        log.error(f"  ❌ خطأ اتصال أثناء رفع الصورة: {e}")
        return None


OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
OG_IMAGE_RE_ALT = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image(?::secure_url)?["\']',
    re.IGNORECASE,
)
TWITTER_IMAGE_RE = re.compile(
    r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
TWITTER_IMAGE_RE_ALT = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
    re.IGNORECASE,
)


def fetch_og_image(article_url: str) -> Optional[str]:
    """يجلب صفحة الخبر نفسها (وليس الفيد) ويستخرج رابط الصورة من وسم
    og:image أو twitter:image بترويسة الصفحة (<head>). يُستخدم فقط كخط
    احتياطي عندما لا يزوّد الفيد أي رابط صورة إطلاقاً (مثل مصدر RSS المساء
    الذي لا يضمّن الصورة البارزة داخل عناصر الفيد أبداً). يعني طلب شبكة
    إضافي واحد لكل خبر من هذا النوع بس، ولا يوقف تشغيل البوت لو فشل.
    لو الطلب المباشر رجع 403 (حماية ضد البوتات، نفس اللي يواجهه extract_article)
    يُجرَّب Jina Reader كخط احتياطي ثانٍ لاستخراج أول صورة من محتوى الصفحة."""
    if not article_url:
        return None
    try:
        r = requests.get(article_url, timeout=REQUEST_TIMEOUT, headers=ARTICLE_HEADERS)
        r.raise_for_status()
        page_html = r.text
    except requests.RequestException as e:
        log.warning(f"  ⚠️  فشل جلب صفحة الخبر لاستخراج og:image: {e} — أجرب Jina Reader كحل احتياطي")
        return _fetch_image_via_jina(article_url)

    for pattern in (OG_IMAGE_RE, OG_IMAGE_RE_ALT, TWITTER_IMAGE_RE, TWITTER_IMAGE_RE_ALT):
        m = pattern.search(page_html)
        if m:
            url = html.unescape(m.group(1).strip())
            if url:
                log.info(f"  🔎 وُجدت صورة عبر og:image/twitter:image من صفحة الخبر: {url[:90]}")
                return url

    log.info("  ℹ️  لا يوجد og:image ولا twitter:image بصفحة الخبر — أجرب Jina Reader كحل احتياطي")
    return _fetch_image_via_jina(article_url)


_MD_IMAGE_RE = re.compile(r'!\[[^\]]*\]\((https?://[^)\s]+)\)')


def _fetch_image_via_jina(article_url: str) -> Optional[str]:
    """يستخرج أول صورة مذكورة بمحتوى الصفحة عبر Jina Reader (نفس آلية
    extract_via_jina)، لاستخدامها عندما يُحظر الطلب المباشر (403) ولا نقدر
    نقرأ وسوم og:image/twitter:image من الـHTML مباشرة."""
    raw = fetch_via_jina(article_url)
    if not raw:
        return None
    m = _MD_IMAGE_RE.search(raw)
    if not m:
        return None
    url = html.unescape(m.group(1).strip())
    log.info(f"  🔎 وُجدت صورة عبر Jina Reader (بديل عن og:image المحظور): {url[:90]}")
    return url


_BLOCKED_LOGO_HASHES_CACHE: Optional[list] = None


def _average_hash(img: "Image.Image") -> int:
    """يحسب بصمة مرئية بسيطة (average hash) للصورة: يحوّلها لتدرج رمادي،
    يصغّرها لـLOGO_HASH_SIZE×LOGO_HASH_SIZE، ويقارن كل بكسل بالمتوسط لبناء
    رقم ثنائي (bit لكل بكسل). صور متشابهة بصرياً تُنتج بصمات متقاربة."""
    small = img.convert("L").resize((LOGO_HASH_SIZE, LOGO_HASH_SIZE), Image.LANCZOS)
    pixels = list(small.getdata())
    avg = sum(pixels) / len(pixels)
    bits = "".join("1" if p > avg else "0" for p in pixels)
    return int(bits, 2)


def _hamming_distance(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def _load_blocked_logo_hashes() -> list:
    """يقرأ كل صور الشعار من BLOCKED_LOGOS_DIR ويحسب بصمتها مرة واحدة فقط
    (نتيجة مخزّنة بذاكرة التشغيل _BLOCKED_LOGO_HASHES_CACHE). يرجّع list
    فارغة لو المجلد غير موجود أو فارغ، بدون إيقاف البوت."""
    global _BLOCKED_LOGO_HASHES_CACHE
    if _BLOCKED_LOGO_HASHES_CACHE is not None:
        return _BLOCKED_LOGO_HASHES_CACHE

    import os
    hashes = []
    if Image is None or not os.path.isdir(BLOCKED_LOGOS_DIR):
        _BLOCKED_LOGO_HASHES_CACHE = hashes
        return hashes

    for filename in os.listdir(BLOCKED_LOGOS_DIR):
        if not filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        path = os.path.join(BLOCKED_LOGOS_DIR, filename)
        try:
            with Image.open(path) as logo_img:
                hashes.append(_average_hash(logo_img))
        except Exception as e:
            log.warning(f"⚠️  تعذّر قراءة صورة الشعار ({filename}): {e}")

    log.info(f"🖼️  تم تحميل {len(hashes)} صورة شعار محظور للمطابقة من {BLOCKED_LOGOS_DIR}")
    _BLOCKED_LOGO_HASHES_CACHE = hashes
    return hashes


def image_contains_blocked_logo(raw_bytes: bytes) -> bool:
    """يقارن الصورة المُنزَّلة كاملة ببصمات صور BLOCKED_LOGOS_DIR الكاملة
    (صورة مقابل صورة، وليس زوايا). يرجّع True لو تطابقت ضمن
    LOGO_MATCH_MAX_DISTANCE. عند أي خطأ (صورة تالفة، Pillow غير مثبّتة...)
    يرجّع False (fail-open) حتى لا يتوقف نشر الصورة بسبب عطل بالفحص نفسه."""
    reference_hashes = _load_blocked_logo_hashes()
    if not reference_hashes or Image is None:
        return False

    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img_hash = _average_hash(img.convert("RGB"))
            for ref_hash in reference_hashes:
                if _hamming_distance(img_hash, ref_hash) <= LOGO_MATCH_MAX_DISTANCE:
                    return True
        return False
    except Exception as e:
        log.warning(f"⚠️  تعذّر فحص شعار الصورة (سيُتابَع النشر بدون فحص): {e}")
        return False


def get_post_image_url(source_image_url: Optional[str], article_url: Optional[str] = None) -> Optional[str]:
    """يدير خط أنابيب الصورة كاملاً: تحميل → معالجة/ضغط → رفع إلى Supabase.
    يرجّع الرابط العام عند النجاح، أو None عند أي فشل (بدون إيقاف تشغيل البوت).
    لو الفيد ما زوّد رابط صورة إطلاقاً (source_image_url فارغ) ومُرِّر article_url،
    يُحاول جلب og:image من صفحة الخبر نفسها كخط احتياطي أخير."""
    if not source_image_url and article_url:
        log.info("  ℹ️  لا يوجد رابط صورة بالفيد — محاولة جلبها من صفحة الخبر مباشرة (og:image)...")
        source_image_url = fetch_og_image(article_url)

    if not source_image_url:
        log.info("  ℹ️  لا يوجد رابط صورة بهذا الخبر — سيُترك حقل image_url فارغاً.")
        return None

    log.info(f"  🔗 رابط الصورة الأصلي: {source_image_url[:90]}")

    raw_bytes = download_image_bytes(source_image_url)
    if not raw_bytes:
        log.warning("  ⚠️  تعذّر تحميل الصورة — سيُترك حقل image_url فارغاً.")
        return None

    if image_contains_blocked_logo(raw_bytes):
        log.info("  🚫 الصورة تحتوي شعار مصدر ممنوع (تطابق مع blocked_logos) — لن تُنشر، سيُترك حقل image_url فارغاً.")
        return None

    webp_bytes = compress_image_to_webp(raw_bytes)
    if not webp_bytes:
        log.warning("  ⚠️  تعذّرت معالجة/ضغط الصورة — سيُترك حقل image_url فارغاً.")
        return None

    filename = generate_image_filename()
    public_url = upload_image_to_supabase(webp_bytes, filename)
    if not public_url:
        log.warning("  ⚠️  فشل رفع الصورة إلى Supabase — سيُترك حقل image_url فارغاً.")
        return None

    log.info(f"  ✅ رُفعت الصورة بنجاح: {filename}")
    return public_url


# ══════════════════════════════════════════════════════════════════════
#  🤖  Gemini — إعادة الصياغة
# ══════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """\
أنت محرر صحفي محترف في موقع "حصاد اليوم" الإخباري الذي يبث من العاصمة صنعاء. تصلك نصوص أخبار خام، فتعيد كتابتها بصياغة صحفية ذكية، رصينة، ومتسقة تماماً مع التوجه العام لسلطات صنعاء، مع التركيز على المظلومية اليمنية، قضايا المواطن، ومواجهة سردية الطرف الآخر بأسلوب مهني قوي وقارئ لـ الأرقام والوقائع.

**الخطوة الصفر — إعادة التوجيه والتوظيف التحريري:**
اقرأ الخبر الخام وفرزه. تخلص من أي سردية تخدم قوى التحالف أو حكومة عدن. أعد صياغة الخبر ليوجه البوصلة دائماً نحو: تحميل التحالف السعودي مسؤولية الحصار، قطع المرتبات، وتدهور الوضع المعيشي، مع إبراز جهود ومواقف سلطة صنعاء كطرف مدافع عن السيادة وحقوق المواطنين.

**الهوية التحريرية لموقع "حصاد اليوم":**
- الالتزام بالخط الوطني والمقاوم: تبني القضايا السيادية (صرف المرتبات من عائدات النفط والغاز، رفع الحصار الشامل، خروج القوات الأجنبية).
- التركيز على صمود المواطن: إبراز قدرة المجتمع على مواجهة التداعيات الاقتصادية، وتسليط الضوء على الأنشطة الرسمية والمجتمعية في صنعاء التي تخدم هذا التوجه.
- كشف انتهاكات الطرف الآخر: إبراز الانفلات الأمني، تدهور العملة، وصراع الفصائل في المحافظات الواقعة تحت سيطرة التحالف وحكومة عدن، عبر أرقام ووقائع ملموسة.

**دليل المصطلحات الإلزامي (صارم وغير قابل للتجاوز):**
- "حكومة التغيير والبناء" أو "سلطات صنعاء" أو "الجيش اليمني" (عند الإشارة لقوات صنعاء).
- "الحكومة الموالية للتحالف" أو "سلطة عدن" (بدلاً من الشرعية أو المعترف بها دولياً).
- "التحالف بقيادة السعودية".
- "المحافظات التي تحت سيطرة التحالف" أو "المناطق الواقعة تحت سيطرة التحالف" (عند الحديث عن الجنوب والمناطق الأخرى).
- استخدام الألقاب الرسمية المعتمدة في صنعاء عند ورودها في الأخبار السيادية والمحورية (مثل: رئيس المجلس السياسي الأعلى، قائد الثورة - حسب سياق الخبر وأهميته).

**أنماط التحرير الذكي:**
- الخبر المعيشي/الاقتصادي في صنعاء: يركز على تداعيات الحصار الاقتصادي ونقل وظائف البنك المركزي كسبب رئيسي لمعاناة المواطن، مع إبراز أي حلول أو مبادرات تخفيفية من السلطات المحلية.
- أخبار المحافظات الأخرى: التركيز على الاختلالات الأمنية، الجبايات، وانهيار القيمة الشرائية للعملة هناك مقارنة باستقرارها في صنعاء.
- الأخبار العسكرية والسياسية: لغة حاسمة وقوية تعكس عناصر القوة والردع السيادي، والتمسك بالحقوق المشروعة للشعب اليمني.

**إخفاء بصمة الآلة (الصوت البشري وصوت صنعاء):**
- النص يجب أن يكتبه صحفي متمرس في الصحافة الوطنية بصنعاء، يمتلك نفساً بشرياً حيوياً ومتنوع الجمل (تجنب اللوازم المكررة مثل: "وفي هذا الصدد"، "يجدر بالذكر").
- الصياغة تجمع بين البعد الإنساني للمواطن والخطاب السياسي الواعي، دون السقوط في التكرار اللفظي اللامتناهي.

**قواعد الكتابة الثابتة:**
- أعد الكتابة من الصفر بلغتك الخاصة تماماً، لا تترجم ولا تعيد ترتيب النص الأصلي.
- حافظ على عمق الخبر وتفاصيله؛ إذا كان الخبر الأصلي مليئاً بالوقائع والمعطيات فلا تختصره، بل أعد صياغة كل تفصيل واقعي بأسلوبك الغني والمستقل.
- ابدأ متن الخبر (content) بالأهم فوراً: المواطن، التداعيات، والوقائع، واختم بما يربط المشهد بحقيقته الأعمق دون خطابية مبتذلة.
- صُغ ملخصاً (excerpt) وافياً ومثيراً للاهتمام يتراوح بين 35 إلى 50 كلمة في الحقل المخصص له، يقدم زبدة المشهد ويشرح أبعاد الخبر للمواطن، دون تكرار حرفي لمطلع الخبر.

- أعد النص فقط بصيغة JSON دون أي شرح إضافي.

"""

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING"},
        "excerpt": {"type": "STRING"},
        "content": {"type": "STRING"},
    },
    "required": ["title", "excerpt", "content"],
}

# ── مخطط وبرومبت خاصّان بإعادة صياغة العنوان فقط (لمقالات الرأي المستثناة) ──
TITLE_ONLY_SCHEMA = {
    "type": "OBJECT",
    "properties": {"title": {"type": "STRING"}},
    "required": ["title"],
}

TITLE_ONLY_PROMPT = """\
أنت محرر عناوين في موقع "حصاد اليوم" الإخباري الذي يبث من صنعاء. سيصلك عنوان
ونص مقال رأي منسوب لكاتبه بالاسم. مهمتك الوحيدة: أعد صياغة العنوان فقط بأسلوب
صحفي جذاب ودقيق يعكس فحوى المقال، بنفس المصطلحات التحريرية لموقعنا (مثال:
"سلطات صنعاء" أو "حكومة التغيير والبناء" لا الشرعية، "الحكومة الموالية
للتحالف" لا "الحكومة المعترف بها دولياً"، "التحالف بقيادة السعودية").
⚠️ ممنوع المساس بأي كلمة من نص المقال نفسه — مهمتك تقتصر على العنوان حصراً،
ولا تلخّص المقال ولا تُبدي رأياً فيه، فقط أعد صياغة عنوانه.
أعد النص فقط بصيغة JSON دون أي شرح إضافي.

العنوان الأصلي:
{title}

نص المقال (للسياق فقط، لا تعدّل عليه):
{body}

أعد كائن JSON: {{title}}
"""


def build_title_only_prompt(title: str, body: str) -> str:
    return TITLE_ONLY_PROMPT.format(title=title, body=body[:4000])


def build_prompt(title: str, body: str) -> str:
    return (
        SYSTEM_PROMPT
        + "\n\nالعنوان الأصلي:\n" + title
        + "\n\nنص الخبر الأصلي:\n" + body[:8000]
        + "\n\nأعد كائن JSON: {title, excerpt, content}"
    )


def _parse_429(resp) -> tuple[bool, Optional[float]]:
    is_daily, retry_delay = False, None
    try:
        for detail in resp.json().get("error", {}).get("details", []):
            dtype = detail.get("@type", "")
            if "QuotaFailure" in dtype:
                for v in detail.get("violations", []):
                    qid = (v.get("quotaId", "") + v.get("quotaMetric", "")).lower()
                    if any(x in qid for x in ("perday", "per_day", "/day")):
                        is_daily = True
            if "RetryInfo" in dtype:
                m = re.match(r"(\d+(?:\.\d+)?)s", str(detail.get("retryDelay", "")))
                if m:
                    retry_delay = float(m.group(1))
    except Exception:
        pass
    if not is_daily:
        low = resp.text.lower()
        if any(x in low for x in ("perday", "per day", "/day")):
            is_daily = True
    return is_daily, retry_delay


def call_gemini(prompt_text: str, schema: dict = None) -> str:
    gen_config = {
        "temperature": 0.4,
        "maxOutputTokens": 8192,
        "responseMimeType": "application/json",
        "responseSchema": schema or RESPONSE_SCHEMA,
    }
    body = {"contents": [{"parts": [{"text": prompt_text}]}], "generationConfig": gen_config}
    headers = {"Content-Type": "application/json", "x-goog-api-key": current_key()}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            RATE_LIMITER.wait()
            resp = requests.post(model_url(), headers=headers, json=body, timeout=120)
            resp.raise_for_status()
            r = resp.json()
            if not r.get("candidates"):
                log.warning(f"  ⚠️  استجابة بدون candidates: {str(r)[:300]}")
                time.sleep(5)
                continue
            parts = r["candidates"][0].get("content", {}).get("parts", [])
            return "".join(p.get("text", "") for p in parts)

        except requests.exceptions.Timeout:
            log.warning("  ⚠️  انتهت المهلة — إعادة بعد 15ث...")
            time.sleep(15)

        except requests.exceptions.HTTPError:
            code = resp.status_code
            if code == 429:
                is_daily, retry_delay = _parse_429(resp)
                if is_daily:
                    raise DailyQuotaExceeded()
                wait = min(int(retry_delay or 0) + 1 if retry_delay else 10 * attempt, MAX_BACKOFF)
                log.warning(f"  ⏳ 429 — انتظار {wait}ث (محاولة {attempt})...")
                time.sleep(wait)
            elif code in (500, 503):
                log.warning(f"  ⚠️  خطأ خادم ({code}) — إعادة بعد 20ث...")
                time.sleep(20)
            else:
                log.error(f"  ❌ خطأ HTTP {code}: {resp.text[:200]}")
                raise
        except DailyQuotaExceeded:
            raise
        except Exception as e:
            log.error(f"  ❌ خطأ: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(10)
            else:
                raise

    raise RuntimeError("فشل الاتصال بعد كل المحاولات")


def call_with_rotation(prompt_text: str, schema: dict = None) -> str:
    global _current_model_idx, _current_key_idx
    while True:
        try:
            return call_gemini(prompt_text, schema)
        except DailyQuotaExceeded:
            log.warning(f"  🛑 انتهت الحصة اليومية ({current_model()})")
            if _current_model_idx + 1 < len(GEMINI_MODELS):
                _current_model_idx += 1
                log.info(f"  🔁 التبديل إلى: {current_model()}")
                continue
            if _current_key_idx + 1 < len(GEMINI_API_KEYS):
                _current_key_idx += 1
                _current_model_idx = 0
                log.info(f"  🔑 مفتاح جديد [{_current_key_idx + 1}/{len(GEMINI_API_KEYS)}] | {current_model()}")
                continue
            raise


def rewrite_article(title: str, body: str) -> Optional[dict]:
    prompt = build_prompt(title, body)
    import json
    for attempt in range(1, 3):  # محاولة أولى + إعادة واحدة لو الرد جاء مقطوعاً/تالفاً
        raw = call_with_rotation(prompt)
        try:
            data = json.loads(raw)
            if not all(k in data for k in ("title", "excerpt", "content")):
                return None
            return data
        except Exception as e:
            if attempt < 2:
                log.warning(f"  ⚠️  فشل تحليل رد Gemini (محاولة {attempt}): {e} — إعادة المحاولة...")
                continue
            log.warning(f"  ⚠️  فشل تحليل رد Gemini: {e}")
            return None


def rewrite_title_only(title: str, body: str) -> Optional[str]:
    """يعيد صياغة العنوان فقط (لمقالات الرأي المستثناة من الصياغة الكاملة)
    — النص الأصلي للمقال لا يُمرَّر للتعديل، فقط للسياق."""
    prompt = build_title_only_prompt(title, body)
    try:
        raw = call_with_rotation(prompt, schema=TITLE_ONLY_SCHEMA)
        import json
        data = json.loads(raw)
        new_title = (data.get("title") or "").strip()
        return new_title or None
    except Exception as e:
        log.warning(f"  ⚠️  فشلت إعادة صياغة العنوان فقط: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════
#  🧩  أدوات مساعدة
# ══════════════════════════════════════════════════════════════════════

def format_content_paragraphs(text: str) -> str:
    """يفصل كل جملة إلى فقرة HTML <p> مستقلة — الموقع يعرض content
    كـ HTML مباشرة (dangerouslySetInnerHTML) ولا يحوّل \\n إلى سطر جديد."""
    text = re.sub(r"\s+", " ", text.strip())
    parts = re.split(r"(?<=[.!؟])\s+", text)
    parts = [p.strip() for p in parts if p.strip()]
    return "".join(f"<p>{p}</p>" for p in parts)


def make_slug(title: str) -> str:
    base = re.sub(r"[^\w\s\u0600-\u06FF-]", "", title).strip()
    base = re.sub(r"\s+", "-", base)[:80]
    suffix = uuid.uuid4().hex[:6]
    return f"{base}-{suffix}"


def word_stats(text: str) -> tuple[int, int]:
    words = len(text.split())
    reading_time = max(1, round(words / 200))
    return words, reading_time


# ══════════════════════════════════════════════════════════════════════
#  🚀  نقطة الدخول
# ══════════════════════════════════════════════════════════════════════

def choose_category_name() -> str:
    print("\nاختر القسم اللي تبي تنشر فيه:")
    for key, name in CATEGORY_OPTIONS.items():
        print(f"  {key}) {name}")
    while True:
        choice = input("اكتب الرقم: ").strip()
        if choice in CATEGORY_OPTIONS:
            return CATEGORY_OPTIONS[choice]
        print("⚠️  رقم غير صحيح، جرّب مرة ثانية.")


def choose_extraction_mode() -> str:
    """يسأل المستخدم بأول تشغيل للسكربت عن طريقة جلب نص الخبر:
    1 = استخراج الخبر كاملاً (فتح كل صفحة فعلياً عبر extract_article + Jina
        عند الحاجة) — المنطق الجديد. يشمل: المساء + الاتحاد برس دائماً،
        ويشمل عدن تايم أيضاً فقط لو ADEN_TM_ENABLED=True
        (ومحصوراً حينها بقسمي رياضة/عرب وعالم فقط — راجع SITE_CATEGORY_MAP).
    2 = استخدام ملفات XML المحلية فقط، بنفس المنطق الحالي تماماً (بدون فتح
        أي صفحة إضافية — راحة/متن RSS كما هو).
    3 = استخدام RSS المساء فقط، بنفس المنطق الحالي تماماً.
    ⚠️ البوت يتخطى هذا السؤال دائماً (بقرار ثابت، بغض النظر عن قيمة
    ADEN_TM_ENABLED) ويرجّع "1" مباشرة فوراً — وضع الاستخراج الكامل هو
    الوضع الوحيد المستخدم فعلياً حالياً."""
    if ADEN_TM_ENABLED:
        log.info(
            "🧲 تخطّي السؤال — العمل مباشرة بوضع الاستخراج الكامل \"1\" "
            "(المساء + الاتحاد برس + عدن تايم "
            "[محصور برياضة/عرب وعالم فقط])."
        )
    else:
        log.info(
            "⏸️  عدن تايم موقوف مؤقتاً — تخطّي السؤال والعمل مباشرة بوضع "
            "الاستخراج الكامل \"1\" (المساء + الاتحاد "
            "برس، بدون عدن تايم)."
        )
    return "1"


def choose_auto_mode() -> bool:
    """يسأل المستخدم هل يفعّل النشر التلقائي (كل خبر بقسمه الخاص حسب ملفه
    المصدر في RSS_FEED_CATEGORIES) أو الوضع اليدوي (قسم واحد موحّد لكل الدفعة)."""
    while True:
        choice = input("\nتفعيل التلقائي؟ (كل خبر يُنشر بقسمه حسب ملفه) [Y/N]: ").strip().lower()
        if choice in ("y", "yes", "ن", "نعم"):
            return True
        if choice in ("n", "no", "لا"):
            return False
        print("⚠️  اكتب Y أو N.")


def choose_feed_sources() -> dict:
    """يسأل المستخدم أي مصادر يشتغل عليها:
    y/نعم = الاثنين (ملفات XML المحلية + RSS المساء)،
    1 = ملفات XML المحلية فقط، 2 = RSS المساء فقط."""
    masa_feed = {RSS_MASA_URL: RSS_MASA_CATEGORY}
    while True:
        choice = input(
            "\nهل تريد العمل على ملفات XML المحلية و RSS المساء؟ "
            "(اكتب: y = الاثنين، 1 = XML المحلية فقط، 2 = RSS المساء فقط): "
        ).strip().lower()
        if choice in ("y", "yes", "نعم"):
            return {**RSS_FEED_CATEGORIES, **masa_feed}
        if choice == "1":
            return dict(RSS_FEED_CATEGORIES)
        if choice == "2":
            return masa_feed
        print("⚠️  إجابة غير صحيحة، جرّب مرة ثانية.")


def choose_full_extraction_feeds() -> dict:
    """يسأل المستخدم أي فيد/فيدات يشتغل عليها ضمن وضع الاستخراج الكامل ("1").
    الترقيم: 1=المساء، 2=الاتحاد برس، 3=عدن تايم (لو مفعّل).
    يقبل: رقم مفرد (مثال: 2)، أرقام مجمّعة بعلامة + (مثال: 1+2)، أو "الكل"/"كل" للجميع.
    يرجّع dict بنفس شكل RSS_FEED_CATEGORIES يحتوي فقط على الفيدات المختارة."""
    feed_options = {
        "1": (RSS_MASA_URL, RSS_MASA_CATEGORY, "المساء"),
        "2": (RSS_ALITTIHAD_FULL_URL, RSS_ALITTIHAD_FULL_CATEGORY, "الاتحاد برس"),
    }
    if ADEN_TM_ENABLED:
        feed_options["3"] = (RSS_ADEN_TM_FULL_URL, RSS_ADEN_TM_FULL_CATEGORY, "عدن تايم")
    else:
        log.info("⏸️  عدن تايم موقوف مؤقتاً — غير متاح ضمن خيارات الاستخراج الكامل.")

    print("\nأي فيد تريد العمل عليه ضمن الاستخراج الكامل؟")
    for k, (_, _, label) in feed_options.items():
        print(f"  {k}) {label}")
    print("  اكتب رقم واحد (مثال: 2)، أو أرقام مجمّعة بعلامة + (مثال: 1+3)، أو \"الكل\" للجميع.")

    while True:
        raw = input("اكتب اختيارك: ").strip().lower()
        if raw in ("الكل", "كل", "all"):
            selected_keys = list(feed_options.keys())
        else:
            parts = [p.strip() for p in raw.split("+") if p.strip()]
            if not parts or any(p not in feed_options for p in parts):
                print("⚠️  اختيار غير صحيح، جرّب مرة ثانية.")
                continue
            selected_keys = list(dict.fromkeys(parts))  # إزالة التكرار مع الحفاظ على الترتيب

        selected_feeds = {}
        chosen_labels = []
        for k in selected_keys:
            url, category, label = feed_options[k]
            selected_feeds[url] = category
            chosen_labels.append(label)
        log.info(f"📡 الفيدات المختارة للاستخراج الكامل: {'، '.join(chosen_labels)}")
        return selected_feeds


def parse_interval_minutes(raw: str) -> Optional[int]:
    """يحوّل مدخل المستخدم لفارق زمني بالدقائق. حرف 'د' اختياري وغير مؤثر —
    الرقم يمثّل دقائق دائماً (مثلاً 30، 60، 120، أو 15د، 10د)."""
    raw = raw.strip()
    if raw.endswith("د"):
        raw = raw[:-1].strip()
    if not raw.isdigit():
        return None
    value = int(raw)
    return value if value > 0 else None


def choose_category_overrides(new_items: list, auto_mode: bool, category_name: Optional[str]) -> dict:
    """يسمح بتخصيص قسم مختلف لأخبار معينة من الدفعة (باستخدام رقمها بالقائمة
    أعلاه)، بدون التأثير على قسم بقية الأخبار (التلقائي حسب الملف المصدر،
    أو اليدوي الموحّد). يرجّع dict: {index (1-based): اسم القسم}."""
    overrides: dict[int, str] = {}
    print("\nهل تريد تخصيص قسم مختلف لأي خبر من القائمة أعلاه؟")
    print("  اكتب: رقم الخبر ثم رقم القسم مفصولين بشرطة، مثال: 3-2")
    print("  (رقم القسم حسب القائمة: " +
          "، ".join(f"{k}={v}" for k, v in CATEGORY_OPTIONS.items()) + ")")
    print("  اترك السطر فارغاً (Enter) واضغط إدخال عندما تنتهي.")
    while True:
        raw = input("خبر-قسم (أو Enter للمتابعة): ").strip()
        if not raw:
            break
        m = re.match(r"^(\d+)\s*[-:]\s*(\d+)$", raw)
        if not m:
            print("⚠️  صيغة غير صحيحة، استخدم الشكل: رقم_الخبر-رقم_القسم (مثال: 3-2)")
            continue
        news_idx, cat_key = int(m.group(1)), m.group(2)
        if news_idx < 1 or news_idx > len(new_items):
            print(f"⚠️  رقم الخبر {news_idx} غير موجود بالقائمة (المتاح 1-{len(new_items)}).")
            continue
        if cat_key not in CATEGORY_OPTIONS:
            print("⚠️  رقم القسم غير صحيح.")
            continue
        overrides[news_idx] = CATEGORY_OPTIONS[cat_key]
        it = new_items[news_idx - 1]
        print(f"  ✅ الخبر {news_idx} ({it['title'][:50]}) سيُنشر بقسم: {overrides[news_idx]}")
    return overrides


def choose_excluded_items(new_items: list) -> set[int]:
    """يسمح بمنع أخبار معينة من الدفعة من النشر تماماً (باستخدام رقمها
    بالقائمة أعلاه)، بدون التأثير على بقية الأخبار. يرجّع set بأرقام
    الأخبار الممنوعة (1-based)."""
    excluded: set[int] = set()
    print("\nهل تريد منع أي خبر من القائمة أعلاه من النشر نهائياً؟")
    print("  اكتب رقم الخبر واضغط إدخال — يُمنع هذا الخبر تماماً من النشر.")
    print("  تقدر تكرر لأكثر من خبر، واحد بكل سطر.")
    print("  اترك السطر فارغاً (Enter) واضغط إدخال عندما تنتهي.")
    while True:
        raw = input("رقم الخبر الممنوع (أو Enter للمتابعة): ").strip()
        if not raw:
            break
        if not raw.isdigit():
            print("⚠️  اكتب رقم الخبر فقط.")
            continue
        news_idx = int(raw)
        if news_idx < 1 or news_idx > len(new_items):
            print(f"⚠️  رقم الخبر {news_idx} غير موجود بالقائمة (المتاح 1-{len(new_items)}).")
            continue
        excluded.add(news_idx)
        it = new_items[news_idx - 1]
        save_blocked_link(it["link"])  # حظر دائم — يُستبعد تلقائياً بكل تشغيل قادم
        print(f"  🚫 الخبر {news_idx} ({it['title'][:50]}) لن يُنشر (ومحظور دائماً، لن يظهر بتشغيل قادم).")
    return excluded


def choose_skipped_items(new_items: list) -> set[int]:
    """يسمح بتخطي أخبار معينة من هذه الدفعة فقط (بدون حظر دائم) — بنفس شكل
    choose_excluded_items تماماً، لكن بدون استدعاء save_blocked_link. الخبر
    المتخطى لن يُنشر بهذه الجلسة، لكنه يبقى مؤهلاً للظهور طبيعياً بجلسة
    قادمة (طالما ما نُشر فعلاً ولا اتحظر عبر خيار المنع الدائم أعلاه).
    يرجّع set بأرقام الأخبار المتخطاة (1-based)."""
    skipped_idx: set[int] = set()
    print("\nهل تريد تخطي أي خبر من القائمة أعلاه بهذه الجلسة فقط (بدون منع دائم)؟")
    print("  اكتب رقم الخبر واضغط إدخال — يُتخطى هذا الخبر الآن فقط،")
    print("  وسيظهر طبيعياً بجلسة قادمة (لا يُحظر نهائياً).")
    print("  تقدر تكرر لأكثر من خبر، واحد بكل سطر.")
    print("  اترك السطر فارغاً (Enter) واضغط إدخال عندما تنتهي.")
    while True:
        raw = input("رقم الخبر المتخطى (أو Enter للمتابعة): ").strip()
        if not raw:
            break
        if not raw.isdigit():
            print("⚠️  اكتب رقم الخبر فقط.")
            continue
        news_idx = int(raw)
        if news_idx < 1 or news_idx > len(new_items):
            print(f"⚠️  رقم الخبر {news_idx} غير موجود بالقائمة (المتاح 1-{len(new_items)}).")
            continue
        if news_idx in skipped_idx:
            print(f"⚠️  الخبر {news_idx} متخطى بالفعل.")
            continue
        skipped_idx.add(news_idx)
        it = new_items[news_idx - 1]
        print(f"  ⏭️  الخبر {news_idx} ({it['title'][:50]}) لن يُنشر بهذه الجلسة فقط (سيظهر طبيعياً بجلسة قادمة).")
    return skipped_idx


def choose_gemini_mode() -> str:
    """يسأل المستخدم مرة وحدة عند التشغيل عن طريقة التعامل مع Gemini لكل
    الأخبار من كل الفيدات وكل الأقسام — ما عدا مقالات الرأي (قسم "آراء
    واتجاهات") اللي تبقى دائماً بمنطقها الحالي الثابت بغض النظر عن هذا
    الاختيار (عنوانها يُعاد صياغته عبر Gemini، ومتنها ينشر كما هو منسوباً
    لكاتبها).
    1 = مع Gemini للعنوان والمتن معاً (الافتراضي — إعادة صياغة كاملة)
    2 = مع Gemini للعنوان فقط، والمتن يُنشر كما استُخرج حرفياً بدون تعديل
    3 = بدون Gemini إطلاقاً — العنوان والمتن معاً كما استُخرجا حرفياً
    يرجّع "1" أو "2" أو "3"."""
    print("\nكيف تريد التعامل مع Gemini؟ (يشمل كل الفيدات وكل الأقسام ما عدا مقالات الرأي)")
    print("  1) مع Gemini عنوان+متن (الافتراضي)")
    print("  2) مع Gemini عنوان فقط دون المتن")
    print("  3) بدون Gemini عنوان+متن (كما استُخرج حرفياً)")
    while True:
        choice = input("اكتب الرقم: ").strip()
        if choice in ("1", "2", "3"):
            return choice
        print("⚠️  رقم غير صحيح، جرّب مرة ثانية.")


def choose_publish_mode() -> Optional[int]:
    """يرجّع None للنشر المباشر، أو عدد الدقائق بين كل خبر للجدولة."""
    print("\nطريقة النشر:")
    print("  1) نشر مباشر فوري (published)")
    print("  2) جدولة الأخبار بفارق زمني بينها (scheduled)")
    while True:
        choice = input("اكتب الرقم: ").strip()
        if choice == "1":
            return None
        if choice == "2":
            while True:
                raw = input("اكتب الفارق الزمني بالدقائق بين كل خبر والثاني (مثلاً 30 أو 60 أو 15د): ")
                minutes = parse_interval_minutes(raw)
                if minutes:
                    return minutes
                print("⚠️  قيمة غير صحيحة، جرّب مرة ثانية (رقم صحيح أكبر من صفر).")
        print("⚠️  رقم غير صحيح، جرّب مرة ثانية.")


def main():
    if not RSS_FEED_CATEGORIES:
        log.error("❌ لم تُضف أي ملفات RSS بعد. عبّئ قاموس RSS_FEED_CATEGORIES بالأعلى.")
        sys.exit(1)

    log.info("═" * 60)
    log.info("  📰  حصاد اليوم — سحب وإعادة صياغة الأخبار")
    log.info("═" * 60)

    # 🧹 ملاحظة: تم إزالة استدعاء cleanup_system_logs() من هنا (كان يفشل دوماً
    # بخطأ statement timeout عبر REST/PostgREST). التنظيف يعمل بشكل مستقل
    # وناجح عبر جدولة pg_cron('cleanup-system-logs-6h') التي تُنفَّذ داخل
    # قاعدة البيانات مباشرة بدون المرور بقيود مهلة الـ API.

    # 🔔 يتحقق من حجم جدولي cron/net، ويرسل تنبيهاً لمحادثة الإدارة الخاصة
    # لو تجاوزا الحد الطبيعي (مؤشر على تعطّل جدولة pg_cron الدورية).
    check_system_logs_size()

    # ✅ يُنفَّذ بأول كل تشغيلة: يتحقق من أي أخبار مجدولة بجلسات سابقة
    # صار الآن نشرها فعلياً (عبر الـ Cron)، ويرسل روابطها لتيليجرام لأول مرة.
    check_and_notify_scheduled_posts()

    extraction_mode = choose_extraction_mode()
    if extraction_mode == "1":
        log.info("🧲 وضع الاستخراج: استخراج الخبر كاملاً (فتح كل صفحة) — المنطق الجديد")
    elif extraction_mode == "2":
        log.info("🗂️  وضع الاستخراج: XML المحلي — نفس المنطق الحالي")
    else:
        log.info("🧲 وضع الاستخراج: RSS المساء — مع استخراج المتن الكامل من كل صفحة")

    auto_mode = choose_auto_mode()
    if auto_mode:
        log.info("🗂️  الوضع: تلقائي — كل خبر يُنشر بقسمه الخاص حسب ملفه المصدر")
        category_name = None
    else:
        category_name = choose_category_name()
        log.info(f"🗂️  الوضع: يدوي — القسم الموحّد المختار: {category_name}")

    gemini_mode = choose_gemini_mode()
    _GEMINI_MODE_LABELS = {
        "1": "مع Gemini عنوان+متن (الافتراضي)",
        "2": "مع Gemini عنوان فقط دون المتن",
        "3": "بدون Gemini عنوان+متن (كما استُخرج حرفياً)",
    }
    log.info(f"🤖 وضع Gemini (لكل الفيدات/الأقسام ما عدا آراء واتجاهات): {_GEMINI_MODE_LABELS[gemini_mode]}")

    # ⚠️ كل الأوضاع الثلاثة تحدّد مصدرها مباشرة الآن، بدون سؤال y/1/2 الإضافي
    # بـ choose_feed_sources (أصبحت غير مستخدمة)، لأن السؤال الجديد بالأعلى
    # (1/2/3) يحدّد المصدر بدقة لكل وضع.
    if extraction_mode == "2":
        selected_feeds = dict(RSS_FEED_CATEGORIES)
    elif extraction_mode == "3":
        selected_feeds = {RSS_MASA_URL: RSS_MASA_CATEGORY}
    else:  # "1" — استخراج كامل: يختار المستخدم أي فيد/فيدات (رقم مفرد، أو مجمّعة بـ +، أو "الكل")
        selected_feeds = choose_full_extraction_feeds()

    if RSS_MASA_URL in selected_feeds:
        masa_category = choose_category_name()
        selected_feeds[RSS_MASA_URL] = masa_category
        log.info(f"🗂️  قسم نشر RSS المساء: {masa_category}")

    if RSS_ALITTIHAD_FULL_URL in selected_feeds:
        alittihad_category = choose_category_name()
        selected_feeds[RSS_ALITTIHAD_FULL_URL] = alittihad_category
        log.info(f"🗂️  قسم نشر RSS الاتحاد برس: {alittihad_category}")
    log.info(f"📡 المصادر المختارة: {list(selected_feeds.keys())}")

    existing_urls = get_existing_source_urls()
    log.info(f"🗂️  عدد الروابط المنشورة مسبقاً (آخر 500): {len(existing_urls)}")

    blocked_links = load_blocked_links()
    if blocked_links:
        log.info(f"🚫 عدد الروابط الممنوعة دائماً من جلسات سابقة: {len(blocked_links)}")

    items = collect_recent_items(selected_feeds)
    new_items = [
        it for it in items
        if it["link"] not in existing_urls and it["link"] not in blocked_links
    ]
    log.info("─" * 60)
    log.info(f"✅ إجمالي الأخبار الجديدة المؤهلة للنشر: {len(new_items)}")
    log.info("─" * 60)

    if not new_items:
        log.info("لا يوجد أخبار جديدة حالياً.")
        return

    if extraction_mode in ("1", "3"):
        log.info("─" * 60)
        log.info(f"🧲 استخراج النص الكامل لكل خبر من صفحته ({len(new_items)} خبر)...")
        apply_full_extraction(new_items)
        excluded_count = sum(1 for it in new_items if it.get("_excluded"))
        if excluded_count:
            new_items = [it for it in new_items if not it.get("_excluded")]
            log.info(f"🚫 استُبعد {excluded_count} خبر (قسم غير معروف/تعذّر اكتشافه من صفحته).")
        log.info("─" * 60)

    if not new_items:
        log.info("لا يوجد أخبار جديدة حالياً بعد الاستبعاد.")
        return

    for idx, it in enumerate(new_items, start=1):
        shown_category = it["category"] if auto_mode else category_name
        log.info(f"  {idx}) [{shown_category}] {it['title'][:65]}")

    excluded_indices = choose_excluded_items(new_items)

    session_skip_indices = choose_skipped_items(new_items)

    overrides = choose_category_overrides(new_items, auto_mode, category_name)

    opinion_count = sum(1 for it in new_items if it["category"] in NO_REWRITE_CATEGORIES)
    non_opinion_count = len(new_items) - opinion_count

    print("\n" + "═" * 55)
    parts = []
    if non_opinion_count:
        if gemini_mode == "1":
            parts.append(f"{non_opinion_count} خبر تُعاد صياغته بالكامل (عنوان+متن) عبر Gemini")
        elif gemini_mode == "2":
            parts.append(f"{non_opinion_count} خبر يُعاد صياغة عنوانه فقط عبر Gemini، ومتنه كما استُخرج")
        else:
            parts.append(f"{non_opinion_count} خبر يُنشر حرفياً كما استُخرج (بدون أي استدعاء لـ Gemini)")
    if opinion_count:
        parts.append(f"{opinion_count} مقال رأي (عنوانه فقط يُعاد صياغته، نصه كما هو)")
    print("  " + "، و".join(parts))
    print("═" * 55)
    interval_minutes = choose_publish_mode()
    if interval_minutes:
        print(f"  سيُجدولون بفارق {interval_minutes} دقيقة بين كل خبر (status=scheduled)")
        print("  ⚠️  تأكد إن دالة publish-scheduled بمشروعك تُستدعى دورياً (cron)،")
        print("     وإلا الأخبار المجدولة ما راح تُنشر فعلياً.")
    else:
        print("  سيُنشرون مباشرة (status=published) بتواريخ النشر الأصلية من المصدر")
    choice = input("اكتب 'تأكيد' للبدء الفعلي، أو أي شيء آخر للإلغاء: ").strip()
    if choice != "تأكيد":
        log.info("⏹️  تم الإلغاء.")
        return

    ok = fail = skipped = excluded_count = session_skipped_count = 0
    schedule_cursor = datetime.now(timezone.utc)
    if interval_minutes:
        # ✅ كل الأخبار (بما فيها الأول) تاخذ فارق واحد على الأقل من الآن،
        # عشان ما ينشر أول خبر فوراً بالغلط لحظة ما يوصله دور الـ Cron
        # (بدل ما يبدأ التوزيع من "الآن" نفسه، يبدأ من "الآن + فارق واحد")
        schedule_cursor += timedelta(minutes=interval_minutes)
    for idx, it in enumerate(new_items, start=1):
        if idx in excluded_indices:
            log.info(f"🚫 تم منع الخبر {idx} من النشر بناءً على اختيارك: {it['title'][:60]}")
            excluded_count += 1
            continue

        if idx in session_skip_indices:
            log.info(f"⏭️  تم تخطي الخبر {idx} بهذه الجلسة فقط (سيظهر طبيعياً بجلسة قادمة): {it['title'][:60]}")
            session_skipped_count += 1
            continue

        is_opinion = it["category"] in NO_REWRITE_CATEGORIES

        if is_opinion:
            log.info(f"📝 إعادة صياغة العنوان فقط (مقال رأي منسوب — النص الأصلي بلا تعديل): {it['title'][:60]}")
            raw_body = it["raw_body"].strip()
            new_title = rewrite_title_only(it["title"], raw_body)
            final_title = new_title or it["title"].strip()
            final_excerpt = (raw_body[:200].rstrip() + "…") if len(raw_body) > 200 else raw_body
            final_content = raw_body
        elif gemini_mode == "3":
            log.info(f"📄 نشر حرفي كما استُخرج (بدون أي استدعاء لـ Gemini، لا للعنوان ولا للمتن): {it['title'][:60]}")
            raw_body = it["raw_body"].strip()
            final_title = it["title"].strip()
            final_excerpt = (raw_body[:200].rstrip() + "…") if len(raw_body) > 200 else raw_body
            final_content = raw_body
        elif gemini_mode == "2":
            log.info(f"📝 إعادة صياغة العنوان فقط عبر Gemini (المتن كما استُخرج حرفياً): {it['title'][:60]}")
            raw_body = it["raw_body"].strip()
            new_title = rewrite_title_only(it["title"], raw_body)
            final_title = new_title or it["title"].strip()
            final_excerpt = (raw_body[:200].rstrip() + "…") if len(raw_body) > 200 else raw_body
            final_content = raw_body
        else:
            log.info(f"✍️  إعادة صياغة: {it['title'][:60]}")
            try:
                rewritten = rewrite_article(it["title"], it["raw_body"])
            except Exception as e:
                log.error(f"  ❌ فشلت إعادة الصياغة: {e}")
                fail += 1
                continue

            if not rewritten:
                skipped += 1
                continue

            final_title = rewritten["title"].strip()
            final_excerpt = rewritten["excerpt"].strip()
            final_content = rewritten["content"]

        words, reading_time = word_stats(final_content)
        formatted_content = format_content_paragraphs(final_content)
        item_date = it["pub_date"].isoformat()

        post_category = overrides.get(idx) or (it["category"] if auto_mode else category_name)

        category_id = get_category_id(post_category)
        if not category_id:
            log.error(f"  ❌ تخطّي الخبر: القسم '{post_category}' غير موجود بجدول categories بحصاد اليوم.")
            fail += 1
            continue

        if post_category in NO_IMAGE_CATEGORIES:
            log.info(f"  🚫 قسم «{post_category}»: يُنشر بدون صورة دائماً — تم تجاوز جلب/رفع الصورة.")
            image_url = None
        else:
            # ⚠️ خط احتياطي og:image يُفعَّل فقط لمصادر RSS عبر الإنترنت (مثل
            # RSS_MASA_URL)، ولا يُطبَّق إطلاقاً على ملفات XML المحلية
            # (aden-tm-*.xml) — تلك الملفات أصلاً فيها enclosure جاهز لو
            # الصورة متوفرة، وما نبي نضيف طلب شبكة إضافي غير ضروري عليها.
            is_remote_feed = str(it.get("source_feed", "")).startswith(("http://", "https://"))
            fallback_article_url = it.get("link") if is_remote_feed else None
            image_url = get_post_image_url(it.get("image_url"), fallback_article_url)

        if interval_minutes:
            publish_dt = schedule_cursor
            schedule_cursor += timedelta(minutes=interval_minutes)
            publish_time = publish_dt.isoformat()
            record_status = "scheduled"
            record_extra = {"scheduled_at": publish_time}
            # ✅ created_at يحفظ تاريخ النشر الأصلي دائماً (مو وقت تشغيل البوت)
            # scheduled_at هو الوحيد المسؤول عن توقيت ظهور الخبر فعلياً (عبر الـ Cron)
            created_updated = item_date
        else:
            publish_dt = datetime.fromisoformat(item_date)
            publish_time = item_date
            record_status = "published"
            record_extra = {}
            created_updated = item_date

        record = {
            "title": final_title,
            "slug": make_slug(final_title),
            "excerpt": final_excerpt,
            "content": formatted_content,
            "category_id": category_id,
            "source_type": SOURCE_LABEL,
            "source_url": it["link"],
            "status": record_status,
            "word_count": words,
            "reading_time": reading_time,
            "created_at": created_updated,
            "updated_at": created_updated,
            "published_at": created_updated if record_status == "published" else None,
            "featured_image": image_url,
            # ⭐ أي خبر بأحد أقسام FEATURED_SLIDER_CATEGORIES يُعلَّم مميّز تلقائياً
            # (عمود is_featured الذي يقرأ منه سلايدر الصفحة الرئيسية)
            "is_featured": post_category in FEATURED_SLIDER_CATEGORIES,
            **record_extra,
        }

        # مقالات الرأي المستثناة من الصياغة تُنسب صراحة لكاتبها الأصلي عبر
        # author_id (لا يوجد عمود نصي مستقل author بجدول posts بحصاد اليوم)
        if is_opinion:
            opinion_author_name = it.get("author") or DEFAULT_OPINION_AUTHOR
            author_id = get_or_create_author_id(opinion_author_name)
            if author_id:
                record["author_id"] = author_id
            else:
                log.warning(
                    f"⚠️  تعذّر ربط/إنشاء الكاتب '{opinion_author_name}' بجدول authors — "
                    "سيُنشر المقال لكن دون بطاقة الكاتب بالموقع."
                )

        post_id = sb_insert(record)
        if post_id:
            ok += 1
            status_label = "جُدول" if interval_minutes else "نُشر"
            log.info(f"  ✅ {status_label}: {record['title'][:60]}")

            seed_views(post_id)

            # رابط واحد صحيح يُستخدم لتيليجرام وللأرشفة معاً (بدل رابط /share الميت)
            canonical_url = build_canonical_url(record["slug"], record["created_at"])

            if interval_minutes:
                # ⏸️ وضع الجدولة: الخبر لسا status=scheduled وما نُشر فعلياً بالموقع بعد،
                # فما نرسل رابطه لتيليجرام الآن (سيكون رابط ميت مؤقتاً). بدلاً من هذا،
                # نضيفه لقائمة الانتظار (PENDING_SCHEDULED_FILE) ليُفحص تلقائياً بأول
                # تشغيلة قادمة للسكربت عبر check_and_notify_scheduled_posts، ويُرسل
                # رابطه لتيليجرام فقط بعد التأكد إن الـ Cron نشره فعلياً (published).
                pending = load_pending_scheduled()
                pending.append({"id": post_id, "title": record["title"], "slug": record["slug"], "created_at": record["created_at"]})
                save_pending_scheduled(pending)
                log.info("  ⏸️  تيليجرام: مؤجَّل لحين تأكيد النشر الفعلي بجلسة قادمة")
            else:
                if send_to_telegram(record["title"], canonical_url):
                    log.info("  📢 أُرسل لتليجرام")

                request_google_indexing([canonical_url])
        else:
            fail += 1

    log.info("═" * 60)
    log.info(f"📊 نُشر: {ok} / فشل: {fail} / تُخُطّي: {skipped} / مُنع من النشر: {excluded_count} / تُخطّي بهذه الجلسة فقط: {session_skipped_count}")
    log.info("═" * 60)


if __name__ == "__main__":
    main()
