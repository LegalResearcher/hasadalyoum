import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * مكوّن تثبيت تطبيق حصاد اليوم (PWA)
 * يدعم المتصفحات الحديثة ويوفر واجهة مستخدم سلسة للجوال والديسكتوب
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);

    return outcome === "accepted";
  };

  return { isInstallable, isInstalled, installApp };
};

// زر سطح المكتب: يوضع في شريط التنقل
export const PWAInstallButton = () => {
  const { isInstallable, installApp } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <Button
      onClick={installApp}
      variant="ghost"
      size="sm"
      className="hidden md:flex items-center gap-1.5 hover:bg-accent hover:text-accent-foreground transition-all duration-300 font-bold border border-border rounded-full px-4"
    >
      <Download className="w-4 h-4" />
      <span>تثبيت التطبيق</span>
    </Button>
  );
};

// إشعار الجوال: يظهر بشكل عائم بعد قليل من التمرير
export const PWAInstallToast = () => {
  const { isInstallable, installApp } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("pwa-toast-dismissed")) {
      setIsDismissed(true);
      return;
    }

    const handleScroll = () => {
      if (window.scrollY > 500 && isInstallable && !isDismissed) {
        setIsVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isInstallable, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem("pwa-toast-dismissed", "true");
  };

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) setIsVisible(false);
  };

  if (!isInstallable || !isVisible || isDismissed) return null;

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100]" dir="rtl">
      <div className="relative flex items-center gap-3 px-4 py-4 rounded-2xl bg-card shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-border animate-in slide-in-from-bottom-5 duration-500">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -left-2 w-7 h-7 flex items-center justify-center rounded-full bg-card text-muted-foreground border border-border shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-inner">
          <Smartphone className="w-6 h-6 text-accent-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-foreground truncate">تطبيق حصاد اليوم</p>
          <p className="text-[11px] text-muted-foreground font-bold leading-tight">
            ثبّت التطبيق الآن لتصلك الأخبار فور وقوعها
          </p>
        </div>

        <Button onClick={handleInstall} size="sm" className="flex-shrink-0 font-black text-xs px-4 py-2 rounded-xl h-auto">
          تثبيت
        </Button>
      </div>
    </div>
  );
};
