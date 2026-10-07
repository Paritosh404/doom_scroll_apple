// Runs only inside Instagram's web pages. Never reads form values or message text.
(() => {
    "use strict";
    const instagramHost = host => host === "instagram.com" || host.endsWith(".instagram.com");
    if (!instagramHost(location.hostname.toLowerCase())) return;

    const forbidden = value => {
        try {
            const url = new URL(value, location.href);
            if (!instagramHost(url.hostname.toLowerCase())) return false;
            let path = url.pathname;
            try { path = decodeURIComponent(path); } catch {}
            return path.toLowerCase().split("/").some(part =>
                ["reel", "reels", "tv", "explore"].includes(part));
        } catch { return false; }
    };
    const notify = () => {
        try { window.webkit.messageHandlers.focusBrowser.postMessage("blocked"); } catch {}
    };
    const guardLocation = () => {
        if (!forbidden(location.href)) return;
        document.documentElement?.setAttribute("data-doomscroll-blocked", "");
        notify();
        location.replace("https://www.instagram.com/direct/inbox/");
    };

    // Instagram navigates without loading a new document; native delegates alone
    // cannot catch pushState / replaceState or back/forward within that document.
    for (const method of ["pushState", "replaceState"]) {
        const original = history[method];
        history[method] = function (state, title, url) {
            if (url != null && forbidden(url)) { notify(); return; }
            const result = original.apply(this, arguments);
            guardLocation();
            return result;
        };
    }
    window.addEventListener("popstate", guardLocation);
    window.addEventListener("hashchange", guardLocation);
    window.addEventListener("pageshow", guardLocation);
    document.addEventListener("click", event => {
        const anchor = event.target.closest?.("a[href]");
        if (anchor && forbidden(anchor.href)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            notify();
        }
    }, true);

    const css = [
        "video, audio { display: none !important; visibility: hidden !important; }",
        "[data-doomscroll-hidden] { display: none !important; }",
        "html[data-doomscroll-blocked] body { visibility: hidden !important; }"
    ].join("\n");
    const style = document.createElement("style");
    style.textContent = css;
    const silence = media => {
        media.pause();
        media.autoplay = false;
        media.muted = true;
    };
    document.addEventListener("play", event => {
        if (event.target.matches?.("video, audio")) silence(event.target);
    }, true);

    let scheduled = false;
    const filter = () => {
        scheduled = false;
        if (!style.isConnected) (document.head || document.documentElement)?.appendChild(style);
        document.querySelectorAll("a[href]").forEach(anchor => {
            const blocked = forbidden(anchor.href);
            if (blocked && !anchor.hasAttribute("data-doomscroll-hidden")) {
                anchor.setAttribute("data-doomscroll-hidden", "");
            } else if (!blocked && anchor.hasAttribute("data-doomscroll-hidden")) {
                anchor.removeAttribute("data-doomscroll-hidden");
            }
        });
        document.querySelectorAll("video, audio").forEach(silence);
        guardLocation();
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(filter);
    };
    new MutationObserver(schedule).observe(document, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["href", "src"]
    });
    filter();
})();
