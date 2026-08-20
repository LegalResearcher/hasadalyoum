import { useEffect, useState } from "react";

const HASAD_VISIT_ENDPOINT = "https://moilegbot-cd9jlnvj.manus.space/api/telegram/hasad-visit";

type TelegramMiniApp = {
  initData?: string;
  ready: () => void;
  expand?: () => void;
  close?: () => void;
};

type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramMiniApp } };

type VisitStatus = "checking" | "verified" | "failed" | "browser";

export default function TelegramBotVisit() {
  const [status, setStatus] = useState<VisitStatus>("checking");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const webApp = (window as TelegramWindow).Telegram?.WebApp;
    if (!webApp?.initData) {
      setStatus("browser");
      return;
    }

    webApp.ready();
    webApp.expand?.();
    fetch(HASAD_VISIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: webApp.initData,
        region: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("verification-failed");
        setStatus("verified");
        setRedirecting(true);
        window.setTimeout(() => {
          webApp.close?.();
          window.location.assign("https://t.me/Moieen2025Bot");
        }, 1800);
      })
      .catch(() => setStatus("failed"));
  }, []);

  const content = {
    checking: {
      title: "جارٍ توثيق زيارتك",
      description: "يتم الآن التحقق الآمن من فتحك لموقع حصاد اليوم عبر البوت.",
      accent: "bg-amber-500",
    },
    verified: {
      title: "تم توثيق الزيارة بنجاح",
      description: "شكرًا لزيارتك. فُتح لك الوصول المجاني إلى القواعد القضائية والصيغ والعقود القانونية.",
      accent: "bg-emerald-500",
    },
    failed: {
      title: "تعذر توثيق الزيارة حاليًا",
      description: "ارجع إلى البوت، وافتح حصاد اليوم من زر التحقق داخل القسم، ثم حاول مجددًا.",
      accent: "bg-rose-500",
    },
    browser: {
      title: "افتح الصفحة من البوت",
      description: "لإتمام التوثيق، افتح حصاد اليوم من زر التحقق داخل بوت الناصر القانوني عبر تطبيق تيليغرام.",
      accent: "bg-slate-500",
    },
  }[status];

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center">
        <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur">
          <div className={`h-2 w-full ${content.accent}`} />
          <div className="p-8 text-center sm:p-10">
            <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${content.accent} text-3xl shadow-lg`} aria-hidden="true">
              {status === "verified" ? "✓" : status === "failed" ? "!" : "◌"}
            </div>
            <p className="text-sm font-bold tracking-wide text-amber-300">حصاد اليوم الإخباري</p>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">{content.title}</h1>
            <p className="mt-4 leading-8 text-slate-300">{content.description}</p>
            {status === "verified" && <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200"><div className="flex items-center justify-center gap-2"><span className={`inline-block h-4 w-4 rounded-full border-2 border-emerald-100/30 border-t-emerald-100 ${redirecting ? "animate-spin" : ""}`} /><span>جارٍ إعادتك تلقائيًا إلى بوت الناصر القانوني…</span></div><a href="https://t.me/Moieen2025Bot" className="mt-3 inline-block border-b border-emerald-200/50 pb-0.5 text-xs text-emerald-100">العودة إلى البوت الآن</a></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
