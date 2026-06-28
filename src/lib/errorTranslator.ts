/**
 * أداة ترجمة الأخطاء - حصاد اليوم
 * تحوّل رسائل خطأ قاعدة البيانات التقنية (الإنجليزية) إلى رسائل عربية مفهومة للمستخدم
 */

interface ErrorTranslation {
  pattern: RegExp;
  message: string;
}

const errorTranslations: ErrorTranslation[] = [
  {
    pattern: /duplicate key value violates unique constraint.*posts_slug_key/i,
    message: "عفواً، هذا الرابط (Slug) مستخدم بالفعل في خبر آخر. يرجى تعديل العنوان أو الرابط الفرعي.",
  },
  {
    pattern: /duplicate key value violates unique constraint.*site_settings_key_key/i,
    message: "هذا المفتاح موجود مسبقاً في إعدادات الموقع.",
  },
  {
    pattern: /duplicate key value violates unique constraint.*category_settings/i,
    message: "هذا القسم لديه إعدادات عرض مسجّلة مسبقاً.",
  },
  {
    pattern: /duplicate key value violates unique constraint/i,
    message: "البيانات التي تحاول إدخالها موجودة مسبقاً (الرابط أو القيمة). يرجى التغيير والمحاولة مرة أخرى.",
  },
  {
    pattern: /violates foreign key constraint/i,
    message: "لا يمكن إتمام هذه العملية لوجود بيانات مرتبطة بهذا السجل (مثل أخبار تابعة لهذا القسم/الكاتب).",
  },
  {
    pattern: /violates not-null constraint/i,
    message: "هناك حقول مطلوبة لم يتم ملؤها. يرجى التأكد من إدخال كافة البيانات الأساسية.",
  },
  {
    pattern: /violates check constraint/i,
    message: "البيانات المدخلة لا تستوفي الشروط المطلوبة. يرجى التحقق من صحة المدخلات.",
  },
  {
    pattern: /value too long for type/i,
    message: "النص المدخل طويل جداً ويتجاوز الحد المسموح به. يرجى الاختصار.",
  },
  {
    pattern: /invalid input syntax/i,
    message: "صيغة البيانات غير مدعومة. يرجى التأكد من إدخال القيم بشكل صحيح.",
  },
  {
    pattern: /permission denied/i,
    message: "عذراً، ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.",
  },
  {
    pattern: /row-level security/i,
    message: "تم رفض الوصول للبيانات لدواعي أمنية أو نقص في الصلاحيات.",
  },
  {
    pattern: /network|fetch|connection/i,
    message: "فشل الاتصال بالخادم. يرجى التأكد من جودة الإنترنت لديك والمحاولة مرة أخرى.",
  },
  {
    pattern: /timeout/i,
    message: "انتهت مهلة الطلب نظراً لبطء الاتصال. يرجى إعادة المحاولة.",
  },
  {
    pattern: /unauthorized|not authenticated|jwt/i,
    message: "جلسة العمل انتهت. يرجى تسجيل الدخول مجدداً للمتابعة.",
  },
];

/**
 * دالة ترجمة الأخطاء التقنية إلى العربية
 */
export function translateError(error: any): string {
  const errorMessage =
    typeof error === "string" ? error : error?.message || error?.error_description || String(error);

  for (const translation of errorTranslations) {
    if (translation.pattern.test(errorMessage)) {
      return translation.message;
    }
  }

  return "حدث خطأ غير متوقع في النظام. يرجى المحاولة لاحقاً أو مراسلة الإدارة التقنية.";
}

/**
 * التحقق من وجود الرابط (Slug) مسبقاً في قاعدة البيانات
 */
export async function checkSlugExists(supabase: any, slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false;

  let query = supabase.from("posts").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Error checking slug:", error);
    return false;
  }
  return !!data;
}

/**
 * التحقق من وجود العنوان مسبقاً في قاعدة البيانات (تنبيه فقط، العنوان غير فريد إلزامياً في حصاد اليوم)
 */
export async function checkTitleExists(supabase: any, title: string, excludeId?: string): Promise<boolean> {
  if (!title) return false;

  let query = supabase.from("posts").select("id").eq("title", title.trim());
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Error checking title:", error);
    return false;
  }
  return !!data;
}
