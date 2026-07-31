-- إضافة عمود الصورة المصغّرة (Thumbnail) لجدول المنشورات
-- تُستخدم هذه النسخة الأصغر في بطاقات القوائم (الرئيسية / الأقسام / الأكثر قراءة)
-- بدل الصورة الكاملة (featured_image)، لتقليل استهلاك Storage Egress على Supabase.
-- المقالات القديمة التي لا تملك thumbnail_image ستستمر بعرض featured_image كما هي
-- (fallback في الواجهة)، فلا حاجة لتعبئة بيانات تاريخية.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumbnail_image TEXT;
