/**
 * bubbles.js — Bikini Bottom SpongeBob Undersea World + Frutiger Aero Interactive Aquarium
 * Features:
 * 1. SpongeBob 5-Petal Flower Clouds drifting and rotating in the background (Pink, Purple, Blue, Lime, Orange, Aqua)
 * 2. Swaying Multi-Layered Algae / Sea Kelp Forest rising from the bottom with fluid ocean current physics
 * 3. SpongeBob Cartoon Rising Bubbles with glossy highlights and side-to-side wobble
 * 4. 12 3D Liquid Glass Bubbles with mouse push physics
 * 5. 5 Organic Tropical Aquarium Fish with swimming and peeking side-eye behaviors
 */

// --- 1. SpongeBob 5-Petal Flower Clouds (Bikini Bottom Sky/Sea Flowers) ---
const FLOWER_PALETTES = [
    // Pink
    { fill: "rgba(255, 112, 184, 0.55)", stroke: "rgba(255, 60, 150, 0.9)", ring: "rgba(255, 60, 150, 0.9)" },
    // Lavender Purple
    { fill: "rgba(180, 95, 250, 0.55)", stroke: "rgba(147, 51, 234, 0.9)", ring: "rgba(147, 51, 234, 0.9)" },
    // Royal Blue
    { fill: "rgba(59, 130, 246, 0.55)", stroke: "rgba(30, 64, 175, 0.9)", ring: "rgba(30, 64, 175, 0.9)" },
    // Lime Chartreuse
    { fill: "rgba(132, 204, 22, 0.55)", stroke: "rgba(77, 124, 15, 0.9)", ring: "rgba(77, 124, 15, 0.9)" },
    // Tangerine Orange
    { fill: "rgba(251, 146, 60, 0.55)", stroke: "rgba(217, 70, 0, 0.9)", ring: "rgba(217, 70, 0, 0.9)" },
    // Tropical Aqua Cyan
    { fill: "rgba(6, 182, 212, 0.55)", stroke: "rgba(8, 145, 178, 0.9)", ring: "rgba(8, 145, 178, 0.9)" },
    // Sunny Yellow
    { fill: "rgba(250, 204, 21, 0.55)", stroke: "rgba(202, 138, 4, 0.9)", ring: "rgba(202, 138, 4, 0.9)" }
];

class SpongeBobFlower {
    constructor(w, h, initial = false) {
        this.reset(w, h, initial);
    }

