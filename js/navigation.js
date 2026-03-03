/**
 * WithoutBall — Navigation
 * Nav scroll state, mobile nav, smooth scroll for anchor links.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function readCssVar(name) {
        return getComputedStyle(root).getPropertyValue(name).trim();
    }

    /* ========== NAV SCROLL ========== */
    var nav = document.getElementById('nav');
    window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    /* ========== MOBILE NAV ========== */
    (function initMobileNav() {
        var menuBtn = document.getElementById('navMenuBtn');
        var menuPanel = document.getElementById('navMobilePanel');
        var menuOverlay = document.getElementById('navMobileOverlay');
        if (!menuBtn || !menuPanel || !menuOverlay) return;

        var desktopQuery = window.matchMedia('(min-width: 1101px)');

        function menuLabel(open) {
            var lang = root.dataset.lang || root.lang || 'en';
            return window.WB.translate(open ? 'nav.menu_close' : 'nav.menu_open', lang);
        }

        function setMenu(open) {
            if (desktopQuery.matches) open = false;
            menuPanel.dataset.open = open ? 'true' : 'false';
            menuOverlay.dataset.open = open ? 'true' : 'false';
            menuPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
            menuBtn.setAttribute('aria-expanded', String(open));
            menuBtn.setAttribute('aria-label', menuLabel(open));
            nav.classList.toggle('menu-open', open);
            document.body.classList.toggle('menu-open', open);
        }

        function closeMenu() { setMenu(false); }

        menuBtn.addEventListener('click', function () {
            setMenu(menuPanel.dataset.open !== 'true');
        });
        menuOverlay.addEventListener('click', closeMenu);
        menuPanel.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
        window.addEventListener('resize', function () {
            if (desktopQuery.matches) closeMenu();
        }, { passive: true });
        window.addEventListener('wb:lang', function () {
            var open = menuPanel.dataset.open === 'true';
            menuBtn.setAttribute('aria-label', menuLabel(open));
        }, { passive: true });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });

        setMenu(false);
    })();

    /* ========== SMOOTH SCROLL NAV LINKS ========== */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (!href || href === '#') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
                return;
            }
            try {
                var target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    var offset = (nav && nav.offsetHeight) ? nav.offsetHeight : (parseFloat(readCssVar('--nav-h')) || 72);
                    var y = target.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
                }
            } catch (err) {}
        });
    });
})();
