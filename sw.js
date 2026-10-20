const C='daejang-v17',F=['./','./index.html','./games.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(u=>fetch(u,{cache:'reload'}).then(r=>c.put(u,r))))));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{
    const cl=r.clone();
    caches.open(C).then(c=>c.put(e.request,cl));
    return r;
  }).catch(()=>caches.match(e.request)));
});
