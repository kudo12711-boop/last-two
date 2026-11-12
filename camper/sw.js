// キャンピングカー世界一周：お知らせ（通知）を出すためだけの小さなしくみ。ページの読みこみには関わらない
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) if ('focus' in c) return c.focus(); return self.clients.openWindow('./'); }));
});
