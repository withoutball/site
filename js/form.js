/**
 * WithoutBall — CTA Form
 * Waitlist signup with typo detection, throttling, and honeypot.
 */
(function () {
    'use strict';

    var root = document.documentElement;

    function storageGet(storage, key) {
        try { return storage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(storage, key, value) {
        try { storage.setItem(key, value); } catch (e) {}
    }

    var WAITLIST_URL = 'https://script.google.com/macros/s/AKfycbxOhk4TaUJsavnkOuucuDTB-uw_Z4UbnDzQoial5fKG9NMlR1j2NeHX6Cg_K1awCPOT/exec';
    var THROTTLE_MS = 30000;

    var form = document.getElementById('ctaForm');
    var msg = document.getElementById('ctaMsg');
    if (!form || !msg) return;
    var btn = form.querySelector('.cta-submit');
    var input = form.querySelector('.cta-input');
    if (!btn || !input) return;
    var pageLoadTime = Date.now();
    var typoConfirmed = false;

    /* ---- Known valid providers (fuzzy-match targets) ---- */
    var VALID_DOMAINS = [
        'gmail.com', 'googlemail.com',
        'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
        'yahoo.com', 'ymail.com',
        'icloud.com', 'me.com', 'mac.com',
        'aol.com',
        'protonmail.com', 'proton.me', 'pm.me',
        'zoho.com', 'zohomail.com',
        'mail.com', 'email.com',
        'gmx.com', 'gmx.net',
        'yandex.com', 'yandex.ru',
        'fastmail.com',
        'tutanota.com', 'tuta.io',
        'hey.com',
        'web.de', 'freenet.de', 't-online.de'
    ];

    /* ---- Static typo map (high-confidence misspellings) ---- */
    var TYPO_MAP = {
        // Gmail
        'gmial.com':'gmail.com', 'gmal.com':'gmail.com', 'gmaul.com':'gmail.com',
        'gnail.com':'gmail.com', 'gmali.com':'gmail.com', 'gmill.com':'gmail.com',
        'gamil.com':'gmail.com', 'gmai.com':'gmail.com', 'gmaill.com':'gmail.com',
        'gmaiil.com':'gmail.com', 'ggmail.com':'gmail.com', 'gamail.com':'gmail.com',
        'gmeil.com':'gmail.com', 'gmaio.com':'gmail.com', 'gmaik.com':'gmail.com',
        'gemail.com':'gmail.com', 'gimail.com':'gmail.com',
        // Outlook
        'outloook.com':'outlook.com', 'outlok.com':'outlook.com', 'outllok.com':'outlook.com',
        'otlook.com':'outlook.com', 'outloo.com':'outlook.com', 'ourlook.com':'outlook.com',
        'outlool.com':'outlook.com', 'oultook.com':'outlook.com', 'outlouk.com':'outlook.com',
        // Hotmail
        'hotmal.com':'hotmail.com', 'hotmial.com':'hotmail.com', 'hotmai.com':'hotmail.com',
        'hotamil.com':'hotmail.com', 'hotmaill.com':'hotmail.com', 'hotmali.com':'hotmail.com',
        'hotmaik.com':'hotmail.com', 'hormail.com':'hotmail.com', 'hitmail.com':'hotmail.com',
        'hotmeil.com':'hotmail.com', 'htomail.com':'hotmail.com', 'hotmsil.com':'hotmail.com',
        // Yahoo
        'yahooo.com':'yahoo.com', 'yaho.com':'yahoo.com', 'yahho.com':'yahoo.com',
        'yaoo.com':'yahoo.com', 'yhaoo.com':'yahoo.com', 'yaboo.com':'yahoo.com',
        'tahoo.com':'yahoo.com', 'yshoo.com':'yahoo.com',
        // iCloud
        'iclod.com':'icloud.com', 'icoud.com':'icloud.com', 'iclould.com':'icloud.com',
        'iclou.com':'icloud.com', 'icolud.com':'icloud.com',
        // AOL
        'aool.com':'aol.com', 'aoll.com':'aol.com',
        // Protonmail
        'protonmal.com':'protonmail.com', 'protonmial.com':'protonmail.com',
        'protonmai.com':'protonmail.com', 'protonmali.com':'protonmail.com',
        'protonail.com':'protonmail.com', 'protonmeil.com':'protonmail.com',
        // Yandex
        'yandx.com':'yandex.com', 'yanex.com':'yandex.com', 'yndex.com':'yandex.com',
        'yandex.co':'yandex.com'
    };

    /* ---- Common TLD typos ---- */
    var TLD_FIXES = {
        'con':'com', 'vom':'com', 'cmo':'com', 'ocm':'com', 'xom':'com',
        'cpm':'com', 'cm':'com', 'om':'com', 'comm':'com', 'coom':'com',
        'ner':'net', 'nte':'net', 'met':'net', 'ne':'net',
        'ogr':'org', 'rog':'org',
        'oi':'io', 'uo':'io'
    };

    /* ---- Levenshtein distance (bounded, exits early if > max) ---- */
    function editDistance(a, b, max) {
        if (Math.abs(a.length - b.length) > max) return max + 1;
        var prev = [], curr = [], i, j;
        for (j = 0; j <= b.length; j++) prev[j] = j;
        for (i = 1; i <= a.length; i++) {
            curr[0] = i;
            var rowMin = i;
            for (j = 1; j <= b.length; j++) {
                var cost = a[i - 1] === b[j - 1] ? 0 : 1;
                curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
                if (curr[j] < rowMin) rowMin = curr[j];
            }
            if (rowMin > max) return max + 1;
            var tmp = prev; prev = curr; curr = tmp;
        }
        return prev[b.length];
    }

    function checkTypo(email) {
        var parts = email.split('@');
        if (parts.length !== 2 || !parts[1]) return null;
        var domain = parts[1].toLowerCase();

        /* 1. Exact static map match */
        if (TYPO_MAP[domain]) return TYPO_MAP[domain];

        /* 2. Already a known valid domain — no suggestion needed */
        if (VALID_DOMAINS.indexOf(domain) !== -1) return null;

        /* 3. Generic TLD correction (e.g. gmail.con → gmail.com) */
        var dot = domain.lastIndexOf('.');
        if (dot > 0) {
            var name = domain.slice(0, dot);
            var tld = domain.slice(dot + 1);
            var fixedTld = TLD_FIXES[tld];
            if (fixedTld) {
                var fixed = name + '.' + fixedTld;
                if (VALID_DOMAINS.indexOf(fixed) !== -1) return fixed;
            }
        }

        /* 4. Missing dot (e.g. "gmailcom" → "gmail.com") */
        if (domain.indexOf('.') === -1) {
            for (var i = 0; i < VALID_DOMAINS.length; i++) {
                if (domain === VALID_DOMAINS[i].replace('.', '')) return VALID_DOMAINS[i];
            }
        }

        /* 5. Fuzzy match via Levenshtein (max distance 2) */
        var best = null, bestDist = 3;
        for (var i = 0; i < VALID_DOMAINS.length; i++) {
            var d = editDistance(domain, VALID_DOMAINS[i], 2);
            if (d < bestDist) { bestDist = d; best = VALID_DOMAINS[i]; }
        }
        return best;
    }

    function showMsg(key, type) {
        var lang = root.lang || 'en';
        msg.textContent = window.WB.translate(key, lang);
        msg.className = 'cta-msg ' + type;
        requestAnimationFrame(function () { msg.classList.add('visible'); });
    }
    function showMsgText(text, type) {
        msg.textContent = text;
        msg.className = 'cta-msg ' + type;
        requestAnimationFrame(function () { msg.classList.add('visible'); });
    }
    function hideMsg() {
        msg.classList.remove('visible');
    }
    function setLoading(on) {
        btn.disabled = on;
        input.disabled = on;
        if (on) {
            btn.innerHTML = '<span class="cta-spinner"></span>';
        } else {
            btn.textContent = window.WB.translate('cta.submit', root.lang || 'en');
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var hp = form.querySelector('[name="website"]');
        if (hp && hp.value) return;
        hideMsg();
        var email = input.value.trim();
        var fix = checkTypo(email);
        if (fix && !typoConfirmed) {
            var lang = root.lang || 'en';
            var suggested = email.replace(/@.+$/, '@' + fix);
            var typoText = window.WB.translate('cta.typo', lang).replace('{email}', suggested);
            showMsgText(typoText, 'error');
            typoConfirmed = true;
            return;
        }
        typoConfirmed = false;
        var last = parseInt(storageGet(localStorage, 'wb_wl_ts') || '0', 10);
        if (Date.now() - last < THROTTLE_MS) {
            showMsg('cta.throttle', 'error');
            return;
        }
        setLoading(true);
        storageSet(localStorage, 'wb_wl_ts', String(Date.now()));
        var params = new URLSearchParams();
        params.set('email', email);
        params.set('lang', root.lang || 'en');
        params.set('referrer', document.referrer || '');
        params.set('screen', screen.width + 'x' + screen.height);
        try { params.set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone); } catch(err) {}
        params.set('locale', navigator.language || '');
        params.set('time_on_page', Math.round((Date.now() - pageLoadTime) / 1000) + 's');
        var uad = navigator.userAgentData;
        params.set('platform', (uad && uad.platform) || navigator.platform || '');
        var browser = '';
        if (uad && uad.brands && uad.brands.length) {
            browser = uad.brands.map(function (b) { return b.brand; }).filter(function (b) { return b.indexOf('Not') === -1; }).join(', ');
        } else {
            var ua = navigator.userAgent || '';
            if (ua.indexOf('Firefox/') > -1) browser = 'Firefox';
            else if (ua.indexOf('Safari/') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
            else if (ua.indexOf('Chrome/') > -1) browser = 'Chrome';
            else if (ua.indexOf('Edg/') > -1) browser = 'Edge';
        }
        params.set('browser', browser);
        params.set('page', location.pathname + location.search);
        var sp = new URLSearchParams(location.search);
        ['utm_source','utm_medium','utm_campaign'].forEach(function (k) {
            if (sp.get(k)) params.set(k, sp.get(k));
        });
        params.set('country', storageGet(sessionStorage, 'wb_country') || '');
        params.set('city', storageGet(sessionStorage, 'wb_city') || '');
        fetch(WAITLIST_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        }).then(function () {
            setLoading(false);
            input.value = '';
            form.style.opacity = '0.5';
            form.style.pointerEvents = 'none';
            showMsg('cta.success', 'success');
        }).catch(function () {
            setLoading(false);
            showMsg('cta.error', 'error');
        });
    });
    input.addEventListener('input', function () {
        if (typoConfirmed) { typoConfirmed = false; hideMsg(); }
    });
})();
