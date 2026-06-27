import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * دالة إنشاء مستخدم جديد بواسطة الأدمن - حصاد اليوم
 * تقوم بإنشاء الحساب من السيرفر مباشرة (دون التأثير على جلسة الأدمن الحالية)،
 * تأكيد البريد تلقائياً، وتعيين الرتبة (admin / editor / author)
 *
 * ملاحظة: استبدال استدعاء supabase.auth.signUp() من العميل بهذه الدالة ضروري
 * لأن signUp() على العميل قد يستبدل جلسة الأدمن الحالية بجلسة المستخدم الجديد.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_ROLES = ['admin', 'editor', 'author']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'عذراً، ترويسة التصريح مفقودة (Missing authorization header)' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // التحقق من أن المستدعي هو أدمن فعلياً (باستخدام جلسته الخاصة عبر anon key)
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: isAdmin, error: adminError } = await supabaseAnon.rpc('is_admin')

    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'غير مسموح - يجب أن تكون مديراً لتنفيذ هذا الإجراء' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'جميع الحقول مطلوبة (البريد، كلمة المرور، الرتبة)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!VALID_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ error: `رتبة غير صالحة. القيم المسموحة: ${VALID_ROLES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (String(password).length < 6) {
      return new Response(
        JSON.stringify({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Admin] جاري إنشاء مستخدم جديد: ${email} برتبة: ${role}`)

    // 1. إنشاء المستخدم في نظام الهوية (Auth) — مؤكد بريدياً تلقائياً
    //    full_name يُمرَّر في user_metadata ليقوم trigger الـ profiles بتعبئته تلقائياً
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' },
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. تعيين الرتبة للمستخدم في جدول user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([{ user_id: userData.user.id, role }])

    if (roleError) {
      // Rollback: حذف المستخدم إن فشل تعيين الرتبة، لضمان نظافة البيانات
      console.error(`[Error] فشل تعيين الرتبة، جاري حذف المستخدم: ${userData.user.id}`)
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)

      return new Response(
        JSON.stringify({ error: `فشل تعيين الرتبة: ${roleError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إنشاء المستخدم وتعيين الصلاحيات بنجاح',
        user: { id: userData.user.id, email: userData.user.email },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Critical Error]: ${errorMessage}`)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
