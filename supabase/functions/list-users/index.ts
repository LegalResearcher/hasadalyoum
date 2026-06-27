import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * دالة جلب قائمة المستخدمين (Auth) بواسطة الأدمن - حصاد اليوم
 * تُستخدم لعرض البريد الإلكتروني المرتبط بكل مستخدم في صفحة "المستخدمون"
 * (جدولا profiles و user_roles لا يحتويان على البريد الإلكتروني، لذا نحتاج
 * صلاحية service_role للوصول إليه من نظام Auth مباشرة)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

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

    // استخدام service_role لجلب قائمة المستخدمين من نظام Auth
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    // إرجاع فقط الحقول غير الحساسة (id, email, تاريخ الإنشاء، تاريخ آخر دخول)
    const safeUsers = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))

    return new Response(JSON.stringify({ users: safeUsers }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Critical Error]: ${errorMessage}`)

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
