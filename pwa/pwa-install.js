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
      showWithoutPrompt: true
    },
    window.COSMO_PWA_CONFIG || {}
  );

  var storageKey = "cosmo-pwa-install-dismissed-at";
  var deferredPrompt = null;
  var banner = null;
  var isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.indexOf("android-app://") === 0;
  var isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  var isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(window.navigator.userAgent);

  injectMeta();
  injectManifest();
  injectCss();
  registerServiceWorker();

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showBanner();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideBanner(true);
  });

  if (config.showWithoutPrompt) {
    ready(function () {
      window.setTimeout(function () {
        if (!deferredPrompt && !isStandalone && !isRecentlyDismissed()) {
          showBanner();
        }
      }, 1200);
    });
  }

  function injectMeta() {
    setMeta("theme-color", config.themeColor);
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-title", config.appShortName);
    setMeta("apple-mobile-web-app-status-bar-style", "default");
    setManagedLink("apple-touch-icon", absoluteAsset("icons/icon-180x180.png"), "apple-icon");
    setManagedLink("icon", absoluteAsset("icons/favicon.ico"), "favicon");
  }

  function injectManifest() {
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
    setManagedLink("stylesheet", absoluteAsset("pwa-install.css?v=20260515-3"), "styles");
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
      escapeAttr(absoluteAsset("icons/icon-180x180.png")) +
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
    return root;
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      var result = await deferredPrompt.userChoice.catch(function () {
        return { outcome: "dismissed" };
      });
      deferredPrompt = null;

      if (result.outcome === "accepted") {
        hideBanner(true);
      }
      return;
    }

    if (isiOS && isSafari) {
      showToast("На iPhone нажмите «Поделиться», затем «На экран Домой».");
      return;
    }

    showToast("Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».");
  }

  function showBanner() {
    if (isStandalone || isRecentlyDismissed()) return;
    ready(function () {
      banner = banner || buildBanner();
      banner.classList.add("is-visible");
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
      src: absoluteAsset("icons/" + file),
      sizes: size + "x" + size,
      type: "image/png",
      purpose: purpose
    };
  }

  function absoluteAsset(path) {
    return new URL(path, config.assetBase).href;
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
