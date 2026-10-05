/**
 * water_effects.js — Frutiger Aero Water Ripple & Touch Effects
 * Features:
 * 1. Mouse/touch water ripple trail effect (glowing cyan droplets)
 * 2. Touch fish interaction on mobile (fish flee fingers)
 * 3. Multi-touch support with individual ripple per finger
 */

(function() {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'water-fx-canvas';
    canvas.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'width:100%',
        'height:100%',
        'pointer-events:none',
        'z-index:99998',
        'mix-blend-mode:screen'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    });

    // ── Ripple ───────────────────────────────────────────────────
    const ripples = [];

    class Ripple {
        constructor(x, y, isTouch) {
            this.x = x;
            this.y = y;
            this.r = 0;
            this.maxR = isTouch ? 90 : 60;
            this.alpha = 1;
            this.speed = isTouch ? 4 : 2.8;
            this.lineWidth = isTouch ? 3 : 1.8;
            this.hue = isTouch ? 172 : 192;
            this.dead = false;
        }
        update() {
            this.r += this.speed;
            this.alpha = 1 - (this.r / this.maxR);
            if (this.r >= this.maxR) this.dead = true;
        }
        draw(c) {
            c.save();
            c.beginPath();
            c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            c.strokeStyle = 'hsla(' + this.hue + ',100%,70%,' + (this.alpha * 0.85) + ')';
            c.lineWidth = this.lineWidth;
            c.shadowColor = 'hsla(' + this.hue + ',100%,60%,' + (this.alpha * 0.6) + ')';
            c.shadowBlur = 14;
            c.stroke();
            c.restore();
        }
    }

    // ── Water Drop Trail ─────────────────────────────────────────
    const drops = [];

    class Drop {
        constructor(x, y, isTouch) {
            this.x = x + (Math.random() - 0.5) * 14;
            this.y = y + (Math.random() - 0.5) * 14;
            this.vx = (Math.random() - 0.5) * 1.4;
            this.vy = (Math.random() - 0.5) * 1.4 - 0.6;
            this.r = Math.random() * (isTouch ? 5 : 3.5) + 1.5;
            this.alpha = 0.9;
            this.hue = 178 + Math.random() * 28;
            this.life = 0;
            this.maxLife = 20 + Math.random() * 22;
            this.dead = false;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.05;
            this.life++;
            this.alpha = (1 - this.life / this.maxLife) * 0.88;
            if (this.life >= this.maxLife) this.dead = true;
        }
        draw(c) {
            c.save();
            c.beginPath();
            c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            c.fillStyle = 'hsla(' + this.hue + ',100%,72%,' + this.alpha + ')';
            c.shadowColor = 'hsla(' + this.hue + ',100%,60%,' + (this.alpha * 0.9) + ')';
            c.shadowBlur = 10;
            c.fill();
            c.restore();
        }
    }

    // ── Mouse ────────────────────────────────────────────────────
    let lastX = -999, lastY = -999, travelDist = 0;
    const TRAIL_GAP = 38;

    document.addEventListener('mousemove', function(e) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        travelDist += Math.hypot(dx, dy);

        if (travelDist > TRAIL_GAP) {
            travelDist = 0;
            ripples.push(new Ripple(e.clientX, e.clientY, false));
            for (var i = 0; i < 3; i++) drops.push(new Drop(e.clientX, e.clientY, false));
        }

        lastX = e.clientX;
        lastY = e.clientY;
        window._wfxMouse = { x: e.clientX, y: e.clientY };
    });

    // ── Touch ────────────────────────────────────────────────────
    const touchPrev = {};
    window._wfxTouches = {};

    document.addEventListener('touchstart', function(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            touchPrev[t.identifier] = { x: t.clientX, y: t.clientY };
            window._wfxTouches[t.identifier] = { x: t.clientX, y: t.clientY };
            ripples.push(new Ripple(t.clientX, t.clientY, true));
            for (var j = 0; j < 6; j++) drops.push(new Drop(t.clientX, t.clientY, true));
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            var prev = touchPrev[t.identifier];
            if (prev) {
                var dist = Math.hypot(t.clientX - prev.x, t.clientY - prev.y);
                if (dist > 10) {
                    touchPrev[t.identifier] = { x: t.clientX, y: t.clientY };
                    window._wfxTouches[t.identifier] = { x: t.clientX, y: t.clientY };
                    ripples.push(new Ripple(t.clientX, t.clientY, true));
                    for (var j = 0; j < 4; j++) drops.push(new Drop(t.clientX, t.clientY, true));
                }
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            var id = e.changedTouches[i].identifier;
            delete touchPrev[id];
            delete window._wfxTouches[id];
        }
    }, { passive: true });

    // ── Animate ──────────────────────────────────────────────────
    function animate() {
        ctx.clearRect(0, 0, W, H);

        for (var i = drops.length - 1; i >= 0; i--) {
            drops[i].update();
            drops[i].draw(ctx);
            if (drops[i].dead) drops.splice(i, 1);
        }

        for (var i = ripples.length - 1; i >= 0; i--) {
            ripples[i].update();
            ripples[i].draw(ctx);
            if (ripples[i].dead) ripples.splice(i, 1);
        }

        requestAnimationFrame(animate);
    }

    animate();

    window._wfxMouse = { x: -999, y: -999 };

})();
