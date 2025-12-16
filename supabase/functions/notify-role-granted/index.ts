import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RoleGrantedNotification {
  email: string;
  fullName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role }: RoleGrantedNotification = await req.json();

    console.log("Sending role granted notification to:", email);

    const roleText = role === "admin" ? "مسؤول" : role === "editor" ? "محرر" : role;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "حصاد اليوم <onboarding@resend.dev>",
        to: [email],
        subject: "تم منحك صلاحيات الوصول - حصاد اليوم",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #1e3a8a;">مرحباً ${fullName || 'بك'}!</h1>
            <p>يسعدنا إبلاغك بأنه تم منحك صلاحيات الوصول إلى لوحة تحكم حصاد اليوم.</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>الدور:</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${roleText}</td>
              </tr>
            </table>
            <p>يمكنك الآن تسجيل الدخول والبدء في استخدام لوحة التحكم:</p>
            <a href="https://hasadalyoum.vercel.app/admin" 
               style="display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              الذهاب إلى لوحة التحكم
            </a>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="color: #666; font-size: 12px;">هذه الرسالة مُرسلة تلقائياً من نظام حصاد اليوم</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const data = await res.json();
    console.log("Role granted email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-role-granted function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
