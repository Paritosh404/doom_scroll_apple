// Instagram stays intact outside the single-video dialog. No account/message data is read.
(() => {
    "use strict";
    const instagram = host => host === "instagram.com" || host.endsWith(".instagram.com");
    if (!instagram(location.hostname.toLowerCase()) || window.top !== window) return;
    const url = value => { try { return new URL(value, location.href); } catch { return null; } };
    const postID = value => {
        const u = url(value);
        if (!u || !instagram(u.hostname)) return null;
        return u.pathname.match(/^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?$/i)?.[1] || null;
    };
    const entryID = postID(location.href);
    const entryURL = location.href;
    const dmKey = "doomscroll-dm-video-intent";
    const readIntent = () => {
        try {
            const value = JSON.parse(sessionStorage.getItem(dmKey));
            const origin = value && url(value.returnURL);
            return origin && instagram(origin.hostname) && /^\/direct\//.test(origin.pathname) &&
                Date.now() - value.at < 15000 ? value : null;
        } catch { return null; }
    };
    let dmIntent = readIntent();
    let dmBaseline = new Map();
    const clearIntent = () => {
        dmIntent = null;
        dmBaseline.clear();
        try { sessionStorage.removeItem(dmKey); } catch {}
    };
    const isHome = () => location.pathname === "/";
    if (isHome()) clearIntent();
    const isDM = () => /^\/direct\//.test(location.pathname);
    const isStory = () => /^\/stories\//i.test(location.pathname);
    const isReelPage = () => /^\/(?:reel|reels|tv)\/[^/]+\/?$/i.test(location.pathname);
    const notify = event => {
        try { window.webkit.messageHandlers.focusBrowser.postMessage(event); } catch {}
    };
    const blocked = value => {
        const u = url(value);
        if (!u || !instagram(u.hostname)) return false;
        const id = postID(u.href);
        if (id) return false;
        return u.pathname.split("/").some(p => ["reel", "reels", "tv"].includes(p.toLowerCase()));
    };
    let player = null;
    let scheduled = false;
    let dismissed = false;
    const stop = event => { event.preventDefault(); event.stopImmediatePropagation(); };
    const sourceOf = video => {
        const source = video.currentSrc || video.getAttribute("src") ||
            video.querySelector("source[src]")?.getAttribute("src") || "";
        return source ? (url(source)?.href || source) : "";
    };
    const pauseBackground = () => {
        if (player) document.querySelectorAll("video, audio").forEach(media => media.pause());
    };

    function closePlayer() {
        if (!player) return;
        const old = player;
        if (old.dmReturnURL) {
            old.video?.pause();
            clearIntent();
            // Instagram can open its suggested viewer without changing the DM URL.
            // Keep the modal and gesture lock until a fresh conversation replaces it.
            old.shadow.querySelector(".status").hidden = false;
            old.shadow.querySelector(".status").textContent = "Returning to messages…";
            notify("player-close");
            // Allow the native navigation delegate to unlock before navigating.
            setTimeout(() => location.replace(old.dmReturnURL), 0);
            return;
        }
        player = null;
        dismissed = true;
        old.video?.pause();
        if (old.placeholder?.isConnected) old.placeholder.replaceWith(old.video);
        else old.video?.remove();
        old.dialog.close();
        old.host.remove();
        notify(entryID ? "player-return" : "player-close");
    }
    window.addEventListener("doomscroll-close-player", closePlayer);

    function createPlayer() {
        if (isHome() || !dmIntent || player || !document.documentElement) return;
        const host = document.createElement("div");
        host.id = "doomscroll-player";
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = '<style>' +
            ':host{position:fixed;inset:0;z-index:2147483647}' +
            'dialog{position:fixed;inset:0;margin:0;border:0;padding:0;box-sizing:border-box;' +
            'width:100%;max-width:100%;height:100%;max-height:100%;overflow:hidden;' +
            'background:#101114;color:white;font:16px system-ui;}' +
            'dialog::backdrop{background:#101114}' +
            '.layout{height:100%;display:flex;flex-direction:column;min-width:0}' +
            '.bar{display:flex;gap:8px;align-items:center;padding:4px 8px;flex:none;justify-content:flex-end}' +
            '[hidden]{display:none!important}button{min-height:44px;min-width:44px;padding:8px 12px;border:0;border-radius:10px;' +
            'background:#e7eaff;color:#111;font:inherit}' +
            '.stage{flex:1;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
            'video{display:block!important;position:static!important;transform:none!important;' +
            'width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;' +
            'margin:0!important;object-fit:contain!important;box-sizing:border-box!important}' +
            '.status{padding:8px 12px;flex:none;font-size:13px}' +
            '.audio{display:flex;justify-content:flex-end;padding:8px max(12px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom));flex:none}' +
            'video::-webkit-media-controls-mute-button,video::-webkit-media-controls-volume-slider{display:none}' +
            '</style><dialog aria-label="Single video"><div class="layout">' +
            '<div class="bar"><button id="close">Close</button></div>' +
            '<div class="stage"></div><div class="status">Loading the selected video…</div>' +
            '<div class="audio"><button id="audio-toggle" aria-label="Mute audio">Sound on</button></div>' +
            '</div></dialog>';
        const dialog = shadow.querySelector("dialog");
        player = { host, shadow, dialog, video: null, source: "", placeholder: null, failed: false };
        document.documentElement.appendChild(host);
        dialog.showModal();
        shadow.querySelector("#close").addEventListener("click", closePlayer);
        dialog.addEventListener("cancel", event => { event.preventDefault(); closePlayer(); });
        notify("player-open");
        pauseBackground();
    }

    function isolate(video) {
        if (isHome() || (!dmIntent && !player) || dismissed || player?.video) return;
        createPlayer();
        if (!player) return;
        const active = player;
        active.dmReturnURL = dmIntent?.returnURL || null;
        clearIntent();
        active.video = video;
        active.source = sourceOf(video);
        active.placeholder = document.createComment("Selected video");
        video.before(active.placeholder);
        video.pause();
        video.removeAttribute("style");
        video.controls = true;
        video.playsInline = true;
        video.autoplay = false;
        video.loop = false;
        video.defaultMuted = false;
        video.muted = false;
        video.volume = 1;
        active.shadow.querySelector(".stage").appendChild(video);
        let mutedByUser = false;
        const audioButton = active.shadow.querySelector("#audio-toggle");
        const syncAudio = () => {
            if (player !== active) return;
            // Instagram may reapply its saved mute preference after loading media.
            if (video.muted !== mutedByUser) video.muted = mutedByUser;
            if (video.volume !== 1) video.volume = 1;
            video.defaultMuted = mutedByUser;
            audioButton.textContent = mutedByUser ? "Sound off" : "Sound on";
            audioButton.setAttribute("aria-label", mutedByUser ? "Unmute audio" : "Mute audio");
            audioButton.setAttribute("aria-pressed", String(mutedByUser));
        };
        audioButton.addEventListener("click", () => {
            mutedByUser = !mutedByUser;
            syncAudio();
        });
        for (const type of ["volumechange", "loadedmetadata", "playing"]) video.addEventListener(type, syncAudio);
        syncAudio();
        active.shadow.querySelector(".status").hidden = true;
        const guardSource = () => {
            if (player !== active) return;
            const source = sourceOf(video);
            if (source && active.source && source !== active.source) {
                active.failed = true;
                video.pause();
                video.style.setProperty("visibility", "hidden", "important");
                active.shadow.querySelector(".status").hidden = false;
                active.shadow.querySelector(".status").textContent = "Instagram changed the video. Close it and reopen the selected Reel.";
            } else if (source) active.source = source;
        };
        new MutationObserver(guardSource).observe(video, { attributes: true, childList: true, subtree: true, attributeFilter: ["src"] });
        for (const type of ["play", "loadedmetadata", "loadeddata", "durationchange"]) {
            video.addEventListener(type, event => {
                if (player !== active) return;
                event.stopImmediatePropagation();
                guardSource();
            }, true);
        }
        video.addEventListener("ended", event => {
            if (player !== active) return;
            event.stopImmediatePropagation();
            video.pause();
        }, true);
        pauseBackground();
        video.play().catch(() => {
            // WebKit can still require a tap; keep its built-in play control.
            if (player === active && !active.failed) {
                active.shadow.querySelector(".status").hidden = false;
                active.shadow.querySelector(".status").textContent = "Tap play to start.";
            }
        });
        video.addEventListener("playing", () => {
            if (player === active && !active.failed) active.shadow.querySelector(".status").hidden = true;
        });
    }

    // Find the tapped media, not an arbitrary first video elsewhere in the feed.
    function tappedVideo(target) {
        if (!(target instanceof Element)) return null;
        for (let node = target, depth = 0; node && depth < 6; node = node.parentElement, depth++) {
            if (node.matches("video")) return node;
            const videos = node.querySelectorAll("video");
            if (videos.length === 1) return videos[0];
            if (videos.length > 1 || node.matches("article, main, body")) break;
        }
        return null;
    }
    function armDMPreview(target) {
        if (!isDM() || !(target instanceof Element)) return;
        const link = target.closest("a[href]");
        if (link && postID(link.href)) {
            dmIntent = { at:Date.now(), returnURL:location.href };
            try { sessionStorage.setItem(dmKey, JSON.stringify(dmIntent)); } catch {}
            dismissed = false;
            return;
        }
        // A large media thumbnail, not a text message, avatar, or composer button.
        let preview = null;
        for (let node = target, depth = 0; node && depth < 5; node = node.parentElement, depth++) {
            if (node.matches("article, main, body, [role=main]")) break;
            const media = node.matches("img, video") ? node : node.querySelector("img, video");
            if (media) {
                const box = media.getBoundingClientRect();
                if (box.width >= 90 && box.height >= 90) { preview = media; break; }
            }
            if (node.matches("main, body, [role=main]")) break;
        }
        if (!preview) return;
        dmBaseline = new Map(Array.from(document.querySelectorAll("video"), video => {
            const box = video.getBoundingClientRect();
            return [video, {source:sourceOf(video), area:box.width * box.height}];
        }));
        dmIntent = { at:Date.now(), returnURL:location.href };
        try { sessionStorage.setItem(dmKey, JSON.stringify(dmIntent)); } catch {}
        dismissed = false;
    }
    function captureDMVideo(preferred) {
        if (isHome()) { clearIntent(); return; }
        if (!dmIntent || player?.video) return;
        if (Date.now() - dmIntent.at >= 15000) { clearIntent(); return; }
        const candidates = preferred ? [preferred] : Array.from(document.querySelectorAll("video"));
        const candidate = candidates.find(video => {
            const box = video.getBoundingClientRect();
            const previous = dmBaseline.get(video);
            const visible = box.width >= 120 && box.height >= 160 &&
                box.bottom > 0 && box.top < innerHeight &&
                getComputedStyle(video).visibility !== "hidden";
            return visible && (!previous || previous.source !== sourceOf(video) ||
                box.width * box.height > previous.area * 1.5);
        });
        if (candidate) isolate(candidate);
    }

    window.addEventListener("click", event => {
        if (player) {
            if (!event.composedPath().includes(player.host)) stop(event);
            return;
        }
        if (isStory() && !dmIntent) return;
        const anchor = event.target.closest?.("a[href]");
        if (anchor && blocked(anchor.href)) { stop(event); notify("blocked"); return; }
        // Home media taps and carousel controls belong to Instagram's feed.
        if (!isDM()) return;
        armDMPreview(event.target);
        if (anchor && postID(anchor.href)) { stop(event); location.assign(anchor.href); return; }
        const video = tappedVideo(event.target);
        if (video && dmIntent) {
            stop(event);
            dismissed = false;
            isolate(video);
            return;
        }
    }, true);

    window.addEventListener("pointerdown", event => {
        if (!player && !isStory()) armDMPreview(event.target);
    }, true);
    window.addEventListener("touchstart", event => {
        if (!player && !isStory()) armDMPreview(event.target);
    }, { capture: true, passive: true });

    // Lock gestures only after a selected video has opened in the player.
    for (const name of ["touchmove", "wheel"]) {
        window.addEventListener(name, event => {
            if (player) stop(event);
        },
            { capture: true, passive: false });
    }
    window.addEventListener("keydown", event => {
        if (player && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(event.key)) stop(event);
    }, true);
    const soundInitialized = new WeakSet();
    const homeSoundSynced = new WeakSet();
    const homeSoundChosen = new WeakSet();
    function homeAudioControl(media) {
        const container = media.closest("article") || media.parentElement;
        if (!container || container.querySelectorAll("video").length !== 1) return null;
        return Array.from(container.querySelectorAll('button, [role="button"]')).find(button =>
            /^(unmute|mute|audio muted|audio playing|turn (on|off) sound|turn audio (on|off))( audio)?$/i.test(
                button.getAttribute("aria-label") || button.querySelector("[aria-label]")?.getAttribute("aria-label") || ""));
    }
    function syncHomeSound(media) {
        if (!isHome() || homeSoundSynced.has(media) || homeSoundChosen.has(media)) return;
        const control = homeAudioControl(media);
        if (!control) return;
        homeSoundSynced.add(media);
        const label = control.getAttribute("aria-label") || control.querySelector("[aria-label]")?.getAttribute("aria-label") || "";
        // Use Instagram's own action so its icon and internal state change together.
        if (/^(unmute|audio muted|turn on sound|turn audio on)/i.test(label)) control.click();
    }
    window.addEventListener("click", event => {
        if (!isHome() || !event.isTrusted) return;
        document.querySelectorAll("video").forEach(media => {
            const control = homeAudioControl(media);
            if (control?.contains(event.target)) homeSoundChosen.add(media);
        });
    }, true);
    const defaultSound = media => {
        syncHomeSound(media);
        if (homeSoundChosen.has(media)) return;
        if (soundInitialized.has(media)) return;
        soundInitialized.add(media);
        media.defaultMuted = false;
        media.muted = false;
        media.volume = 1;
    };
    document.addEventListener("play", event => {
        if (event.target.matches?.("video, audio")) defaultSound(event.target);
        if (!player && dmIntent && event.target.matches?.("video")) captureDMVideo(event.target);
        if (player && event.target.matches?.("video, audio")) {
            event.stopImmediatePropagation();
            event.target.pause();
        }
    }, true);

    for (const method of ["pushState", "replaceState"]) {
        const original = history[method];
        history[method] = function(state, title, value) {
            if (player || (value != null && blocked(value))) { notify("blocked"); return; }
            if (dmIntent && value != null && postID(value) !== postID(location.href)) {
                location.assign(url(value).href);
                return;
            }
            const result = original.apply(this, arguments);
            schedule();
            return result;
        };
    }
    window.addEventListener("popstate", () => {
        if (player || blocked(location.href)) {
            location.replace(entryURL);
        } else schedule();
    });

    function refresh() {
        scheduled = false;
        if (isHome()) document.querySelectorAll("video").forEach(syncHomeSound);
        captureDMVideo();
        if (isStory()) return;
        if (dmIntent && !player && !dismissed && isReelPage()) createPlayer();
        if (dmIntent && !dismissed && entryID && !player?.video) {
            // A permalink's primary article is preferable to suggested videos.
            const article = document.querySelector("article");
            const candidate = article?.querySelector("video") ||
                (isReelPage() ? document.querySelector("video") : null);
            if (candidate) isolate(candidate);
        }
        pauseBackground();
    }
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(refresh);
    }
    new MutationObserver(schedule).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "class", "style"] });
    schedule();
})();
