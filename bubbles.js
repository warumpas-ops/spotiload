/**
 * bubbles.js — Frutiger Aero Interactive Aquarium & Side-Eye Peeking Fish
 * Features:
 * 1. 12 3D liquid glass bubbles with mouse push physics
 * 2. 5 colorful organic S-wave fish (Orange, Cyan Blue, Emerald Green, Magenta, Sunshine Yellow)
 * 3. Normal Mode: Fish swim around freely, playing & fooling around
 * 4. Playlist Loaded Mode: Fish swim to left & right screen borders, peek from the sides, and give funny side-eyes!
 */

class LiquidBubble {
    constructor(canvasWidth, canvasHeight) {
        this.reset(canvasWidth, canvasHeight);
    }

    reset(w, h) {
        this.radius = Math.random() * 32 + 28; // 28px to 60px radius
        this.x = Math.random() * (w - this.radius * 2) + this.radius;
        this.y = Math.random() * (h - this.radius * 2) + this.radius;
        this.vx = (Math.random() - 0.5) * 1.4;
        this.vy = (Math.random() - 0.5) * 1.4;
        this.mass = this.radius;
        this.hue = Math.random() > 0.5 ? 165 : 195; // Emerald Green or Cyan
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.04 + 0.02;
    }

    update(w, h, mouse) {
        this.x += this.vx;
        this.y += this.vy;
        this.wobblePhase += this.wobbleSpeed;

        this.vx *= 0.985;
        this.vy *= 0.985;

        if (Math.abs(this.vx) < 0.15) this.vx += (Math.random() - 0.5) * 0.08;
        if (Math.abs(this.vy) < 0.15) this.vy += (Math.random() - 0.5) * 0.08;

        // Bounce off canvas boundaries
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -0.8;
        } else if (this.x + this.radius > w) {
            this.x = w - this.radius;
            this.vx *= -0.8;
        }

        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -0.8;
        } else if (this.y + this.radius > h) {
            this.y = h - this.radius;
            this.vy *= -0.8;
        }

        // Interactive Mouse Push
        if (mouse.x !== null && mouse.y !== null) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            const pushDist = this.radius + 120;

            if (dist < pushDist && dist > 0) {
                const force = (pushDist - dist) / pushDist;
                const angle = Math.atan2(dy, dx);
                const pushPower = force * 6.5;

                this.vx += Math.cos(angle) * pushPower;
                this.vy += Math.sin(angle) * pushPower;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const wobble = Math.sin(this.wobblePhase) * 0.04;
        ctx.scale(1 + wobble, 1 - wobble);

        ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 0.35)`;
        ctx.shadowBlur = 18;

        const grad = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
            0, 0, this.radius
        );
        grad.addColorStop(0, `hsla(0, 0%, 100%, 0.9)`);
        grad.addColorStop(0.3, `hsla(${this.hue}, 100%, 80%, 0.55)`);
        grad.addColorStop(0.7, `hsla(${this.hue + 15}, 90%, 45%, 0.35)`);
        grad.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0.75)`);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `hsla(0, 0%, 100%, 0.9)`;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(
            -this.radius * 0.3,
            -this.radius * 0.35,
            this.radius * 0.45,
            this.radius * 0.25,
            -Math.PI / 4,
            0,
            Math.PI * 2
        );
        const topGrad = ctx.createLinearGradient(-this.radius, -this.radius, 0, 0);
        topGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        topGrad.addColorStop(1, "rgba(255, 255, 255, 0.05)");
        ctx.fillStyle = topGrad;
        ctx.fill();

        ctx.restore();
    }
}

