// Register serviceworker
function registerServiceWorker () {
  if ('serviceWorker' in navigator) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Never register service worker on localhost
      return
    }
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js')
        .then(function (_registration) {
          // Serviceworker registered successfully
          console.log(':)')
        })
        .catch(function (_error) {
          // Failed to register serviceworker
          console.log(':(')
        })
    })
  }
}
registerServiceWorker()
