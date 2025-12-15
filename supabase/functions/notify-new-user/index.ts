import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewUserNotification {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: NewUserNotification = await req.json();

    console.log("Sending notification for new user:", email);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "حصاد اليوم <onboarding@resend.dev>",
        to: ["moieen2000@gmail.com"],
        subject: "مستخدم جديد يحتاج موافقة - حصاد اليوم",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #1e3a8a;">طلب تسجيل مستخدم جديد</h1>
            <p>تم تسجيل مستخدم جديد في موقع حصاد اليوم:</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>الاسم:</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${fullName || 'غير محدد'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
              </tr>
            </table>
            <p>يرجى مراجعة الطلب ومنح الصلاحيات المناسبة للمستخدم من لوحة التحكم.</p>
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
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-new-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