// Color Preset Themes for Frutiger Aero Tropical Fish
const FISH_THEMES = [
    // 1. Classic Orange Clownfish
    {
        shadow: "rgba(255, 100, 0, 0.55)",
        bodyStops: ["#FFFF77", "#FF9900", "#FF3300", "#CC0000"],
        tailStops: ["rgba(255, 50, 0, 0.95)", "rgba(255, 130, 0, 0.85)", "rgba(255, 200, 0, 0.7)"],
        dorsal: "rgba(255, 90, 0, 0.9)",
        stripe: "rgba(255, 255, 255, 0.95)",
    },
    // 2. Electric Cyan Blue Tang
    {
        shadow: "rgba(0, 200, 255, 0.6)",
        bodyStops: ["#88FFFF", "#00CCFF", "#0055FF", "#001199"],
        tailStops: ["rgba(255, 200, 0, 0.95)", "rgba(255, 150, 0, 0.85)", "rgba(0, 229, 255, 0.7)"],
        dorsal: "rgba(0, 180, 255, 0.9)",
        stripe: "rgba(0, 255, 204, 0.9)",
    },
    // 3. Lime Emerald Green Fish
    {
        shadow: "rgba(0, 255, 120, 0.55)",
        bodyStops: ["#CCFF99", "#00FF88", "#00B050", "#005522"],
        tailStops: ["rgba(0, 255, 204, 0.95)", "rgba(0, 200, 100, 0.85)", "rgba(255, 230, 0, 0.7)"],
        dorsal: "rgba(0, 230, 118, 0.9)",
        stripe: "rgba(255, 255, 255, 0.95)",
    },
    // 4. Magenta Violet Fairy Basslet
    {
        shadow: "rgba(255, 0, 150, 0.55)",
        bodyStops: ["#FFCCFF", "#FF00AA", "#9900CC", "#440066"],
        tailStops: ["rgba(255, 0, 128, 0.95)", "rgba(200, 0, 255, 0.85)", "rgba(255, 200, 0, 0.7)"],
        dorsal: "rgba(255, 0, 180, 0.9)",
        stripe: "rgba(255, 220, 255, 0.95)",
    },
    // 5. Sunshine Yellow Tang
    {
        shadow: "rgba(255, 200, 0, 0.6)",
        bodyStops: ["#FFFFFF", "#FFEE00", "#FF8800", "#DD4400"],
        tailStops: ["rgba(255, 100, 0, 0.95)", "rgba(255, 200, 0, 0.85)", "rgba(255, 255, 255, 0.7)"],
        dorsal: "rgba(255, 200, 0, 0.9)",
        stripe: "rgba(255, 255, 255, 0.95)",
    }
];

class OrganicWigglingFish {
    constructor(w, h, themeIndex = 0) {
        this.x = Math.random() * (w - 200) + 100;
        this.y = Math.random() * (h - 200) + 100;
        this.vx = (Math.random() - 0.5) * 3.2;
        if (Math.abs(this.vx) < 1.0) this.vx = 2.0;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.18 + Math.random() * 0.06;
        this.length = 38 + Math.random() * 12;
        this.themeIndex = themeIndex;
        this.theme = FISH_THEMES[themeIndex % FISH_THEMES.length];
        this.isPeeking = false;
        this.peekSide = themeIndex % 2 === 0 ? "left" : "right"; // Alternate sides
        this.peekRatioY = 0.18 + (themeIndex * 0.17); // Position along vertical border
    }

    update(w, h, bubbles, otherFishes, mouse, playlistActive) {
        this.isPeeking = playlistActive;
        const currentSpeed = Math.hypot(this.vx, this.vy);
        this.phase += this.speed * (currentSpeed / 2 + 0.5);

        if (this.isPeeking) {
            // PEEKING MODE: Swim to left or right screen border and peek inward
            const targetX = this.peekSide === "left" ? 45 : w - 45;
            const targetY = h * this.peekRatioY;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 15) {
                // Swim smoothly toward side peeking slot
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 4.2;
                this.vy = Math.sin(angle) * 4.2;
                this.x += this.vx;
                this.y += this.vy;
            } else {
                // Arrived at side border: hold position facing inward
                this.x = targetX;
                this.y = targetY;
                const facingAngle = this.peekSide === "left" ? 0 : Math.PI;
                this.vx = Math.cos(facingAngle) * 0.2;
                this.vy = Math.sin(facingAngle) * 0.2;
            }
            return;
        }

        // NORMAL FOOLING AROUND MODE: Free swimming & bouncing
        this.x += this.vx;
        this.y += this.vy;

        if (currentSpeed > 2.8) {
            this.vx *= 0.96;
            this.vy *= 0.96;
        }

        let turn = false;
        if (this.x - 50 < 0) {
            this.x = 50;
            this.vx = Math.abs(this.vx);
            turn = true;
        } else if (this.x + 50 > w) {
            this.x = w - 50;
            this.vx = -Math.abs(this.vx);
            turn = true;
        }

        if (this.y - 50 < 0) {
            this.y = 50;
            this.vy = Math.abs(this.vy);
            turn = true;
        } else if (this.y + 50 > h) {
            this.y = h - 50;
            this.vy = -Math.abs(this.vy);
            turn = true;
        }

        if (!turn && Math.random() < 0.015) {
            this.vy += (Math.random() - 0.5) * 1.2;
            this.vy = Math.max(-2, Math.min(2, this.vy));
        }

