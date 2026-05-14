(function () {
  "use strict";

  var script = document.currentScript;
  var scriptBase = script ? new URL(".", script.src).href : "/";
  var config = Object.assign(
    {
      appName: "Cosmo Beauty",
      appShortName: "Cosmo",
      appDescription: "Приложение сайта Cosmo Beauty для быстрой записи и просмотра услуг.",
      installText: "Установить",
      subtitle: "Установить приложение",
      assetBase: scriptBase,
      startUrl: window.location.origin + "/",
      scope: window.location.origin + "/",
      themeColor: "#222222",
      backgroundColor: "#ffffff",
      bottomOffset: "0px",
      serviceWorkerUrl: "",
      dismissedDays: 14,
      showWithoutPrompt: true,
      fallbackDelay: 6500,
      openChromeOnAndroidFallback: true,
      assetVersion: "20260515-7"
    },
    window.COSMO_PWA_CONFIG || {}
  );

  var storageKey = "cosmo-pwa-install-dismissed-at";
  var deferredPrompt = null;
  var banner = null;
  var fallbackTimer = null;
  var isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.indexOf("android-app://") === 0;
  var isAndroid = /android/i.test(window.navigator.userAgent);
  var isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  var isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(window.navigator.userAgent);
  var isChromeLike =
    /chrome|crios/i.test(window.navigator.userAgent) &&
    !/edg|opr|opera|samsungbrowser|yabrowser|ucbrowser|miuibrowser|huawei/i.test(window.navigator.userAgent);

  window.COSMO_PWA_STATUS = {
    ready: false,
    beforeInstallPrompt: false,
    installable: false,
    installed: isStandalone,
    android: isAndroid,
    chromeLike: isChromeLike,
    userAgent: window.navigator.userAgent,
    lastAction: "init"
  };

  injectMeta();
  injectManifest();
  injectCss();
  cleanupLegacyBanner();
  registerServiceWorker();

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    window.COSMO_PWA_STATUS.beforeInstallPrompt = true;
    window.COSMO_PWA_STATUS.installable = true;
    window.COSMO_PWA_STATUS.lastAction = "beforeinstallprompt";
    clearFallbackTimer();
    showBanner();
    updateBannerState();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    window.COSMO_PWA_STATUS.installed = true;
    window.COSMO_PWA_STATUS.installable = false;
    window.COSMO_PWA_STATUS.lastAction = "appinstalled";
    hideBanner(true);
  });

  if (config.showWithoutPrompt) {
    ready(function () {
      fallbackTimer = window.setTimeout(function () {
        if (!deferredPrompt && !isStandalone && !isRecentlyDismissed()) {
          window.COSMO_PWA_STATUS.lastAction = "fallback-banner";
          showBanner();
          updateBannerState();
        }
      }, Number(config.fallbackDelay) || 6500);
    });
  }

  window.CosmoPWA = {
    getStatus: function () {
      return Object.assign({}, window.COSMO_PWA_STATUS);
    },
    install: handleInstallClick
  };

  window.COSMO_PWA_STATUS.ready = true;

  function injectMeta() {
    setMeta("theme-color", config.themeColor);
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-title", config.appShortName);
    setMeta("apple-mobile-web-app-status-bar-style", "default");
    setManagedLink("apple-touch-icon", versionedAsset("icons/icon-180x180.png"), "apple-icon");
    setManagedLink("icon", versionedAsset("icons/favicon.ico"), "favicon");
  }

  function injectManifest() {
    var existingManifest = document.querySelector('link[rel="manifest"]:not([data-cosmo-pwa])');
    if (existingManifest) {
      window.COSMO_PWA_STATUS.manifest = existingManifest.href;
      return;
    }

    var manifest = {
      id: config.scope,
      name: config.appName,
      short_name: config.appShortName,
      description: config.appDescription,
      lang: "ru-RU",
      start_url: config.startUrl,
      scope: config.scope,
      display: "standalone",
      display_override: ["standalone", "minimal-ui", "browser"],
      orientation: "portrait",
      background_color: config.backgroundColor,
      theme_color: config.themeColor,
      categories: ["beauty", "health", "lifestyle"],
      prefer_related_applications: false,
      icons: [
        icon("48", "icon-48x48.png", "any"),
        icon("72", "icon-72x72.png", "any"),
        icon("96", "icon-96x96.png", "any"),
        icon("128", "icon-128x128.png", "any"),
        icon("144", "icon-144x144.png", "any"),
        icon("152", "icon-152x152.png", "any"),
        icon("180", "icon-180x180.png", "any"),
        icon("192", "icon-192x192.png", "any"),
        icon("192", "maskable-192x192.png", "maskable"),
        icon("384", "icon-384x384.png", "any"),
        icon("512", "icon-512x512.png", "any"),
        icon("512", "maskable-512x512.png", "maskable")
      ],
      shortcuts: [
        {
          name: "Записаться",
          short_name: "Запись",
          url: config.startUrl + "#rec",
          icons: [icon("192", "icon-192x192.png", "any")]
        }
      ]
    };

    try {
      var blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
      setManagedLink("manifest", URL.createObjectURL(blob), "manifest", "anonymous");
    } catch (error) {
      setManagedLink("manifest", absoluteAsset("manifest.webmanifest"), "manifest", "anonymous");
    }
  }

  function injectCss() {
    setManagedLink("stylesheet", versionedAsset("pwa-install.css"), "styles");
    document.documentElement.style.setProperty("--cosmo-pwa-bottom-offset", config.bottomOffset);
  }

  function registerServiceWorker() {
    if (!config.serviceWorkerUrl) return;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    window.addEventListener("load", function () {
      navigator.serviceWorker.register(config.serviceWorkerUrl, { scope: "/" }).catch(function (error) {
        console.warn("[Cosmo PWA] Service worker registration failed:", error);
      });
    });
  }

  function buildBanner() {
    var root = document.createElement("div");
    root.className = "cosmo-pwa-banner";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Установка приложения");

    root.innerHTML =
      '<div class="cosmo-pwa-banner__inner">' +
      '<div class="cosmo-pwa-banner__icon"><img src="' +
      escapeAttr(versionedAsset("icons/icon-180x180.png")) +
      '" alt=""></div>' +
      '<div class="cosmo-pwa-banner__copy">' +
      '<p class="cosmo-pwa-banner__title">' +
      escapeHtml(config.appName) +
      "</p>" +
      '<p class="cosmo-pwa-banner__subtitle">' +
      escapeHtml(config.subtitle) +
      "</p>" +
      "</div>" +
      '<button class="cosmo-pwa-banner__install" type="button">' +
      escapeHtml(config.installText) +
      "</button>" +
      '<button class="cosmo-pwa-banner__close" type="button" aria-label="Закрыть"></button>' +
      "</div>";

    root.querySelector(".cosmo-pwa-banner__install").addEventListener("click", handleInstallClick);
    root.querySelector(".cosmo-pwa-banner__close").addEventListener("click", function () {
      hideBanner(true);
    });

    document.body.appendChild(root);
    updateBannerState();
    return root;
  }

  async function handleInstallClick() {
    window.COSMO_PWA_STATUS.lastAction = "install-click";

    if (deferredPrompt) {
      window.COSMO_PWA_STATUS.lastAction = "native-prompt-open";
      deferredPrompt.prompt();
      var result = await deferredPrompt.userChoice.catch(function () {
        return { outcome: "dismissed" };
      });
      deferredPrompt = null;
      window.COSMO_PWA_STATUS.installable = false;
      window.COSMO_PWA_STATUS.choice = result.outcome;

      if (result.outcome === "accepted") {
        hideBanner(true);
      } else {
        updateBannerState();
      }
      return;
    }

    if (isiOS && isSafari) {
      window.COSMO_PWA_STATUS.lastAction = "ios-instructions";
      showToast("На iPhone нажмите «Поделиться», затем «На экран Домой».");
      return;
    }

    if (isAndroid && !isChromeLike && config.openChromeOnAndroidFallback) {
      window.COSMO_PWA_STATUS.lastAction = "open-chrome-intent";
      openInChrome();
      showToast("Открываем сайт в Chrome. После открытия нажмите «Установить» ещё раз.");
      return;
    }

    if (isAndroid && isChromeLike) {
      window.COSMO_PWA_STATUS.lastAction = "chrome-waiting-for-prompt";
      showToast("Подождите пару секунд и нажмите «Установить» ещё раз. Если окно не появится, обновите страницу в Chrome.");
      return;
    }

    window.COSMO_PWA_STATUS.lastAction = "generic-instructions";
    showToast("Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».");
  }

  function showBanner() {
    if (isStandalone || isRecentlyDismissed()) return;
    ready(function () {
      cleanupLegacyBanner();
      banner = banner || buildBanner();
      banner.classList.add("is-visible");
      updateBannerState();
    });
  }

  function hideBanner(saveDismiss) {
    if (saveDismiss) {
      try {
        localStorage.setItem(storageKey, String(Date.now()));
      } catch (error) {}
    }

    if (banner) {
      banner.classList.remove("is-visible");
    }
  }

  function updateBannerState() {
    if (!banner) return;

    var installButton = banner.querySelector(".cosmo-pwa-banner__install");
    if (!installButton) return;

    banner.classList.toggle("is-install-ready", !!deferredPrompt);
    banner.classList.toggle("is-fallback", !deferredPrompt);

    if (deferredPrompt) {
      installButton.textContent = config.installText;
      installButton.removeAttribute("aria-disabled");
    } else if (isAndroid && !isChromeLike && config.openChromeOnAndroidFallback) {
      installButton.textContent = "Открыть Chrome";
      installButton.removeAttribute("aria-disabled");
    } else {
      installButton.textContent = config.installText;
      installButton.removeAttribute("aria-disabled");
    }
  }

  function openInChrome() {
    var currentUrl = window.location.href;
    var withoutProtocol = currentUrl.replace(/^https?:\/\//i, "");
    var intent =
      "intent://" +
      withoutProtocol +
      "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(currentUrl) +
      ";end";
    window.location.href = intent;
  }

  function clearFallbackTimer() {
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function cleanupLegacyBanner() {
    ready(function () {
      var legacyBanner = document.getElementById("pwa-banner");
      if (legacyBanner) legacyBanner.remove();
    });
  }

  function isRecentlyDismissed() {
    try {
      var dismissedAt = Number(localStorage.getItem(storageKey) || 0);
      var ttl = Number(config.dismissedDays || 0) * 24 * 60 * 60 * 1000;
      return dismissedAt > 0 && ttl > 0 && Date.now() - dismissedAt < ttl;
    } catch (error) {
      return false;
    }
  }

  function showToast(message) {
    var previous = document.querySelector(".cosmo-pwa-toast");
    if (previous) previous.remove();

    var toast = document.createElement("div");
    toast.className = "cosmo-pwa-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, 5200);
  }

  function ready(callback) {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function icon(size, file, purpose) {
    return {
      src: versionedAsset("icons/" + file),
      sizes: size + "x" + size,
      type: "image/png",
      purpose: purpose
    };
  }

  function absoluteAsset(path) {
    return new URL(path, config.assetBase).href;
  }

  function versionedAsset(path) {
    var url = new URL(path, config.assetBase);
    if (config.assetVersion) {
      url.searchParams.set("v", config.assetVersion);
    }
    return url.href;
  }

  function setMeta(name, content) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }

  function setManagedLink(rel, href, key, crossOrigin) {
    var selector = 'link[data-cosmo-pwa="' + key + '"]';
    var link = document.querySelector(selector);
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-cosmo-pwa", key);
      link.setAttribute("rel", rel);
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
    if (crossOrigin) link.setAttribute("crossorigin", crossOrigin);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
