const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("DoomScroll/InstagramFilter.js", "utf8");

function page(href = "https://www.instagram.com/direct/inbox/") {
    const anchors = [];
    const media = [];
    const documentEvents = {};
    const windowEvents = {};
    const notifications = [];
    const historyCalls = [];
    let observer, frame, redirected;
    const rootAttributes = {};
    const style = { isConnected: false };
    const document = {
        documentElement: {
            setAttribute(key, value) { rootAttributes[key] = value; },
            appendChild(node) { node.isConnected = true; }
        },
        head: { appendChild(node) { node.isConnected = true; } },
        createElement() { return style; },
        addEventListener(name, handler) { documentEvents[name] = handler; },
        querySelectorAll(selector) { return selector === "a[href]" ? anchors : media; }
    };
    const location = {
        href, hostname: new URL(href).hostname,
        replace(value) { redirected = value; }
    };
    const history = Object.fromEntries(["pushState", "replaceState"].map(name => [
        name, function(state, title, url) {
            historyCalls.push([name, url]);
            if (url != null) location.href = new URL(url, location.href).href;
        }
    ]));
    const window = {
        addEventListener(name, handler) { windowEvents[name] = handler; },
        webkit: { messageHandlers: { focusBrowser: { postMessage(value) { notifications.push(value); } } } }
    };
    vm.runInNewContext(source, {
        URL, location, document, history, window,
        MutationObserver: class {
            constructor(callback) { observer = callback; }
            observe() {}
        },
        requestAnimationFrame(callback) { frame = callback; }
    });
    return {
        history, location, documentEvents, windowEvents, notifications, historyCalls,
        rootAttributes, style, get redirected() { return redirected; },
        mutate() { observer(); if (frame) { const next = frame; frame = null; next(); } },
        anchor(href) {
            const attributes = new Map();
            const anchor = {
                href: new URL(href, location.href).href,
                hasAttribute(key) { return attributes.has(key); },
                setAttribute(key, value) { attributes.set(key, value); },
                removeAttribute(key) { attributes.delete(key); }
            };
            anchors.push(anchor);
            return anchor;
        },
        media() {
            const item = { paused: false, autoplay: true, muted: false,
                pause() { this.paused = true; }, matches() { return true; } };
            media.push(item);
            return item;
        }
    };
}

test("SPA push/replace block Reels, Explore, profile Reels, and encoded paths", () => {
    for (const path of ["/reel/123/", "/reels/", "/name/reels/", "/explore/",
        "/tv/123/", "/%72eel/123/", "/REELS/?from=dm"]) {
        for (const method of ["pushState", "replaceState"]) {
            const p = page();
            p.history[method]({}, "", path);
            assert.equal(p.historyCalls.length, 0, path);
            assert.deepEqual(p.notifications, ["blocked"]);
        }
    }
});

test("inbox, conversations, profiles, photos, and login retain navigation", () => {
    for (const path of ["/direct/inbox/", "/direct/t/123/", "/name/", "/p/photo/",
        "/accounts/login/?next=/direct/inbox/"]) {
        const p = page();
        p.history.pushState({}, "", path);
        assert.equal(p.historyCalls.length, 1, path);
        assert.equal(p.notifications.length, 0);
    }
});

test("back, page restore, and initial Reel routes return to messages", () => {
    const direct = page("https://www.instagram.com/reel/123/");
    assert.equal(direct.redirected, "https://www.instagram.com/direct/inbox/");
    assert.equal(direct.rootAttributes["data-doomscroll-blocked"], "");
    for (const event of ["popstate", "pageshow", "hashchange"]) {
        const p = page();
        p.location.href = "https://www.instagram.com/name/reels/";
        p.windowEvents[event]();
        assert.equal(p.redirected, "https://www.instagram.com/direct/inbox/");
    }
});

test("dynamically inserted links are filtered and recycled links recover", () => {
    const p = page();
    const reel = p.anchor("/reel/123/");
    const photo = p.anchor("/p/photo/");
    const dm = p.anchor("/direct/t/123/");
    p.mutate();
    assert.equal(reel.hasAttribute("data-doomscroll-hidden"), true);
    assert.equal(photo.hasAttribute("data-doomscroll-hidden"), false);
    assert.equal(dm.hasAttribute("data-doomscroll-hidden"), false);
    reel.href = "https://www.instagram.com/p/photo/";
    p.mutate();
    assert.equal(reel.hasAttribute("data-doomscroll-hidden"), false);
});

test("shared Reel clicks are stopped before Instagram's event handler", () => {
    const p = page();
    const anchor = p.anchor("/reel/123/");
    let prevented = false, stopped = false;
    p.documentEvents.click({
        target: { closest() { return anchor; } },
        preventDefault() { prevented = true; },
        stopImmediatePropagation() { stopped = true; }
    });
    assert.equal(prevented, true);
    assert.equal(stopped, true);
    assert.deepEqual(p.notifications, ["blocked"]);
});

test("new media and play attempts are muted and paused", () => {
    const p = page();
    const media = p.media();
    p.mutate();
    assert.equal(media.paused, true);
    assert.equal(media.muted, true);
    assert.equal(media.autoplay, false);
    media.paused = false;
    p.documentEvents.play({ target: media });
    assert.equal(media.paused, true);
    assert.match(p.style.textContent, /video, audio/);
});

test("non-Instagram challenge frames are not rewritten", () => {
    const p = page("https://challenge.example/");
    assert.equal(p.windowEvents.popstate, undefined);
    assert.equal(p.style.isConnected, false);
});
