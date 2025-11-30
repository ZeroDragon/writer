/* global self, caches, fetch */
const CACHE_NAME = 'Writeros-cache-v1.0.15'
const urlsToCache = [
  // app items
  'app.css',
  'app.js',
  'encrypter.js',
  'registerSW.js',
  'file-api.js',
  'zero.js',
  'index.html',
  // assets
  'assets/android-chrome-192x192.png',
  'assets/android-chrome-512x512.png',
  'assets/apple-touch-icon.png',
  'assets/favicon-16x16.png',
  'assets/favicon-32x32.png',
  'assets/socialmedia.png',
  'assets/backspace.mp3',
  'assets/alert-long.mp3',
  'assets/alert-short.mp3',
  'assets/key-01.mp3',
  'assets/key-02.mp3',
  'assets/key-03.mp3',
  'assets/key-04.mp3',
  'assets/key-05.mp3',
  'assets/key-06.mp3',
  'assets/key-07.mp3',
  'assets/key-08.mp3',
  'assets/key-09.mp3',
  'assets/return-2.mp3',
  'assets/return.mp3',
  'assets/scrollDown.mp3',
  'assets/scrollUp.mp3',
  'assets/space-2.mp3',
  'assets/space.mp3',
  'assets/material-icons-outlined.woff2',
  'assets/robotomono-italic-cyrillic-ext.woff2',
  'assets/robotomono-italic-cyrillic.woff2',
  'assets/robotomono-italic-greek.woff2',
  'assets/robotomono-italic-latin-ext.woff2',
  'assets/robotomono-italic-latin.woff2',
  'assets/robotomono-italic-vietnamese.woff2',
  'assets/robotomono-normal-cyrillic-ext.woff2',
  'assets/robotomono-normal-cyrillic.woff2',
  'assets/robotomono-normal-greek.woff2',
  'assets/robotomono-normal-latin-ext.woff2',
  'assets/robotomono-normal-latin.woff2',
  'assets/robotomono-normal-vietnamese.woff2',
  'assets/site.webmanifest',
  'assets/favicon.ico'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    })
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  )
})
