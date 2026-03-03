/**
 * WithoutBall — Main
 * App initialization: theme sync, card spotlight, locale hints.
 */
(function () {
    'use strict';

    var root = document.documentElement;

    function readCssVar(name) {
        return getComputedStyle(root).getPropertyValue(name).trim();
    }

    function storageGet(storage, key) {
        try { return storage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(storage, key, value) {
        try { storage.setItem(key, value); } catch (e) {}
    }

    /* ---- Theme-color meta sync ---- */
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
        var bg = readCssVar('--bg');
        if (bg) themeMeta.setAttribute('content', bg);
    }

    /* ---- Lightweight locale hints (runs once, cached in sessionStorage) ---- */
    if (!storageGet(sessionStorage, 'wb_country')) {
        try {
            var langTag = String(navigator.language || '');
            var region = (langTag.split('-')[1] || '').toUpperCase();
            if (region) storageSet(sessionStorage, 'wb_country', region);
            storageSet(sessionStorage, 'wb_city', '');
        } catch (e) {}
    }

    /* ---- Card Spotlight ---- */
    (function initCardSpotlight() {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        var cards = Array.from(document.querySelectorAll('.cap-card, .audience-card, .tech-card, .founder-card, .cta-box, .preview-window'));
        if (!cards.length) return;
        cards.forEach(function (c) { c.classList.add('card-spotlight'); });

        var rafId = null;
        var active = null;
        var last = null;

        function update() {
            rafId = null;
            if (!active || !last) return;
            var r = active.getBoundingClientRect();
            var x = Math.max(0, Math.min(r.width, last.clientX - r.left));
            var y = Math.max(0, Math.min(r.height, last.clientY - r.top));
            active.style.setProperty('--mx', x + 'px');
            active.style.setProperty('--my', y + 'px');
        }

        cards.forEach(function (card) {
            card.addEventListener('pointermove', function (e) {
                active = card;
                last = e;
                if (!rafId) rafId = requestAnimationFrame(update);
            });
            card.addEventListener('pointerleave', function () {
                if (active === card) active = null;
                card.style.removeProperty('--mx');
                card.style.removeProperty('--my');
            });
        });
    })();
})();
