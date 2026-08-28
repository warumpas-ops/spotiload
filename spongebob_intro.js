/**
 * spongebob_intro.js — Fullscreen SpongeBob Bubble Transition Intro with Chroma Keying & Sound Effect
 * Features:
 * 1. Automatically plays on website load as an iconic intro transition
 * 2. Real-time Green Screen Chroma Keying on HTML5 Canvas (100% transparent background)
 * 3. Plays the classic SpongeBob bubble sound effect
 * 4. Smoothly reveals the website as the bubbles swirl and pop
 * 5. Replay button available in the top badge header
 */

(function() {
    'use strict';

    let hasPlayed = false;

    function playSpongeBobIntro() {
        // Remove existing intro container if present
        const existing = document.getElementById('spongebob-intro-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'spongebob-intro-container';
        container.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            z-index: 999999;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            transition: opacity 0.5s ease-out;
        `;

        const canvas = document.createElement('canvas');
        canvas.id = 'spongebob-intro-canvas';
        canvas.style.cssText = `
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            pointer-events: none;
        `;
        container.appendChild(canvas);

        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Skip Intro ✕';
        skipBtn.style.cssText = `
            position: absolute;
            top: 24px; right: 28px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            color: #FFFFFF;
            border: 1.5px solid rgba(255, 255, 255, 0.7);
            border-radius: 20px;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s ease;
        `;
        skipBtn.onmouseenter = () => { skipBtn.style.background = 'rgba(0, 229, 255, 0.6)'; };
        skipBtn.onmouseleave = () => { skipBtn.style.background = 'rgba(0, 0, 0, 0.45)'; };
        skipBtn.onclick = () => { closeIntro(); };
        container.appendChild(skipBtn);

        document.body.appendChild(container);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const video = document.createElement('video');
        video.src = '/spongebob_bubble.mp4';
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.preload = 'auto';
        video.muted = false;

        let animationFrameId = null;
        let isClosed = false;

        function closeIntro() {
            if (isClosed) return;
            isClosed = true;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            video.pause();
            container.style.opacity = '0';
            setTimeout(() => {
                container.remove();
            }, 500);
        }

        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth || 1920;
            canvas.height = video.videoHeight || 1080;
        });

        function renderFrame() {
            if (isClosed) return;

            if (video.readyState >= 2) {
                const w = canvas.width;
                const h = canvas.height;

                ctx.drawImage(video, 0, 0, w, h);
                const frame = ctx.getImageData(0, 0, w, h);
                const l = frame.data.length / 4;

                for (let i = 0; i < l; i++) {
                    const r = frame.data[i * 4 + 0];
                    const g = frame.data[i * 4 + 1];
                    const b = frame.data[i * 4 + 2];

                    // Chroma Key Green Screen removal:
                    // Detect saturated green background (#00FE02 / #00FF00)
                    if (g > 85 && g > r * 1.38 && g > b * 1.38) {
                        frame.data[i * 4 + 3] = 0; // Transparent
                    } else if (g > 70 && g > r * 1.15 && g > b * 1.15) {
                        // Soft edge anti-aliasing / despill
                        const diff = g - Math.max(r, b);
                        const alpha = Math.max(0, 255 - diff * 3.2);
                        frame.data[i * 4 + 3] = alpha;
                        frame.data[i * 4 + 1] = Math.max(r, b); // Green despill
                    }
                }

                ctx.putImageData(frame, 0, 0);
            }

            if (!video.ended && !video.paused) {
                animationFrameId = requestAnimationFrame(renderFrame);
            } else if (video.ended) {
                closeIntro();
            }
        }

        video.addEventListener('play', () => {
            animationFrameId = requestAnimationFrame(renderFrame);
        });

        video.addEventListener('ended', () => {
            closeIntro();
        });

        // Start video playback
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Video started playing with sound!
            }).catch(() => {
                // Auto-play with audio blocked by browser: play muted and allow sound
                video.muted = true;
                video.play().catch(() => {
                    closeIntro();
                });
            });
        }

        // Safety fallback timer (video is 5.4s)
        setTimeout(() => {
            closeIntro();
        }, 5800);
    }

    // Expose globally so user can replay anytime
    window.playSpongeBobBubbleIntro = playSpongeBobIntro;

    // Run automatically on first page load
    document.addEventListener('DOMContentLoaded', () => {
        if (!hasPlayed) {
            hasPlayed = true;
            // Short 150ms delay for smooth DOM paint before intro
            setTimeout(() => {
                playSpongeBobIntro();
            }, 150);
        }

        // Add "🫧 Play Intro" button to hero badge
        const badge = document.querySelector('.hero-badge');
        if (badge) {
            const introBtn = document.createElement('button');
            introBtn.innerHTML = '🫧 Play Bubble Intro';
            introBtn.title = 'Replay SpongeBob Bubble Transition';
            introBtn.style.cssText = `
                margin-left: 12px;
                padding: 4px 12px;
                font-size: 11px;
                font-weight: 700;
                color: #004466;
                background: linear-gradient(180deg, #FFFFFF 0%, #B8F2FF 100%);
                border: 1px solid rgba(255, 255, 255, 0.9);
                border-radius: 12px;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 180, 255, 0.4);
                transition: transform 0.15s ease;
            `;
            introBtn.onmouseenter = () => { introBtn.style.transform = 'scale(1.06)'; };
            introBtn.onmouseleave = () => { introBtn.style.transform = 'scale(1)'; };
            introBtn.onclick = (e) => {
                e.stopPropagation();
                playSpongeBobIntro();
            };
            badge.appendChild(introBtn);
        }
    });

})();