    reset(w, h, initial = false) {
        this.radius = Math.random() * 45 + 38; // Radius of petals (38px to 83px)
        this.innerRadius = this.radius * 0.35;
        this.x = initial ? Math.random() * w : (Math.random() > 0.5 ? -this.radius * 2 : w + this.radius * 2);
        this.y = Math.random() * (h * 0.85) + 30;
        this.vx = (Math.random() * 0.25 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
        this.vy = (Math.random() - 0.5) * 0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.003;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.bobSpeed = Math.random() * 0.02 + 0.01;
        this.bobAmp = Math.random() * 12 + 8;
        this.palette = FLOWER_PALETTES[Math.floor(Math.random() * FLOWER_PALETTES.length)];
        this.scale = Math.random() * 0.4 + 0.8;
    }

    update(w, h) {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotSpeed;
        this.bobPhase += this.bobSpeed;

        // Wrap around screen edges
        if (this.x < -this.radius * 3) this.x = w + this.radius * 2;
        if (this.x > w + this.radius * 3) this.x = -this.radius * 2;
        if (this.y < -this.radius * 2) this.y = h + this.radius;
        if (this.y > h + this.radius * 2) this.y = -this.radius;
    }

    draw(ctx) {
        ctx.save();
        const currentY = this.y + Math.sin(this.bobPhase) * this.bobAmp;
        ctx.translate(this.x, currentY);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        const petals = 5;
        const R = this.radius;
        const r = this.innerRadius;

        ctx.beginPath();
        for (let i = 0; i < petals; i++) {
            const theta = (i * 2 * Math.PI) / petals;
            const nextTheta = ((i + 1) * 2 * Math.PI) / petals;
            const midTheta = theta + Math.PI / petals;

            // Inner start point
            const x1 = Math.cos(theta) * r;
            const y1 = Math.sin(theta) * r;

            // Outer bulbous petal tip
            const tipX = Math.cos(midTheta) * R;
            const tipY = Math.sin(midTheta) * R;

            // Control points for curvy wavy SpongeBob flower lobes
            const cp1X = Math.cos(theta + 0.25) * (R * 0.75);
            const cp1Y = Math.sin(theta + 0.25) * (R * 0.75);
            const cp2X = Math.cos(midTheta - 0.3) * (R * 1.15);
            const cp2Y = Math.sin(midTheta - 0.3) * (R * 1.15);

            const cp3X = Math.cos(midTheta + 0.3) * (R * 1.15);
            const cp3Y = Math.sin(midTheta + 0.3) * (R * 1.15);
            const cp4X = Math.cos(nextTheta - 0.25) * (R * 0.75);
            const cp4Y = Math.sin(nextTheta - 0.25) * (R * 0.75);

            const x2 = Math.cos(nextTheta) * r;
            const y2 = Math.sin(nextTheta) * r;

            if (i === 0) ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
            ctx.bezierCurveTo(cp3X, cp3Y, cp4X, cp4Y, x2, y2);
        }
        ctx.closePath();

        // Fill with soft tropical color
        ctx.fillStyle = this.palette.fill;
        ctx.fill();

        // Outline with bold vibrant stroke
        ctx.lineWidth = 4.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = this.palette.stroke;
        ctx.stroke();

        // Center ring / eyelet
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
        ctx.fillStyle = this.palette.fill;
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = this.palette.ring;
        ctx.stroke();

        ctx.restore();
    }
}

// --- 2. Swaying Algae / Sea Kelp Forest from the Bottom ---
const ALGAE_COLORS = [
    { base: "#047857", mid: "#059669", tip: "#10B981", stroke: "rgba(5, 150, 105, 0.45)" }, // Emerald
    { base: "#065F46", mid: "#047857", tip: "#34D399", stroke: "rgba(52, 211, 153, 0.45)" }, // Bright Mint
    { base: "#0F766E", mid: "#0D9488", tip: "#14B8A6", stroke: "rgba(20, 184, 166, 0.45)" }, // Marine Teal
    { base: "#831843", mid: "#BE185D", tip: "#F472B6", stroke: "rgba(244, 114, 182, 0.45)" }, // Coral Magenta
    { base: "#78350F", mid: "#B45309", tip: "#FBBF24", stroke: "rgba(251, 191, 36, 0.45)" }  // Amber Kelp
];

class SeaAlgaeStalk {
    constructor(x, height, layer = 0) {
        this.baseX = x;
        this.height = height;
        this.layer = layer; // 0 = back, 1 = mid, 2 = front
        this.segments = 12;
        this.phase = Math.random() * Math.PI * 2;
        this.freq = Math.random() * 0.02 + 0.015;
        this.amp = Math.random() * 35 + 25;
        this.width = Math.random() * 8 + 14;
        this.color = ALGAE_COLORS[Math.floor(Math.random() * ALGAE_COLORS.length)];
        this.mouseOffset = 0;
    }

    update(time, mouse, canvasHeight) {
        // Interactive mouse / touch avoidance
        if (mouse.x !== null && mouse.y !== null) {
            const dy = canvasHeight - mouse.y;
            if (dy < this.height + 60) {
                const dx = mouse.x - this.baseX;
                if (Math.abs(dx) < 140) {
                    const targetBend = (dx > 0 ? -1 : 1) * (1 - Math.abs(dx) / 140) * 45;
                    this.mouseOffset += (targetBend - this.mouseOffset) * 0.1;
                } else {
                    this.mouseOffset *= 0.92;
                }
            } else {
                this.mouseOffset *= 0.92;
            }
        } else {
            this.mouseOffset *= 0.92;
        }
    }

