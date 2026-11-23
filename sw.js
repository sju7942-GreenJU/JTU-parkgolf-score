var CACHE_PREFIX = 'parkgolf-scorecard-';
var CACHE_NAME = CACHE_PREFIX + 'v1';
var SHELL_URLS = ['./', './index.html'];
var SHELL_INDEX = './index.html';

function sameOrigin(url) {
  return String(url).indexOf(self.location.origin + '/') === 0;
}

function cachedShell() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(SHELL_INDEX, { ignoreSearch: true }).then(function (hit) {
      return hit || cache.match('./', { ignoreSearch: true });
    });
  });
}

function networkFirst(request) {
  return fetch(request).then(function (response) {
    if (!response || !response.ok) return response;
    var copy = response.clone();
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.put(SHELL_INDEX, copy);
    }).then(function () { return response; }, function () { return response; });
  }, function (err) {
    return cachedShell().then(function (hit) {
      if (hit) return hit;
      throw err;
    });
  });
}

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (hit) {
      return hit || fetch(request);
    });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(SHELL_URLS);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    var old = [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(CACHE_PREFIX) === 0 && keys[i] !== CACHE_NAME) old.push(caches['delete'](keys[i]));
    }
    return Promise.all(old);
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (!request || request.method !== 'GET' || !sameOrigin(request.url)) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
