/**
 * WithoutBall — Hero Canvas
 * Neural network / data constellation animation in the hero section.
 */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;

    function readCssVar(name) {
        return getComputedStyle(root).getPropertyValue(name).trim();
    }

    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w, h, mouse = { x: -999, y: -999 }, heroRafId = null, heroVisible = true, heroTime = 0;
    var ACCENT = readCssVar('--accent') || '#63FF4B';
    var VIOLET = readCssVar('--violet') || '#B455FF';
    var ACCENT_RGB = readCssVar('--accent-rgb') || '99,255,75';
    var VIOLET_RGB = readCssVar('--violet-rgb') || '180,85,255';
    var crowd = 1;

    function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
    function getCrowd() {
        var v = parseFloat(readCssVar('--hero-crowd'));
        if (!Number.isFinite(v)) return 1;
        return clamp(v, 0.5, 2);
    }
    function syncTokens() {
        ACCENT = readCssVar('--accent') || ACCENT;
        VIOLET = readCssVar('--violet') || VIOLET;
        ACCENT_RGB = readCssVar('--accent-rgb') || ACCENT_RGB;
        VIOLET_RGB = readCssVar('--violet-rgb') || VIOLET_RGB;
    }

    function targetCounts() {
        var area = Math.max(1, (w || window.innerWidth) * (h || window.innerHeight));
        var areaFactor = clamp(Math.sqrt(area / (900 * 700)), 0.85, 1.25);
        var baseNodes = 92;
        var baseParticles = 76;
        return {
            nodes: Math.round(clamp(baseNodes * crowd * areaFactor, 34, 150)),
            particles: Math.round(clamp(baseParticles * crowd * areaFactor, 18, 110))
        };
    }

    var labels = ['pose.xy', 'v=2.31', '\u03b8=42\u00b0', 'id:0x7F', 'fps:25', 'kp:17', 'lat:0.03', 'cls:0.97', 'trk:22'];
    var nodes = [];
    var particles = [];

    function spawnNode() {
        var hubChance = 0.18 * Math.min(1.25, crowd);
        var labelChance = 0.10 * Math.min(1.35, crowd);
        var isHub = Math.random() < hubChance;
        return {
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * (0.35 + 0.08 * crowd),
            vy: (Math.random() - 0.5) * (0.35 + 0.08 * crowd),
            r: isHub ? 3.5 : 1.8,
            isHub: isHub,
            role: Math.random() > 0.5 ? 'accent' : 'violet',
            label: Math.random() < labelChance ? labels[Math.floor(Math.random() * labels.length)] : null,
            pulsePhase: Math.random() * Math.PI * 2
        };
    }

    function spawnParticle() {
        return {
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * (1.6 + 0.5 * crowd),
            vy: (Math.random() - 0.5) * (1.6 + 0.5 * crowd),
            life: Math.random(),
            role: Math.random() > 0.5 ? 'accent' : 'violet'
        };
    }

    function syncDensity() {
        var t = targetCounts();
        while (nodes.length < t.nodes) nodes.push(spawnNode());
        while (nodes.length > t.nodes) nodes.pop();
        while (particles.length < t.particles) particles.push(spawnParticle());
        while (particles.length > t.particles) particles.pop();
    }

    var prevW = 0, prevH = 0;
    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var rect = canvas.parentElement.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (prevW > 0 && prevH > 0 && (Math.abs(prevW - w) > 2 || Math.abs(prevH - h) > 2)) {
            var sx = w / prevW;
            var sy = h / prevH;
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].x = clamp(nodes[i].x * sx, 0, w);
                nodes[i].y = clamp(nodes[i].y * sy, 0, h);
            }
            for (var j = 0; j < particles.length; j++) {
                particles[j].x = clamp(particles[j].x * sx, 0, w);
                particles[j].y = clamp(particles[j].y * sy, 0, h);
            }
        }
        prevW = w;
        prevH = h;

        syncTokens();
        crowd = getCrowd();
        syncDensity();
        drawHero(0);
    }
    resize();
    var heroResizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(heroResizeTimer);
        heroResizeTimer = setTimeout(resize, 150);
    });

    canvas.parentElement.addEventListener('mousemove', function (e) {
        var rect = canvas.parentElement.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    canvas.parentElement.addEventListener('mouseleave', function () { mouse.x = -999; mouse.y = -999; });

    var heroObs = new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible && !heroRafId) heroLoop();
    }, { threshold: 0.05 });
    heroObs.observe(canvas.parentElement);

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && heroVisible && !heroRafId && !reduceMotion) heroLoop();
    });

    function drawHexGrid() {
        var size = 40;
        var hh = size * Math.sqrt(3);
        ctx.strokeStyle = 'rgba(255,255,255,0.018)';
        ctx.lineWidth = 0.5;
        for (var row = -1; row < h / hh + 1; row++) {
            for (var col = -1; col < w / (size * 1.5) + 1; col++) {
                var cx = col * size * 1.5;
                var cy = row * hh + (col % 2 ? hh / 2 : 0);
                ctx.beginPath();
                for (var s = 0; s < 6; s++) {
                    var angle = Math.PI / 3 * s + Math.PI / 6;
                    var hx = cx + size * 0.5 * Math.cos(angle);
                    var hy = cy + size * 0.5 * Math.sin(angle);
                    s === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    function drawScanLine(t) {
        var scanY = ((t * 30) % (h + 60)) - 30;
        var grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, 'rgba(' + ACCENT_RGB + ',0.04)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 30, w, 60);
        ctx.strokeStyle = 'rgba(' + ACCENT_RGB + ',0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();

        var scanX = ((t * 18) % (w + 80)) - 40;
        var vGrad = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0);
        vGrad.addColorStop(0, 'transparent');
        vGrad.addColorStop(0.5, 'rgba(' + VIOLET_RGB + ',0.028)');
        vGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = vGrad;
        ctx.fillRect(scanX - 30, 0, 60, h);
    }

    function drawHero(timestamp) {
        heroTime = (timestamp || 0) * 0.001;
        ctx.clearRect(0, 0, w, h);
        drawHexGrid();
        drawScanLine(heroTime);

        var dustCount = Math.round(220 * crowd);
        for (var i = 0; i < dustCount; i++) {
            var fx = (i * 47.3) % w;
            var fy = (i * 91.7) % h;
            var drift = (heroTime * (0.12 + 0.06 * crowd) + i * 0.017);
            var x = fx + Math.sin(drift) * (3 + 2 * crowd);
            var y = fy + Math.cos(drift * 0.9) * (3 + 2 * crowd);
            var a = 0.012 + 0.010 * Math.min(1.3, crowd);
            ctx.fillStyle = (i % 3 === 0) ? ('rgba(' + ACCENT_RGB + ',' + a + ')') : ('rgba(255,255,255,' + (a * 0.55) + ')');
            ctx.fillRect(x, y, 1, 1);
        }

        for (var ii = 0; ii < nodes.length; ii++) {
            var na = nodes[ii];
            var dx = mouse.x - na.x;
            var dy = mouse.y - na.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 0) {
                na.vx += dx * 0.00005;
                na.vy += dy * 0.00005;
            }
            var speed = Math.sqrt(na.vx * na.vx + na.vy * na.vy);
            if (speed > 0.8) { na.vx *= 0.8 / speed; na.vy *= 0.8 / speed; }
            na.x += na.vx; na.y += na.vy;
            if (na.x < 0) { na.x = 0; na.vx = Math.abs(na.vx); }
            if (na.x > w) { na.x = w; na.vx = -Math.abs(na.vx); }
            if (na.y < 0) { na.y = 0; na.vy = Math.abs(na.vy); }
            if (na.y > h) { na.y = h; na.vy = -Math.abs(na.vy); }

            for (var j = ii + 1; j < nodes.length; j++) {
                var nb = nodes[j];
                var ddx = na.x - nb.x, ddy = na.y - nb.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                var linkDist = 150 + 18 * Math.min(1.2, crowd);
                if (d < linkDist) {
                    var alpha = (1 - d / linkDist) * (0.10 + 0.02 * Math.min(1.2, crowd));
                    ctx.strokeStyle = na.role === 'accent'
                        ? ('rgba(' + ACCENT_RGB + ',' + alpha + ')')
                        : ('rgba(' + VIOLET_RGB + ',' + alpha + ')');
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
                    ctx.stroke();
                }
            }
        }

        for (var k = 0; k < nodes.length; k++) {
            var n = nodes[k];
            var color = n.role === 'accent' ? ACCENT : VIOLET;
            if (n.isHub) {
                var pulse = 0.5 + 0.5 * Math.sin(heroTime * 1.5 + n.pulsePhase);
                var glowR = 16 + pulse * 8;
                var g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
                g.addColorStop(0, n.role === 'accent'
                    ? ('rgba(' + ACCENT_RGB + ',' + (0.12 + pulse * 0.06) + ')')
                    : ('rgba(' + VIOLET_RGB + ',' + (0.12 + pulse * 0.06) + ')'));
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = n.role === 'accent'
                    ? ('rgba(' + ACCENT_RGB + ',' + (0.06 * pulse) + ')')
                    : ('rgba(' + VIOLET_RGB + ',' + (0.06 * pulse) + ')');
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(n.x, n.y, glowR + 4, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = color;
            ctx.globalAlpha = n.isHub ? 0.9 : 0.5;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            if (n.label) {
                ctx.font = '9px "JetBrains Mono", monospace';
                ctx.fillStyle = n.role === 'accent' ? ('rgba(' + ACCENT_RGB + ',0.30)') : ('rgba(' + VIOLET_RGB + ',0.30)');
                ctx.fillText(n.label, n.x + 8, n.y - 6);
            }
        }

        for (var m = 0; m < particles.length; m++) {
            var p = particles[m];
            p.x += p.vx; p.y += p.vy; p.life -= 0.003;
            if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
                p.x = Math.random() * w; p.y = Math.random() * h;
                p.vx = (Math.random() - 0.5) * 2; p.vy = (Math.random() - 0.5) * 2;
                p.life = 1;
            }
            ctx.fillStyle = p.role === 'accent' ? ACCENT : VIOLET;
            ctx.globalAlpha = p.life * 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function heroLoop(ts) {
        if (!heroVisible || document.hidden || reduceMotion) { heroRafId = null; return; }
        drawHero(ts);
        heroRafId = requestAnimationFrame(heroLoop);
    }
    drawHero(0);
    if (!reduceMotion) heroLoop();
})();