    draw(ctx, time, canvasHeight) {
        ctx.save();
        const segHeight = this.height / this.segments;
        const points = [{ x: this.baseX, y: canvasHeight }];

        for (let i = 1; i <= this.segments; i++) {
            const progress = i / this.segments;
            const wave = Math.sin(time * this.freq + i * 0.35 + this.phase) * this.amp * Math.pow(progress, 1.4);
            const bend = this.mouseOffset * Math.pow(progress, 1.3);
            const x = this.baseX + wave + bend;
            const y = canvasHeight - i * segHeight;
            points.push({ x, y });
        }

        // Draw leafy ribbon with gradient
        ctx.beginPath();
        ctx.moveTo(points[0].x - this.width * 0.5, points[0].y);

        // Left side curve
        for (let i = 1; i < points.length; i++) {
            const w = this.width * (1 - (i / points.length) * 0.8);
            ctx.lineTo(points[i].x - w * 0.5, points[i].y);
        }

        // Tip rounded point
        const tip = points[points.length - 1];
        ctx.lineTo(tip.x, tip.y - 10);

        // Right side curve
        for (let i = points.length - 1; i >= 1; i--) {
            const w = this.width * (1 - (i / points.length) * 0.8);
            ctx.lineTo(points[i].x + w * 0.5, points[i].y);
        }

        ctx.lineTo(points[0].x + this.width * 0.5, points[0].y);
        ctx.closePath();

        const grad = ctx.createLinearGradient(this.baseX, canvasHeight, tip.x, tip.y);
        grad.addColorStop(0, this.color.base);
        grad.addColorStop(0.5, this.color.mid);
        grad.addColorStop(1, this.color.tip);

        ctx.fillStyle = grad;
        ctx.globalAlpha = this.layer === 0 ? 0.7 : this.layer === 1 ? 0.85 : 0.95;
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this.color.stroke;
        ctx.stroke();

        ctx.restore();
    }
}

// --- 3. SpongeBob Cartoon Rising Bubbles ---
class SpongeBobRisingBubble {
    constructor(w, h, initial = false) {
        this.reset(w, h, initial);
    }

    reset(w, h, initial = false) {
        this.radius = Math.random() * 16 + 8; // 8px to 24px
        this.baseX = Math.random() * w;
        this.x = this.baseX;
        this.y = initial ? Math.random() * h : h + Math.random() * 50 + 20;
        this.vy = -(Math.random() * 1.8 + 1.2);
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.04 + 0.03;
        this.wobbleAmp = Math.random() * 15 + 8;
        this.alpha = Math.random() * 0.35 + 0.55;
    }

    update(w, h) {
        this.y += this.vy;
        this.wobblePhase += this.wobbleSpeed;
        this.x = this.baseX + Math.sin(this.wobblePhase) * this.wobbleAmp;

        if (this.y < -this.radius * 2) {
            this.reset(w, h, false);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Bubble main translucent sphere
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
            0, 0, this.radius
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${this.alpha * 0.9})`);
        grad.addColorStop(0.35, `rgba(180, 245, 255, ${this.alpha * 0.6})`);
        grad.addColorStop(0.8, `rgba(0, 210, 255, ${this.alpha * 0.35})`);
        grad.addColorStop(1, `rgba(0, 160, 240, ${this.alpha * 0.85})`);

        ctx.fillStyle = grad;
        ctx.fill();

        // SpongeBob cartoon white glossy highlight (top-left oval)
        ctx.beginPath();
        ctx.ellipse(
            -this.radius * 0.35,
            -this.radius * 0.35,
            this.radius * 0.32,
            this.radius * 0.18,
            -Math.PI / 4,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.95})`;
        ctx.fill();

        // Secondary subtle rim highlight
        ctx.beginPath();
        ctx.arc(this.radius * 0.25, this.radius * 0.25, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.55})`;
        ctx.fill();

        // Outer crisp rim stroke
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha * 0.85})`;
        ctx.stroke();

