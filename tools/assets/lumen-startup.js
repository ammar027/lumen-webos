(function () {
  var root = document.documentElement;
  root.classList.add('lumen-starting');
  var finished = false, appsReady = false, readyAt = 0;
  function show() {
    if (finished) return;
    finished = true;
    root.classList.remove('lumen-starting');
    clearInterval(timer);
  }
  window.addEventListener('lumen-apps-ready', function () {
    appsReady = true;
    readyAt = Date.now();
  });
  var timer = setInterval(function () {
    if (!appsReady) return;
    var wallpaperReady = root.classList.contains('wp-image');
    var video = document.getElementById('bgvideo');
    if (video && video.readyState >= 2) wallpaperReady = true;
    var images = document.querySelectorAll('.tile__image');
    var iconsReady = Array.prototype.every.call(images, function (image) { return image.complete; });
    if ((wallpaperReady && iconsReady) || Date.now() - readyAt >= 2000) show();
  }, 100);
  setTimeout(show, 8000);
})();
