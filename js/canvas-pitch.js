/**
 * WithoutBall — Pitch Canvas
 * Interactive football pitch visualization with skeleton, space, and predict modes.
 */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;

    function readCssVar(name) {
        return getComputedStyle(root).getPropertyValue(name).trim();
    }

    var canvas = document.getElementById('pitch-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w, h, frame = 0, pitchRafId = null, pitchVisible = false;
    var pitchMode = 'skeleton';
    var pitchReady = false;
    var ACCENT = readCssVar('--accent') || '#63FF4B';
    var VIOLET = readCssVar('--violet') || '#B455FF';
    var ACCENT_RGB = readCssVar('--accent-rgb') || '99,255,75';
    var VIOLET_RGB = readCssVar('--violet-rgb') || '180,85,255';

    /* Mode UI */
    (function initPreviewModes() {
        var btns = Array.from(document.querySelectorAll('.preview-mode-btn[data-mode]'));
        if (!btns.length) return;
        function setMode(next) {
            pitchMode = next;
            for (var i = 0; i < btns.length; i++) {
                var on = btns[i].dataset.mode === next;
                btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
            }
            if (pitchReady) {
                try { animate(performance.now()); } catch (e) {}
                if (!reduceMotion && pitchVisible && !pitchRafId) pitchLoop();
            }
        }
        btns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
        var active = btns.find(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
        setMode(active ? active.dataset.mode : btns[0].dataset.mode);
    })();

    function resize() {
        var rect = canvas.parentElement.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = rect.width;
        h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    var pitchResizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(pitchResizeTimer);
        pitchResizeTimer = setTimeout(resize, 150);
    });

    var pitchObs = new IntersectionObserver(function (entries) {
        pitchVisible = entries[0].isIntersecting;
        if (pitchVisible && !pitchRafId) pitchLoop();
    }, { threshold: 0.05 });
    pitchObs.observe(canvas);

    var teamA = [
        { bx: 0.06, by: 0.5 },
        { bx: 0.18, by: 0.15 }, { bx: 0.18, by: 0.38 }, { bx: 0.18, by: 0.62 }, { bx: 0.18, by: 0.85 },
        { bx: 0.32, by: 0.25 }, { bx: 0.32, by: 0.5 }, { bx: 0.32, by: 0.75 },
        { bx: 0.42, by: 0.2 }, { bx: 0.42, by: 0.5 }, { bx: 0.42, by: 0.8 }
    ];
    var teamB = [
        { bx: 0.94, by: 0.5 },
        { bx: 0.82, by: 0.15 }, { bx: 0.82, by: 0.38 }, { bx: 0.82, by: 0.62 }, { bx: 0.82, by: 0.85 },
        { bx: 0.68, by: 0.25 }, { bx: 0.68, by: 0.5 }, { bx: 0.68, by: 0.75 },
        { bx: 0.58, by: 0.2 }, { bx: 0.58, by: 0.5 }, { bx: 0.58, by: 0.8 }
    ];

    function makePlayers(bases, color) {
        return bases.map(function (b) {
            return {
                x: b.bx, y: b.by, bx: b.bx, by: b.by, vx: 0, vy: 0,
                color: color,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.4,
                ampX: 0.01 + Math.random() * 0.02,
                ampY: 0.01 + Math.random() * 0.02,
                trail: [],
                limbPhase: Math.random() * Math.PI * 2
            };
        });
    }

    var playersA = makePlayers(teamA, ACCENT);
    var playersB = makePlayers(teamB, VIOLET);
    var allPlayers = playersA.concat(playersB);
    pitchReady = true;

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && pitchVisible && !pitchRafId && !reduceMotion) pitchLoop();
    });

    function drawPitch(t) {
        ctx.fillStyle = '#080D14';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 0.5;
        var gridSize = 30;
        for (var x = 0; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (var y = 0; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        var lc = 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = lc;
        ctx.lineWidth = 1;

        var m = { l: w * 0.03, r: w * 0.97, t: h * 0.05, b: h * 0.95 };
        var pw = m.r - m.l, ph = m.b - m.t;
        var cx = (m.l + m.r) / 2, cy = (m.t + m.b) / 2;

        ctx.strokeRect(m.l, m.t, pw, ph);
        ctx.beginPath(); ctx.moveTo(cx, m.t); ctx.lineTo(cx, m.b); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, ph * 0.18, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = lc;
        ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();

        var paW = pw * 0.13, paH = ph * 0.55;
        ctx.strokeRect(m.l, cy - paH / 2, paW, paH);
        ctx.strokeRect(m.r - paW, cy - paH / 2, paW, paH);

        var gaW = pw * 0.05, gaH = ph * 0.28;
        ctx.strokeRect(m.l, cy - gaH / 2, gaW, gaH);
        ctx.strokeRect(m.r - gaW, cy - gaH / 2, gaW, gaH);

        var scanX = ((t * 40) % (w + 80)) - 40;
        var scanGrad = ctx.createLinearGradient(scanX - 40, 0, scanX + 40, 0);
        scanGrad.addColorStop(0, 'transparent');
        scanGrad.addColorStop(0.5, 'rgba(' + ACCENT_RGB + ',0.03)');
        scanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(scanX - 40, 0, 80, h);
        ctx.strokeStyle = 'rgba(' + ACCENT_RGB + ',0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(scanX, 0); ctx.lineTo(scanX, h); ctx.stroke();
    }

    function targetAt(p, t) {
        return {
            x: p.bx + Math.sin(t * p.speed + p.phase) * p.ampX,
            y: p.by + Math.cos(t * p.speed * 0.7 + p.phase + 1) * p.ampY
        };
    }

    function drawInfluenceZones() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < allPlayers.length; i++) {
            var p = allPlayers[i];
            var sx = p.x * w, sy = p.y * h;
            var r = 92;
            var grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
            if (p.color === ACCENT) {
                grad.addColorStop(0, 'rgba(' + ACCENT_RGB + ',0.08)');
            } else {
                grad.addColorStop(0, 'rgba(' + VIOLET_RGB + ',0.08)');
            }
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function drawPredictions(t) {
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        for (var i = 0; i < allPlayers.length; i++) {
            var p = allPlayers[i];
            var startX = p.x * w, startY = p.y * h;
            ctx.strokeStyle = p.color === ACCENT ? ('rgba(' + ACCENT_RGB + ',0.22)') : ('rgba(' + VIOLET_RGB + ',0.22)');
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            for (var j = 1; j <= 6; j++) {
                var tt = t + j * 0.18;
                var nxt = targetAt(p, tt);
                ctx.lineTo(nxt.x * w, nxt.y * h);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    function drawPlayer(p, t, simplified) {
        var sx = p.x * w, sy = p.y * h;

        p.trail.push({ x: sx, y: sy });
        if (p.trail.length > 20) p.trail.shift();
        if (p.trail.length > 1) {
            ctx.strokeStyle = p.color === ACCENT ? ('rgba(' + ACCENT_RGB + ',0.08)') : ('rgba(' + VIOLET_RGB + ',0.08)');
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (var i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
            ctx.stroke();
        }

        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
        glow.addColorStop(0, p.color === ACCENT ? ('rgba(' + ACCENT_RGB + ',0.06)') : ('rgba(' + VIOLET_RGB + ',0.06)'));
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sx, sy, 28, 0, Math.PI * 2); ctx.fill();

        if (simplified) {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            return;
        }

        var lp = p.limbPhase + t * 3;
        var headY = sy - 10, torsoBot = sy + 4;
        var armSwing = Math.sin(lp) * 4, legSwing = Math.sin(lp) * 5;

        ctx.strokeStyle = p.color === ACCENT ? ('rgba(' + ACCENT_RGB + ',0.55)') : ('rgba(' + VIOLET_RGB + ',0.55)');
        ctx.lineWidth = 1.4;

        ctx.beginPath(); ctx.arc(sx, headY, 3, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, headY + 3); ctx.lineTo(sx, torsoBot); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 6 - armSwing, sy - 1); ctx.lineTo(sx, sy - 5); ctx.lineTo(sx + 6 + armSwing, sy - 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 4 + legSwing, sy + 12); ctx.lineTo(sx, torsoBot); ctx.lineTo(sx + 4 - legSwing, sy + 12);
        ctx.stroke();

        ctx.fillStyle = p.color;
        var keypoints = [
            [sx, headY], [sx, sy - 5], [sx, torsoBot],
            [sx - 6 - armSwing, sy - 1], [sx + 6 + armSwing, sy - 1],
            [sx - 4 + legSwing, sy + 12], [sx + 4 - legSwing, sy + 12]
        ];
        for (var k = 0; k < keypoints.length; k++) {
            ctx.beginPath(); ctx.arc(keypoints[k][0], keypoints[k][1], 2, 0, Math.PI * 2); ctx.fill();
        }

        if (Math.abs(p.vx) + Math.abs(p.vy) > 0.0001) {
            var vLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            var vnx = p.vx / vLen, vny = p.vy / vLen;
            var arrowLen = 18;
            ctx.strokeStyle = p.color === ACCENT ? ('rgba(' + ACCENT_RGB + ',0.3)') : ('rgba(' + VIOLET_RGB + ',0.3)');
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + vnx * arrowLen, sy + vny * arrowLen); ctx.stroke();
            var ax = sx + vnx * arrowLen, ay = sy + vny * arrowLen;
            var aAngle = Math.atan2(vny, vnx);
            ctx.beginPath();
            ctx.moveTo(ax, ay); ctx.lineTo(ax - 5 * Math.cos(aAngle - 0.4), ay - 5 * Math.sin(aAngle - 0.4));
            ctx.moveTo(ax, ay); ctx.lineTo(ax - 5 * Math.cos(aAngle + 0.4), ay - 5 * Math.sin(aAngle + 0.4));
            ctx.stroke();
        }
    }

    function drawConnections(team) {
        for (var i = 0; i < team.length; i++) {
            for (var j = i + 1; j < team.length; j++) {
                var a = team[i], b = team[j];
                var dx = (a.x - b.x) * w, dy = (a.y - b.y) * h;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 130) {
                    var alpha = (1 - d / 130) * 0.06;
                    ctx.strokeStyle = a.color === ACCENT
                        ? ('rgba(' + ACCENT_RGB + ',' + alpha + ')')
                        : ('rgba(' + VIOLET_RGB + ',' + alpha + ')');
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h);
                    ctx.stroke();
                }
            }
        }
    }

    function drawHUD(time) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(' + ACCENT_RGB + ',0.4)';
        var f = Math.floor(time * 25) % 10000;
        ctx.fillText('FRM: ' + String(f).padStart(5, '0'), 12, h - 14);
        ctx.fillStyle = 'rgba(226,232,240,0.25)';
        ctx.fillText('TRK: 22/22  |  KP: 374  |  LAT: 0.031s', 100, h - 14);
        ctx.fillStyle = 'rgba(' + ACCENT_RGB + ',0.5)';
        var lang = root.lang || 'en';
        var locale = lang === 'tr' ? 'tr-TR' : (lang === 'de' ? 'de-DE' : 'en-US');
        var modeKey = pitchMode === 'space' ? 'preview.mode_space' : (pitchMode === 'predict' ? 'preview.mode_predict' : 'preview.mode_skeleton');
        var modeLabel = String(window.WB.translate(modeKey, lang) || (pitchMode || 'skeleton')).toLocaleUpperCase(locale);
        ctx.fillText('\u25cf ' + modeLabel, w - 110, h - 14);
    }

    function animate(ts) {
        var t = (ts || 0) * 0.001;
        frame++;
        drawPitch(t);

        for (var i = 0; i < allPlayers.length; i++) {
            var p = allPlayers[i];
            var next = targetAt(p, t);
            p.vx = (next.x - p.x) * 0.05;
            p.vy = (next.y - p.y) * 0.05;
            p.x += p.vx;
            p.y += p.vy;
        }

        if (pitchMode === 'space') {
            drawInfluenceZones();
            for (var j = 0; j < allPlayers.length; j++) drawPlayer(allPlayers[j], t, true);
        } else {
            if (pitchMode === 'predict') drawPredictions(t);
            drawConnections(playersA);
            drawConnections(playersB);
            for (var k = 0; k < allPlayers.length; k++) drawPlayer(allPlayers[k], t, false);
        }
        drawHUD(t);
    }

    function pitchLoop(ts) {
        if (!pitchVisible || document.hidden || reduceMotion) { pitchRafId = null; return; }
        animate(ts);
        pitchRafId = requestAnimationFrame(pitchLoop);
    }
    animate(0);
    if (!reduceMotion) pitchLoop();
})();