        ctx.restore();
    }
}

// --- 4. Frutiger Aero 3D Liquid Glass Bubbles ---
class LiquidBubble {
    constructor(canvasWidth, canvasHeight) {
        this.reset(canvasWidth, canvasHeight);
    }

    reset(w, h) {
        this.radius = Math.random() * 32 + 28;
        this.x = Math.random() * (w - this.radius * 2) + this.radius;
        this.y = Math.random() * (h - this.radius * 2) + this.radius;
        this.vx = (Math.random() - 0.5) * 1.4;
        this.vy = (Math.random() - 0.5) * 1.4;
        this.mass = this.radius;
        this.hue = Math.random() > 0.5 ? 165 : 195;
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

// --- 5. Organic Tropical Aquarium Fish ---
const FISH_THEMES = [
    {
        shadow: "rgba(255, 100, 0, 0.55)",
        bodyStops: ["#FFFF77", "#FF9900", "#FF3300", "#CC0000"],
        tailStops: ["rgba(255, 50, 0, 0.95)", "rgba(255, 130, 0, 0.85)", "rgba(255, 200, 0, 0.7)"],
        dorsal: "rgba(255, 90, 0, 0.9)",
        stripe: "rgba(255, 255, 255, 0.95)",
    },
    {
        shadow: "rgba(0, 200, 255, 0.6)",
        bodyStops: ["#88FFFF", "#00CCFF", "#0055FF", "#001199"],
        tailStops: ["rgba(255, 200, 0, 0.95)", "rgba(255, 150, 0, 0.85)", "rgba(0, 229, 255, 0.7)"],
        dorsal: "rgba(0, 180, 255, 0.9)",
        stripe: "rgba(0, 255, 204, 0.9)",
    },
    {
        shadow: "rgba(0, 255, 120, 0.55)",
        bodyStops: ["#CCFF99", "#00FF88", "#00B050", "#005522"],
        tailStops: ["rgba(0, 255, 204, 0.95)", "rgba(0, 200, 100, 0.85)", "rgba(255, 230, 0, 0.7)"],
        dorsal: "rgba(0, 230, 118, 0.9)",
        stripe: "rgba(255, 255, 255, 0.95)",
    },
    {
        shadow: "rgba(255, 0, 150, 0.55)",
        bodyStops: ["#FFCCFF", "#FF00AA", "#9900CC", "#440066"],
        tailStops: ["rgba(255, 0, 128, 0.95)", "rgba(200, 0, 255, 0.85)", "rgba(255, 200, 0, 0.7)"],
        dorsal: "rgba(255, 0, 180, 0.9)",
        stripe: "rgba(255, 220, 255, 0.95)",
    },
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
        this.peekSide = themeIndex % 2 === 0 ? "left" : "right";
        this.peekRatioY = 0.18 + (themeIndex * 0.17);

        this.pupilOffsetX = 0;
        this.pupilOffsetY = 0;
        this.eyeRadius = 4.8;
        this.pupilRadius = 2.4;
    }

    update(w, h, bubbles, otherFishes, mouse, playlistActive) {
        this.isPeeking = playlistActive;
        const currentSpeed = Math.hypot(this.vx, this.vy);
        this.phase += this.speed * (currentSpeed / 2 + 0.5);

        if (this.isPeeking) {
            const targetX = this.peekSide === "left" ? 45 : w - 45;
            const targetY = h * this.peekRatioY;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 15) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 4.2;
                this.vy = Math.sin(angle) * 4.2;
                this.x += this.vx;
                this.y += this.vy;
            } else {
                this.x = targetX;
                this.y = targetY;
                const facingAngle = this.peekSide === "left" ? 0 : Math.PI;
                this.vx = Math.cos(facingAngle) * 0.2;
                this.vy = Math.sin(facingAngle) * 0.2;
            }
            return;
        }

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

