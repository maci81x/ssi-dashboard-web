// 21/10 — IL SERVICE WORKER DELLE NOTIFICHE (prompt del 21/10, punto 3.3). Fa solo questo: riceve la push, mostra la
// notifica, aggiorna il numerino sull'icona (setAppBadge, dove c'è) e al tocco apre la pagina giusta («I miei clienti →
// nuovi»). NESSUNA cache e nessun «fetch»: il sito resta servito dalla rete come prima (un service worker che mette in
// cache le pagine farebbe vedere versioni vecchie, il guaio del 14/09).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { testo: e.data ? e.data.text() : "" }; }
  const titolo = d.titolo || "SSI Dashboard";
  const lavori = [self.registration.showNotification(titolo, {
    body: d.testo || "",
    icon: "./icona-192.png",
    badge: "./icona-192.png",
    data: { url: d.url || "./" },
    tag: d.tag || titolo,
  })];
  if (typeof d.badge === "number" && self.navigator && "setAppBadge" in self.navigator) {
    lavori.push(self.navigator.setAppBadge(d.badge).catch(() => {}));
  }
  e.waitUntil(Promise.all(lavori));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil((async () => {
    const aperte = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of aperte) {
      if ("navigate" in c) { await c.focus(); return c.navigate(url); }
    }
    return self.clients.openWindow(url);
  })());
});
