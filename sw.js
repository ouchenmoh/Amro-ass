/* =====================================================
   Service Worker — آخر المستجدات والفعاليات
   استراتيجية: Stale-While-Revalidate
   الأخبار تُعرض فوراً من الكاش، وتُحدَّث في الخلفية
===================================================== */
const CACHE = 'sb-news-v1';
const SB    = 'https://ivbpnfidpebkdavtfxqc.supabase.co';
const KEY   = 'sb_publishable_fLn7AVj_4JsdrhlbnsYZXw_PVzFYsL7';
const NEWS_URL = SB + '/rest/v1/news?select=id,title,category,date,image,excerpt,content,created_at&status=eq.published&order=created_at.desc&limit=20';
const ADS_URL  = SB + '/rest/v1/ads?select=*&status=eq.active&order=created_at.desc';

const SB_HEADERS = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY };

// عند التثبيت: جهّز الكاش فوراً
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all([
        fetch(NEWS_URL, { headers: SB_HEADERS })
          .then(function(r) { if (r.ok) cache.put(NEWS_URL, r); }),
        fetch(ADS_URL, { headers: SB_HEADERS })
          .then(function(r) { if (r.ok) cache.put(ADS_URL, r); })
      ]).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(e) {
  self.clients.claim();
  // حذف الكاشات القديمة
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
});

// اعترض طلبات Supabase
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.indexOf(SB) === -1) return; // تجاهل أي طلب غير Supabase

  e.respondWith(
    caches.open(CACHE).then(function(cache) {
      return cache.match(e.request.url).then(function(cached) {

        // جدّد من الشبكة في الخلفية دائماً
        var networkFetch = fetch(e.request.url, { headers: SB_HEADERS })
          .then(function(r) {
            if (r && r.ok) {
              cache.put(e.request.url, r.clone());
            }
            return r;
          })
          .catch(function() { return null; });

        // إذا في كاش → أعطه فوراً (0ms) + رفّش في الخلفية
        if (cached) return cached.clone();

        // لا يوجد كاش → انتظر الشبكة
        return networkFetch;
      });
    })
  );
});