        let angle = Math.atan2(this.vy, this.vx);
        if (this.vx < 0) {
            ctx.scale(-1, 1);
            angle = Math.atan2(this.vy, -this.vx);
        }
        ctx.rotate(angle);

        ctx.shadowColor = this.theme.shadow;
        ctx.shadowBlur = 14;

        const wave1 = Math.sin(this.phase) * 6.5;
        const wave2 = Math.sin(this.phase - 0.7) * 11.5;
        const waveTail = Math.sin(this.phase - 1.4) * 19.0;

        // Tail Fin
        ctx.beginPath();
        ctx.moveTo(-this.length * 0.45, wave2);
        ctx.bezierCurveTo(
            -this.length * 0.8, wave2 + 10,
            -this.length * 1.1, waveTail + 20,
            -this.length * 1.35, waveTail + 14
        );
        ctx.bezierCurveTo(
            -this.length * 1.15, waveTail,
            -this.length * 1.35, waveTail - 14,
            -this.length * 1.1, waveTail - 20
        );
        ctx.bezierCurveTo(
            -this.length * 0.8, wave2 - 10,
            -this.length * 0.45, wave2,
            -this.length * 0.45, wave2
        );
        ctx.closePath();

        const tailGrad = ctx.createLinearGradient(-this.length * 0.45, 0, -this.length * 1.35, waveTail);
        tailGrad.addColorStop(0, this.theme.tailStops[0]);
        tailGrad.addColorStop(0.5, this.theme.tailStops[1]);
        tailGrad.addColorStop(1, this.theme.tailStops[2]);
        ctx.fillStyle = tailGrad;
        ctx.fill();

        // Dorsal Top Fin
        ctx.beginPath();
        ctx.moveTo(-this.length * 0.1, -this.length * 0.28);
        ctx.quadraticCurveTo(
            -this.length * 0.35, -this.length * 0.65,
            -this.length * 0.55, -this.length * 0.15 + (wave2 * 0.4)
        );
        ctx.quadraticCurveTo(
            -this.length * 0.3, -this.length * 0.22,
            -this.length * 0.1, -this.length * 0.28
        );
        ctx.fillStyle = this.theme.dorsal;
        ctx.fill();

        // Fish Body
        ctx.beginPath();
        ctx.moveTo(this.length * 0.75, 0);
        ctx.bezierCurveTo(
            this.length * 0.4, -this.length * 0.38,
            -this.length * 0.1, -this.length * 0.34,
            -this.length * 0.45, wave2
        );
        ctx.bezierCurveTo(
            -this.length * 0.1, this.length * 0.34,
            this.length * 0.4, this.length * 0.38,
            this.length * 0.75, 0
        );
        ctx.closePath();

        const bodyGrad = ctx.createLinearGradient(this.length * 0.75, 0, -this.length * 0.45, wave2);
        bodyGrad.addColorStop(0, this.theme.bodyStops[0]);
        bodyGrad.addColorStop(0.35, this.theme.bodyStops[1]);
        bodyGrad.addColorStop(0.75, this.theme.bodyStops[2]);
        bodyGrad.addColorStop(1, this.theme.bodyStops[3]);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Decorative Stripe
        ctx.beginPath();
        ctx.moveTo(this.length * 0.15, -this.length * 0.34);
        ctx.quadraticCurveTo(
            this.length * 0.05 + wave1 * 0.3, 0,
            this.length * 0.12, this.length * 0.34
        );
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = this.theme.stripe;
        ctx.stroke();

        // Fish Eye
        const eyeX = this.length * 0.42;
        const eyeY = -this.length * 0.12;

        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, this.eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.stroke();

        // Pupil tracking
        let pupilOffsetX = 0.8;
        let pupilOffsetY = 0;

