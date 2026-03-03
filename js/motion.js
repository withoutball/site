/**
 * WithoutBall — Motion / Animation
 * GSAP/ScrollTrigger reveals, counter animation, 3D tilt cards, magnetic buttons.
 */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    (function initMotionWhenReady() {
        var started = false;

        function initMotion() {
            if (started) return;
            started = true;

            var gsap = window.gsap;
            var ScrollTrigger = window.ScrollTrigger;
            var canAnimate = !!(gsap && ScrollTrigger && !reduceMotion);

            if (canAnimate) {
                try {
                    gsap.set('.reveal-hero', { opacity: 0 });
                    gsap.set('.reveal', { opacity: 0, y: 40 });
                } catch (e) {}
            }

            if (gsap && ScrollTrigger) {
                try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}
                window.addEventListener('wb:lang', function () {
                    requestAnimationFrame(function () { requestAnimationFrame(function () {
                        try { ScrollTrigger.refresh(); } catch (e) {}
                    }); });
                }, { passive: true });

                var stRefreshTimer = null;
                window.addEventListener('resize', function () {
                    clearTimeout(stRefreshTimer);
                    stRefreshTimer = setTimeout(function () {
                        try { ScrollTrigger.refresh(); } catch (e) {}
                    }, 180);
                }, { passive: true });
            }

            /* Scroll progress bar */
            (function initScrollProgress() {
                var bar = document.getElementById('scrollProgress');
                if (!bar) return;
                if (gsap && ScrollTrigger && !reduceMotion) {
                    gsap.to(bar, {
                        scaleX: 1,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: document.body,
                            start: 'top top',
                            end: 'bottom bottom',
                            scrub: 0.3
                        }
                    });
                    return;
                }
                var update = function () {
                    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                    var p = Math.min(1, Math.max(0, window.scrollY / max));
                    bar.style.transformOrigin = 'left';
                    bar.style.transform = 'scaleX(' + p + ')';
                };
                update();
                window.addEventListener('scroll', update, { passive: true });
                window.addEventListener('resize', update, { passive: true });
            })();

            /* Hero entrance */
            if (canAnimate) {
                var heroTl = gsap.timeline({ delay: 0.3 });
                heroTl
                    .to('.reveal-hero', { opacity: 1, duration: 0.01 })
                    .from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' })
                    .from('.hero-title .line-inner', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.12 }, '-=0.4')
                    .from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' }, '-=0.5')
                    .from('.hero-chips .hero-chip', { opacity: 0, y: 14, duration: 0.7, ease: 'power3.out', stagger: 0.06 }, '-=0.55')
                    .from('.hero-buttons', { opacity: 0, y: 20, duration: 0.7, ease: 'power3.out' }, '-=0.4')
                    .from('.scroll-hint', { opacity: 0, duration: 1, ease: 'power2.out' }, '-=0.3');
            } else {
                document.querySelectorAll('.reveal-hero').forEach(function (el) {
                    el.style.opacity = '1';
                });
                document.querySelectorAll('.reveal').forEach(function (el) {
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                });
            }

            if (ScrollTrigger) {
                window.addEventListener('load', function () {
                    try { ScrollTrigger.refresh(); } catch (e) {}
                });
            }

            /* Scroll reveals */
            if (canAnimate) {
                gsap.utils.toArray('.reveal').forEach(function (el) {
                    if (el.closest('.founders-grid') ||
                        el.closest('.solutions-grid') || el.closest('.how-grid') ||
                        el.closest('.tech-grid') || el.closest('.cap-grid')) return;
                    ScrollTrigger.create({
                        trigger: el,
                        start: 'top 87%',
                        once: true,
                        onEnter: function () {
                            gsap.to(el, {
                                opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
                                onComplete: function () {
                                    el.style.removeProperty('opacity');
                                    el.style.removeProperty('transform');
                                    el.classList.remove('reveal');
                                }
                            });
                        }
                    });
                });
            }

            /* Stagger reveals */
            function staggerGroup(parent, stagger) {
                var container = document.querySelector(parent);
                if (!container) return;
                var items = container.querySelectorAll('.reveal');
                ScrollTrigger.create({
                    trigger: container,
                    start: 'top 87%',
                    once: true,
                    onEnter: function () {
                        gsap.to(items, {
                            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
                            stagger: stagger,
                            onComplete: function () {
                                this.targets().forEach(function (t) {
                                    t.style.removeProperty('opacity');
                                    t.style.removeProperty('transform');
                                    t.classList.remove('reveal');
                                });
                            }
                        });
                    }
                });
            }
            if (canAnimate) {
                staggerGroup('.founders-grid', 0.1);
                staggerGroup('.solutions-grid', 0.12);
                staggerGroup('.how-grid', 0.15);
                staggerGroup('.tech-grid', 0.1);
                staggerGroup('.cap-grid', 0.1);
            }

            /* Counter animation */
            document.querySelectorAll('[data-count]').forEach(function (el) {
                var target = parseFloat(el.dataset.count);
                var suffix = el.dataset.suffix || '';
                var isDecimal = String(target).indexOf('.') !== -1;
                if (!canAnimate) {
                    el.textContent = (isDecimal ? target.toFixed(1) : Math.round(target)) + suffix;
                    return;
                }
                ScrollTrigger.create({
                    trigger: el,
                    start: 'top 87%',
                    once: true,
                    onEnter: function () {
                        gsap.to({ val: 0 }, {
                            val: target,
                            duration: 2.2,
                            ease: 'power2.out',
                            onUpdate: function () {
                                var v = this.targets()[0].val;
                                el.textContent = (isDecimal ? v.toFixed(1) : Math.round(v)) + suffix;
                            }
                        });
                    }
                });
            });

            /* 3D tilt cards */
            if (canAnimate && window.matchMedia('(pointer: fine)').matches) {
                document.querySelectorAll('.audience-card, .tech-card, .founder-card').forEach(function (card) {
                    card.addEventListener('mouseenter', function () {
                        if (card.classList.contains('reveal')) return;
                        card.style.transition = 'border-color 0.4s, box-shadow 0.4s';
                    });
                    card.addEventListener('mousemove', function (e) {
                        if (card.classList.contains('reveal')) return;
                        var rect = card.getBoundingClientRect();
                        var x = (e.clientX - rect.left) / rect.width - 0.5;
                        var y = (e.clientY - rect.top) / rect.height - 0.5;
                        card.style.transform = 'perspective(800px) rotateY(' + (x * 5) + 'deg) rotateX(' + (-y * 5) + 'deg) translateY(-4px)';
                    });
                    card.addEventListener('mouseleave', function () {
                        if (card.classList.contains('reveal')) return;
                        card.style.transition = 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94), border-color 0.4s, box-shadow 0.4s';
                        card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px)';
                        setTimeout(function () { card.style.transition = ''; card.style.transform = ''; }, 520);
                    });
                });
            }

            /* Magnetic buttons */
            if (canAnimate && gsap && window.matchMedia('(pointer: fine)').matches) {
                document.querySelectorAll('.magnetic').forEach(function (btn) {
                    btn.addEventListener('mousemove', function (e) {
                        var rect = btn.getBoundingClientRect();
                        var x = e.clientX - rect.left - rect.width / 2;
                        var y = e.clientY - rect.top - rect.height / 2;
                        gsap.to(btn, { x: x * 0.15, y: y * 0.15, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
                    });
                    btn.addEventListener('mouseleave', function () {
                        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
                    });
                });
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMotion, { once: true });
        } else {
            initMotion();
        }
    })();
})();
