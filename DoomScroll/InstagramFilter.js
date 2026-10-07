// Local navigation/media filtering. Does not read passwords or message text.
(() => {
    "use strict";
    const isInstagram = host => host === "instagram.com" || host.endsWith(".instagram.com");
    if (!isInstagram(location.hostname.toLowerCase())) return;
    const parse = value => { try { return new URL(value, location.href); } catch { return null; } };
    const postID = value => {
        const url = parse(value);
        if (!url || !isInstagram(url.hostname)) return null;
        const match = url.pathname.match(/^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?$/i);
        return match ? match[1] : null;
    };
    const singleID = postID(location.href);
    const singleURL = location.href;
    const notify = () => {
        try { window.webkit.messageHandlers.focusBrowser.postMessage("blocked"); } catch {}
    };
    const forbidden = value => {
        const url = parse(value);
        if (!url || !isInstagram(url.hostname)) return false;
        const id = postID(url.href);
        if (id) return singleID !== null && id !== singleID;
        let path = url.pathname;
        try { path = decodeURIComponent(path); } catch {}
        return path.toLowerCase().split("/").some(part =>
            ["reel", "reels", "tv", "explore"].includes(part));
    };
    const following = value => {
        const url = parse(value);
        if (url && isInstagram(url.hostname) && url.pathname === "/") {
            url.searchParams.set("variant", "following");
            return url.href;
        }
        return value;
    };
    const go = value => location.assign(following(value));
    const guardLocation = () => {
        if (forbidden(location.href)) {
            notify();
            location.replace(singleID ? singleURL : "https://www.instagram.com/direct/inbox/");
            return;
        }
        if (singleID && postID(location.href) === null) {
            location.replace(following(location.href));
            return;
        }
        const target = following(location.href);
        if (target !== location.href) location.replace(target);
    };

    // Every individual post opens as a document, so its first post ID is fixed.
    // Instagram cannot turn that viewer into a second Reel with SPA navigation.
    for (const method of ["pushState", "replaceState"]) {
        const original = history[method];
        history[method] = function(state, title, url) {
            if (url != null) {
                if (forbidden(url)) { notify(); return; }
                const target = parse(url);
                if (target && (postID(target.href) !== singleID ||
                    following(target.href) !== target.href)) {
                    go(target.href);
                    return;
                }
            }
            const result = original.apply(this, arguments);
            guardLocation();
            return result;
        };
    }
    for (const event of ["popstate", "hashchange", "pageshow"]) {
        window.addEventListener(event, guardLocation);
    }
    document.addEventListener("click", event => {
        const anchor = event.target.closest?.("a[href]");
        if (anchor) {
            if (forbidden(anchor.href)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                notify();
                return;
            }
            if (postID(anchor.href) || (singleID && isInstagram(parse(anchor.href)?.hostname || "")) ||
                following(anchor.href) !== anchor.href) {
                event.preventDefault();
                event.stopImmediatePropagation();
                go(anchor.href);
                return;
            }
        }
        if (singleID) {
            const button = event.target.closest?.("button, [role=button]");
            const label = button?.getAttribute("aria-label") || button?.getAttribute("title") || "";
            if (/^(next|previous)(\s+(reel|post|video))?$/i.test(label.trim())) {
                event.preventDefault();
                event.stopImmediatePropagation();
                notify();
            }
        }
    }, true);

    const style = document.createElement("style");
    style.textContent = [
        "[data-doomscroll-hidden] { display: none !important; }",
        "html[data-doomscroll-single], html[data-doomscroll-single] body { overflow: hidden !important; overscroll-behavior: none !important; }",
        "html[data-doomscroll-single] video:not([data-doomscroll-selected]), html[data-doomscroll-single] audio { display: none !important; }"
    ].join("\n");

    let selectedVideo = null;
    let selectedSource = "";
    let selectedUnavailable = false;
    const sourceOf = media => {
        const source = media.currentSrc || media.getAttribute("src") ||
            media.querySelector?.("source[src]")?.getAttribute("src") || "";
        return source ? (parse(source)?.href || source) : "";
    };
    const restrictMedia = media => {
        if (!singleID) return; // Stories, DMs, and Following retain normal playback.
        if (!selectedVideo && media.tagName === "VIDEO") selectedVideo = media;
        if (media !== selectedVideo || selectedUnavailable) {
            media.pause();
            media.removeAttribute("data-doomscroll-selected");
            return;
        }
        const source = sourceOf(media);
        if (source && selectedSource && source !== selectedSource) {
            // A recycled player must not start the next Reel without changing URL.
            selectedUnavailable = true;
            media.pause();
            media.removeAttribute("data-doomscroll-selected");
            notify();
            return;
        }
        if (source) selectedSource = source;
        media.setAttribute("data-doomscroll-selected", "");
        media.loop = false;
        media.controls = true;
        media.playsInline = true;
    };
    document.addEventListener("play", event => {
        if (event.target.matches?.("video, audio")) restrictMedia(event.target);
    }, true);
    document.addEventListener("ended", event => {
        if (singleID && event.target.matches?.("video, audio")) {
            event.stopImmediatePropagation();
            event.target.pause();
        }
    }, true);

    if (singleID) {
        const stopScroll = event => {
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        document.addEventListener("touchmove", stopScroll, { capture: true, passive: false });
        document.addEventListener("wheel", stopScroll, { capture: true, passive: false });
        document.addEventListener("keydown", event => {
            if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "End", "Home"].includes(event.key)) {
                stopScroll(event);
            }
        }, true);
        document.addEventListener("scroll", event => {
            const target = event.target === document ? document.scrollingElement : event.target;
            if (target?.scrollTop) target.scrollTop = 0;
        }, true);
    }

    let scheduled = false;
    const filter = () => {
        scheduled = false;
        if (!style.isConnected) (document.head || document.documentElement)?.appendChild(style);
        if (singleID) document.documentElement?.setAttribute("data-doomscroll-single", "");
        document.querySelectorAll("a[href]").forEach(anchor => {
            if (forbidden(anchor.href)) {
                if (!anchor.hasAttribute("data-doomscroll-hidden")) anchor.setAttribute("data-doomscroll-hidden", "");
            } else if (anchor.hasAttribute("data-doomscroll-hidden")) {
                anchor.removeAttribute("data-doomscroll-hidden");
            }
        });
        if (selectedVideo && !selectedVideo.isConnected) selectedUnavailable = true;
        document.querySelectorAll("video, audio").forEach(restrictMedia);
        guardLocation();
    };
    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(filter);
    }).observe(document, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["href", "src"]
    });
    filter();
})();