        if (this.isPeeking) {
            pupilOffsetX = this.peekSide === "left" ? this.pupilRadius * 0.75 : -this.pupilRadius * 0.75;
            pupilOffsetY = (Math.sin(this.phase * 0.5)) * 0.8;
        } else if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const mouseAngle = Math.atan2(dy, dx);
            const relativeAngle = mouseAngle - angle;
            pupilOffsetX = Math.cos(relativeAngle) * (this.eyeRadius - this.pupilRadius - 0.6);
            pupilOffsetY = Math.sin(relativeAngle) * (this.eyeRadius - this.pupilRadius - 0.6);
        }

        ctx.beginPath();
        ctx.arc(eyeX + pupilOffsetX, eyeY + pupilOffsetY, this.pupilRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeX + pupilOffsetX + 1.6, eyeY + pupilOffsetY - 1.6, this.pupilRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.restore();
    }
}

// --- Main Canvas Controller ---
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
        initAlgae();
    });

    // 1. SpongeBob 5-Petal Flower Clouds (8-10 floating in background)
    const flowers = Array.from({ length: 9 }, () => new SpongeBobFlower(width, height, true));

    // 2. Multi-Layered Swaying Sea Algae / Kelp Forest
    let algaeStalks = [];
    function initAlgae() {
        algaeStalks = [];
        const count = Math.floor(width / 45) + 6;
        for (let i = 0; i < count; i++) {
            const x = (i / count) * (width + 60) - 30 + (Math.random() - 0.5) * 25;
            const h = Math.random() * 220 + 130; // 130px to 350px tall
            const layer = i % 3;
            algaeStalks.push(new SeaAlgaeStalk(x, h, layer));
        }
    }
    initAlgae();

    // 3. SpongeBob Cartoon Rising Bubbles (20 stream bubbles)
    const risingBubbles = Array.from({ length: 22 }, () => new SpongeBobRisingBubble(width, height, true));

    // 4. 10 3D Liquid Glass Bubbles
    const glassBubbles = Array.from({ length: 10 }, () => new LiquidBubble(width, height));

    // 5. 5 Organic Tropical Aquarium Fish
    const fishes = Array.from({ length: 5 }, (_, i) => new OrganicWigglingFish(width, height, i));

    let time = 0;

    function animate() {
        ctx.clearRect(0, 0, width, height);
        time++;

        const playlistElem = document.getElementById("playlist-section");
        const isPlaylistLoaded = playlistElem && !playlistElem.classList.contains("hidden");

        // 1. Draw SpongeBob Flower Clouds (deepest background layer)
        for (let flower of flowers) {
            flower.update(width, height);
            flower.draw(ctx);
        }

        // 2. Draw Back Layer Algae
        for (let stalk of algaeStalks) {
            if (stalk.layer === 0) {
                stalk.update(time, mouse, height);
                stalk.draw(ctx, time, height);
            }
        }

        // 3. Draw Rising SpongeBob Bubbles
        for (let b of risingBubbles) {
            b.update(width, height);
            b.draw(ctx);
        }

        // 4. Draw Mid Layer Algae
        for (let stalk of algaeStalks) {
            if (stalk.layer === 1) {
                stalk.update(time, mouse, height);
                stalk.draw(ctx, time, height);
            }
        }

        // 5. Draw 3D Liquid Glass Bubbles
        for (let i = 0; i < glassBubbles.length; i++) {
            const b = glassBubbles[i];
            b.update(width, height, mouse);

            for (let j = i + 1; j < glassBubbles.length; j++) {
                const b2 = glassBubbles[j];
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

        // 6. Draw Tropical Aquarium Fish
        for (let fish of fishes) {
            fish.update(width, height, glassBubbles, fishes, mouse, isPlaylistLoaded);
            fish.draw(ctx, mouse, width, height);
        }

        // 7. Draw Front Layer Algae
        for (let stalk of algaeStalks) {
            if (stalk.layer === 2) {
                stalk.update(time, mouse, height);
                stalk.draw(ctx, time, height);
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
});
