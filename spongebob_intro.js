/**
 * spongebob_intro.js — Instant Fullscreen SpongeBob Bubble Transition Intro
 * Features:
 * 1. Preloads & plays immediately on page load with 0 delay
 * 2. Real-time Green Screen Chroma Keying on HTML5 Canvas (100% transparent background)
 * 3. Plays the classic SpongeBob bubble sound effect
 * 4. Smoothly reveals the website as bubbles swirl and pop
 * 5. Replay button available in the top badge header
 */

(function() {
    'use strict';

    let hasPlayed = false;

    // Pre-create and preload the video immediately
    const preloadedVideo = document.createElement('video');
    preloadedVideo.src = '/spongebob_bubble.mp4';
    preloadedVideo.crossOrigin = 'anonymous';
    preloadedVideo.playsInline = true;
    preloadedVideo.preload = 'auto';
    preloadedVideo.muted = false;
    preloadedVideo.load();

    function playSpongeBobIntro() {
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
            transition: opacity 0.4s ease-out;
        `;

        const canvas = document.createElement('canvas');
        canvas.id = 'spongebob-intro-canvas';
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.style.cssText = `
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            pointer-events: none;
        `;
        container.appendChild(canvas);

        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Skip ✕';
        skipBtn.style.cssText = `
            position: absolute;
            top: 20px; right: 24px;
            padding: 6px 14px;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            color: #FFFFFF;
            border: 1.5px solid rgba(255, 255, 255, 0.7);
            border-radius: 20px;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s ease;
        `;
        skipBtn.onmouseenter = () => { skipBtn.style.background = 'rgba(0, 229, 255, 0.6)'; };
        skipBtn.onmouseleave = () => { skipBtn.style.background = 'rgba(0, 0, 0, 0.45)'; };
        skipBtn.onclick = () => { closeIntro(); };
        container.appendChild(skipBtn);

        // Mount immediately to document
        if (document.body) {
            document.body.appendChild(container);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(container);
            });
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const video = preloadedVideo;
        video.currentTime = 0;

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
            }, 400);
        }

        video.addEventListener('loadedmetadata', () => {
            if (video.videoWidth) canvas.width = video.videoWidth;
            if (video.videoHeight) canvas.height = video.videoHeight;
        });

        function renderFrame() {
            if (isClosed) return;

            if (video.readyState >= 2) {
                const w = canvas.width;
                const h = canvas.height;

                ctx.drawImage(video, 0, 0, w, h);
                const frame = ctx.getImageData(0, 0, w, h);
                const data = frame.data;
                const l = data.length;

                for (let i = 0; i < l; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Chroma Key Green Screen removal (#00FE02 / #00FF00)
                    if (g > 85 && g > r * 1.38 && g > b * 1.38) {
                        data[i + 3] = 0; // Fully transparent
                    } else if (g > 70 && g > r * 1.15 && g > b * 1.15) {
                        const diff = g - Math.max(r, b);
                        data[i + 3] = Math.max(0, 255 - diff * 3.2);
                        data[i + 1] = Math.max(r, b); // Green despill
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

        video.onplay = () => {
            if (!animationFrameId) animationFrameId = requestAnimationFrame(renderFrame);
        };

        video.onended = () => {
            closeIntro();
        };

        // Start playback immediately
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                animationFrameId = requestAnimationFrame(renderFrame);
            }).catch(() => {
                // If audio autoplay blocked by browser policy, play muted with zero delay
                video.muted = true;
                video.play().then(() => {
                    animationFrameId = requestAnimationFrame(renderFrame);
                }).catch(() => {
                    closeIntro();
                });
            });
        }

        // Safety fallback timer
        setTimeout(() => {
            closeIntro();
        }, 5500);
    }

    window.playSpongeBobBubbleIntro = playSpongeBobIntro;

    // Launch immediately upon script execution if body exists, otherwise on ready
    function initInstantIntro() {
        if (!hasPlayed) {
            hasPlayed = true;
            playSpongeBobIntro();
        }
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initInstantIntro();
    } else {
        document.addEventListener('DOMContentLoaded', initInstantIntro);
    }

    // Add "🫧 Play Intro" button to hero badge
    document.addEventListener('DOMContentLoaded', () => {
        const badge = document.querySelector('.hero-badge');
        if (badge && !document.getElementById('btn-replay-bubble-intro')) {
            const introBtn = document.createElement('button');
            introBtn.id = 'btn-replay-bubble-intro';
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
