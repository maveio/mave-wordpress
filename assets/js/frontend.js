(function () {
  function maveSettings() {
    return window.MaveWordPressPublic || window.MaveWordPress || {};
  }

  function loadMaveComponents() {
    var settings = maveSettings();
    var src = settings.componentsSrc;

    if (!src) {
      return Promise.resolve();
    }

    window.__maveComponentsConfig = settings.componentsConfig || {};

    if (window.customElements && window.customElements.get('mave-player')) {
      return Promise.resolve();
    }

    if (!window.__maveComponentsPromise) {
      window.__maveComponentsPromise = import(src).then(function (module) {
        if (module && typeof module.configureMave === 'function') {
          module.configureMave(settings.componentsConfig || {});
        }

        return module;
      });
    }

    return window.__maveComponentsPromise;
  }

  function boot() {
    loadMaveComponents().catch(function (error) {
      if (window.console) {
        window.console.error('Failed to load Mave components', error);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