        // Bounce off liquid glass bubbles!
        for (let b of bubbles) {
            const dx = this.x - b.x;
            const dy = this.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.radius + this.length) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 3.2;
                this.vy = Math.sin(angle) * 3.2;
                b.vx -= Math.cos(angle) * 2.2;
                b.vy -= Math.sin(angle) * 2.2;
                break;
            }
        }

        // Mouse avoidance
        if (mouse.x !== null && mouse.y !== null) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 130 && dist > 0) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 5.0;
                this.vy = Math.sin(angle) * 5.0;
            }
        }

        // Touch finger avoidance (mobile) — fish flee from each active finger
        if (window._wfxTouches) {
            const touchPoints = Object.values(window._wfxTouches);
            for (const tp of touchPoints) {
                const dx = this.x - tp.x;
                const dy = this.y - tp.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 160 && dist > 0) {
                    const angle = Math.atan2(dy, dx);
                    const force = (160 - dist) / 160;
                    this.vx += Math.cos(angle) * 6.5 * force;
                    this.vy += Math.sin(angle) * 6.5 * force;
                    // Cap speed
                    const spd = Math.hypot(this.vx, this.vy);
                    if (spd > 8) {
                        this.vx = (this.vx / spd) * 8;
                        this.vy = (this.vy / spd) * 8;
                    }
                }
            }
        }
    }

    draw(ctx, mouse, w, h) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Keep fish 100% right-side up (top fin always on top, belly on bottom)
        let angle = Math.atan2(this.vy, this.vx);
        if (this.vx < 0) {
            ctx.scale(-1, 1);
            angle = Math.atan2(this.vy, -this.vx);
        }
        ctx.rotate(angle);

        // Soft Aqua Shadow Glow
        ctx.shadowColor = this.theme.shadow;
        ctx.shadowBlur = 18;

        const wave1 = Math.sin(this.phase) * (this.length * 0.11);
        const wave2 = Math.sin(this.phase - 0.8) * (this.length * 0.28);
        const wave3 = Math.sin(this.phase - 1.6) * (this.length * 0.48);

        // 1. Organic Translucent Tail Fin
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-this.length * 0.32, wave2);
        ctx.quadraticCurveTo(-this.length * 0.65 + wave2 * 0.5, -this.length * 0.32 + wave3, -this.length * 1.0, wave3 - this.length * 0.39);
        ctx.quadraticCurveTo(-this.length * 0.8 + wave3 * 0.5, wave3, -this.length * 1.0, wave3 + this.length * 0.39);
        ctx.quadraticCurveTo(-this.length * 0.65 + wave2 * 0.5, this.length * 0.32 + wave3, -this.length * 0.32, wave2);

        const tailGrad = ctx.createLinearGradient(-this.length * 1.0, 0, -this.length * 0.32, 0);
        tailGrad.addColorStop(0, this.theme.tailStops[0]);
        tailGrad.addColorStop(0.5, this.theme.tailStops[1]);
        tailGrad.addColorStop(1, this.theme.tailStops[2]);
        ctx.fillStyle = tailGrad;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-this.length * 0.32, wave2); ctx.lineTo(-this.length * 0.95, wave3 - this.length * 0.26);
        ctx.moveTo(-this.length * 0.32, wave2); ctx.lineTo(-this.length * 0.98, wave3);
        ctx.moveTo(-this.length * 0.32, wave2); ctx.lineTo(-this.length * 0.95, wave3 + this.length * 0.26);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 2. Dorsal Flowing Top Fin
        ctx.beginPath();
        ctx.moveTo(this.length * 0.32, -this.length * 0.3);
        ctx.quadraticCurveTo(0, -this.length * 0.7 + wave1 * 0.5, -this.length * 0.32, -this.length * 0.26 + wave2);
        ctx.quadraticCurveTo(0, -this.length * 0.22, this.length * 0.32, -this.length * 0.3);
        ctx.fillStyle = this.theme.dorsal;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        // 3. Smooth Organic Fish Body
        ctx.beginPath();
        ctx.moveTo(this.length * 0.78, 0);
        ctx.bezierCurveTo(this.length * 0.54, -this.length * 0.43, -this.length * 0.1, -this.length * 0.43 + wave1, -this.length * 0.32, wave2);
        ctx.bezierCurveTo(-this.length * 0.1, this.length * 0.43 + wave1, this.length * 0.54, this.length * 0.43, this.length * 0.78, 0);

        const bodyGrad = ctx.createRadialGradient(
            this.length * 0.32, -this.length * 0.1, 4,
            0, 0, this.length
        );
        bodyGrad.addColorStop(0, this.theme.bodyStops[0]);
        bodyGrad.addColorStop(0.35, this.theme.bodyStops[1]);
        bodyGrad.addColorStop(0.8, this.theme.bodyStops[2]);
        bodyGrad.addColorStop(1, this.theme.bodyStops[3]);

        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.stroke();

        // 4. White Stripes
        ctx.fillStyle = this.theme.stripe;
        ctx.beginPath();
        ctx.ellipse(this.length * 0.17, wave1 * 0.2, this.length * 0.11, this.length * 0.37, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(-this.length * 0.13, wave2 * 0.3, this.length * 0.09, this.length * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. Side Fin
        const finAngle = Math.sin(this.phase * 1.5) * 0.35;
        ctx.save();
        ctx.translate(this.length * 0.26, this.length * 0.13);
        ctx.rotate(0.4 + finAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.length * 0.22, this.length * 0.11, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.theme.dorsal;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.stroke();
        ctx.restore();

        // 6. Side-Eye Tracking Big Googly Eye
        ctx.shadowBlur = 0;
        const eyeX = this.length * 0.52;
        const eyeY = -this.length * 0.11;

        // Smooth Big Eye Expansion when touching side borders
        const targetEyeRadius = this.isPeeking ? 12.0 : 5.5;
        const targetPupilRadius = this.isPeeking ? 5.2 : 2.6;

        this.eyeRadius = this.eyeRadius || 5.5;
        this.pupilRadius = this.pupilRadius || 2.6;

        this.eyeRadius += (targetEyeRadius - this.eyeRadius) * 0.18;
        this.pupilRadius += (targetPupilRadius - this.pupilRadius) * 0.18;

        // White Sclera (Big Googly Eye Body)
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, this.eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.stroke();

        // Pupil shift for hilarious wide side-eyes
        let pupilOffsetX = 0;
        let pupilOffsetY = 0;

        if (this.isPeeking) {
            const targetX = mouse.x !== null ? mouse.x : w / 2;
            const targetY = mouse.y !== null ? mouse.y : h / 2;
            const worldEyeX = this.x + Math.cos(angle) * eyeX - Math.sin(angle) * eyeY;
            const worldEyeY = this.y + Math.sin(angle) * eyeX + Math.cos(angle) * eyeY;

            const pdx = targetX - worldEyeX;
            const pdy = targetY - worldEyeY;
            const pdist = Math.hypot(pdx, pdy);

            if (pdist > 0) {
                const eyeAngle = Math.atan2(pdy, pdx) - angle;
                const maxOffset = this.eyeRadius * 0.52;
                pupilOffsetX = Math.cos(eyeAngle) * maxOffset;
                pupilOffsetY = Math.sin(eyeAngle) * maxOffset;
            }
        }

        // Black Pupil
        ctx.beginPath();
        ctx.arc(eyeX + pupilOffsetX, eyeY + pupilOffsetY, this.pupilRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();

        // Eye Catchlight Sparkle Highlight
        ctx.beginPath();
        ctx.arc(eyeX + pupilOffsetX + 1.6, eyeY + pupilOffsetY - 1.6, this.pupilRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        // 7. Frutiger Glass Top Highlight
        ctx.beginPath();
        ctx.bezierCurveTo(this.length * 0.6, -this.length * 0.17, -this.length * 0.1, -this.length * 0.3, -this.length * 0.26, wave2 - 4);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
        ctx.stroke();

        ctx.restore();
    }
}

// Canvas Initialization
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.createElement("canvas");
    canvas.id = "bubble-canvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: null, y: null };

    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener("mouseleave", () => {
        mouse.x = null;
        mouse.y = null;
    });

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // 12 Crisp 3D Glass Bubbles
    const bubbles = Array.from({ length: 12 }, () => new LiquidBubble(width, height));
    // 5 Organic Frutiger Aquarium Fish
    const fishes = Array.from({ length: 5 }, (_, i) => new OrganicWigglingFish(width, height, i));

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Check if playlist section is currently active (not hidden)
        const playlistElem = document.getElementById("playlist-section");
        const isPlaylistLoaded = playlistElem && !playlistElem.classList.contains("hidden");

        // Update and draw bubbles
        for (let i = 0; i < bubbles.length; i++) {
            const b = bubbles[i];
            b.update(width, height, mouse);

            for (let j = i + 1; j < bubbles.length; j++) {
                const b2 = bubbles[j];
                const dx = b2.x - b.x;
                const dy = b2.y - b.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b.radius + b2.radius;

                if (dist < minDist && dist > 0) {
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    b.x -= nx * overlap * 0.5;
                    b.y -= ny * overlap * 0.5;
                    b2.x += nx * overlap * 0.5;
                    b2.y += ny * overlap * 0.5;

                    const kx = b.vx - b2.vx;
                    const ky = b.vy - b2.vy;
                    const p = 2 * (nx * kx + ny * ky) / (b.mass + b2.mass);

                    b.vx -= p * b2.mass * nx;
                    b.vy -= p * b2.mass * ny;
                    b2.vx += p * b.mass * nx;
                    b2.vy += p * b.mass * ny;
                }
            }

            b.draw(ctx);
        }

        // Update and draw fishes with Peeking + Side-Eye logic
        for (let fish of fishes) {
            fish.update(width, height, bubbles, fishes, mouse, isPlaylistLoaded);
            fish.draw(ctx, mouse, width, height);
        }

        requestAnimationFrame(animate);
    }

    animate();
});
