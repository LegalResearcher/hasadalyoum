// Service Worker - حصاد اليوم (PWA)
// نسخة مبسّطة: تثبيت + تنظيف الكاش القديم فقط (بدون إشعارات Push حالياً)

const CACHE_NAME = "hasadalyoum-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ملاحظة: لم تُضَف معالجات إشعارات Push بعد لعدم وجود حاجة لها حالياً
// (لا يوجد مشتركون). يمكن إضافتها لاحقاً بسهولة عند الحاجة دون التأثير
// على باقي وظائف PWA (التثبيت + العمل offline-ready الأساسي).
