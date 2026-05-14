# COSMO BEAUTY PWA для Tilda

## Что готово

- `pwa/icons/` - иконки во всех популярных размерах для Android, iOS, desktop, favicon и maskable.
- `pwa/pwa-install.js` - head-скрипт, который подключает manifest, мета-теги, иконки и баннер установки.
- `pwa/pwa-install.css` - стили нижнего баннера как на референсе.
- `pwa/manifest.webmanifest` - обычный manifest-файл, если понадобится подключать его отдельно.
- `pwa/sw.js` - опциональный service worker. Его можно использовать только если файл доступен с домена сайта, например `https://criomedical-clinic.ru/sw.js`.
- `tilda-head-code.html` - готовый код для вставки в head в Тильде.

## Как подключить через GitHub Pages

1. Залить папку `pwa/` и файл `tilda-head-code.html` в репозиторий GitHub.
2. Включить GitHub Pages для репозитория.
3. Узнать публичный URL папки `pwa/`, например:
   `https://username.github.io/cosmo-pwa/pwa/`
4. В файле `tilda-head-code.html` заменить:
   - `https://YOUR_GITHUB_USER.github.io/YOUR_REPOSITORY/pwa/`
   - `https://YOUR_GITHUB_USER.github.io/YOUR_REPOSITORY/pwa/pwa-install.js`
5. Вставить обновленный код в Tilda: `Site Settings -> More -> HTML code for head`.
6. Опубликовать сайт и проверить с мобильного Chrome/Android.

## Важный момент про установку

Кнопка вызывает правильное браузерное событие `beforeinstallprompt`. На Android Chrome/Edge оно появляется, когда браузер считает сайт устанавливаемым. На iPhone такого события нет: iOS устанавливает PWA вручную через Safari -> Поделиться -> На экран Домой, поэтому скрипт показывает подсказку.

Для максимальной PWA-совместимости нужен `sw.js` на том же домене, что и сайт. Скрипт с GitHub Pages не может зарегистрировать service worker для домена `criomedical-clinic.ru`, это ограничение браузеров.
# criomedical-clinic
