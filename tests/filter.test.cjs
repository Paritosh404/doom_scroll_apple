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
    let observer, frame, redirected, assigned;
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
        replace(value) { redirected = value; },
        assign(value) { assigned = value; }
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
        rootAttributes, style, get redirected() { return redirected; }, get assigned() { return assigned; },
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
            const attributes = new Map();
            const item = { paused: false, autoplay: true, muted: false,
                tagName: "VIDEO", currentSrc: "https://cdn.example/selected.mp4",
                isConnected: true, loop: true,
                getAttribute(key) { return attributes.get(key) || ""; },
                setAttribute(key, value) { attributes.set(key, value); },
                removeAttribute(key) { attributes.delete(key); },
                querySelector() { return null; },
                pause() { this.paused = true; }, matches() { return true; } };
            media.push(item);
            return item;
        }
    };
}


test("Reels and Explore browsing stay blocked, but individual permalinks open", () => {
    for (const route of ["/reels/", "/name/reels/", "/explore/", "/tv/"]) {
        const p = page();
        p.history.pushState({}, "", route);
        assert.equal(p.historyCalls.length, 0);
        assert.deepEqual(p.notifications, ["blocked"]);
    }
    for (const route of ["/reel/ABC/", "/reels/ABC/", "/p/ABC/", "/tv/ABC/"]) {
        const p = page();
        p.history.pushState({}, "", route);
        assert.equal(p.assigned, "https://www.instagram.com" + route);
    }
});

test("Stories, DMs, and Following videos are not paused or hidden", () => {
    for (const route of ["/stories/person/123/", "/stories/highlights/123/",
        "/direct/t/123/", "/?variant=following"]) {
        const p = page("https://www.instagram.com" + route);
        const media = p.media();
        p.mutate();
        p.documentEvents.play({ target: media });
        assert.equal(media.paused, false, route);
        assert.equal(media.muted, false);
        assert.equal(p.documentEvents.touchmove, undefined);
        assert.equal(p.rootAttributes["data-doomscroll-single"], undefined);
        assert.equal(p.redirected, undefined);
    }
});

test("home requests Following, never falls back to recommended feed", () => {
    const p = page("https://www.instagram.com/");
    assert.equal(p.redirected, "https://www.instagram.com/?variant=following");
    const following = page("https://www.instagram.com/?variant=following");
    assert.equal(following.redirected, undefined);
    following.history.pushState({}, "", "/");
    assert.equal(following.assigned, "https://www.instagram.com/?variant=following");
});

test("shared Reel click opens a standalone viewer instead of being hidden", () => {
    const p = page();
    const anchor = p.anchor("/reel/ABC/");
    p.mutate();
    assert.equal(anchor.hasAttribute("data-doomscroll-hidden"), false);
    let prevented = false;
    p.documentEvents.click({
        target: { closest() { return anchor; } },
        preventDefault() { prevented = true; }, stopImmediatePropagation() {}
    });
    assert.equal(prevented, true);
    assert.equal(p.assigned, anchor.href);
});

test("single viewer permits same post, blocks next/previous SPA navigation", () => {
    for (const method of ["pushState", "replaceState"]) {
        const p = page("https://www.instagram.com/reel/ABC/");
        p.history[method]({}, "", "/reel/ABC/?source=dm");
        assert.equal(p.historyCalls.length, 1);
        for (const route of ["/reel/NEXT/", "/p/NEXT/", "/reels/NEXT/"]) {
            p.history[method]({}, "", route);
        }
        assert.equal(p.historyCalls.length, 1);
        assert.equal(p.notifications.length, 3);
    }
});

test("single viewer stops swipe, wheel and next-video keys; Stories keep gestures", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    for (const name of ["touchmove", "wheel", "keydown"]) {
        let prevented = false, stopped = false;
        p.documentEvents[name]({ key: "ArrowDown", preventDefault() { prevented = true; },
            stopImmediatePropagation() { stopped = true; } });
        assert.equal(prevented, true);
        assert.equal(stopped, true);
    }
    const container = { scrollTop: 700 };
    p.documentEvents.scroll({ target: container });
    assert.equal(container.scrollTop, 0);
    assert.equal(page("https://www.instagram.com/stories/person/123/").documentEvents.touchmove, undefined);
});

test("only first viewer video plays; subsequent and recycled media are stopped", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    const first = p.media(), next = p.media();
    p.mutate();
    assert.equal(first.paused, false);
    assert.equal(first.getAttribute("data-doomscroll-selected"), "");
    assert.equal(first.controls, true);
    assert.equal(first.loop, false);
    assert.equal(next.paused, true);
    first.currentSrc = "https://cdn.example/next.mp4";
    p.mutate();
    assert.equal(first.paused, true);
    assert.deepEqual(p.notifications, ["blocked"]);
});

test("replacing the selected player cannot start the next Reel", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    const first = p.media();
    p.mutate();
    first.isConnected = false;
    const replacement = p.media();
    p.mutate();
    assert.equal(replacement.paused, true);
});

test("finished Reel cannot trigger Instagram's ended handler", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    const media = p.media();
    let stopped = false;
    p.documentEvents.ended({ target: media, stopImmediatePropagation() { stopped = true; } });
    assert.equal(stopped, true);
    assert.equal(media.paused, true);
});

test("restored next-Reel URL returns to the originally selected post", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    p.location.href = "https://www.instagram.com/reel/NEXT/";
    p.windowEvents.popstate();
    assert.equal(p.redirected, "https://www.instagram.com/reel/ABC/");
});

test("next-post links hide in viewer; messages and Stories links remain usable", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    const next = p.anchor("/reel/NEXT/"), dm = p.anchor("/direct/inbox/"),
        story = p.anchor("/stories/person/123/");
    p.mutate();
    assert.equal(next.hasAttribute("data-doomscroll-hidden"), true);
    assert.equal(dm.hasAttribute("data-doomscroll-hidden"), false);
    assert.equal(story.hasAttribute("data-doomscroll-hidden"), false);
});

test("non-Instagram challenge frames are untouched", () => {
    const p = page("https://challenge.example/");
    assert.equal(p.windowEvents.popstate, undefined);
    assert.equal(p.style.isConnected, false);
});

test("resolving the initial relative media URL does not block the selected Reel", () => {
    const p = page("https://www.instagram.com/reel/ABC/");
    const media = p.media();
    media.currentSrc = "";
    media.setAttribute("src", "/media/selected.mp4");
    p.mutate();
    media.currentSrc = "https://www.instagram.com/media/selected.mp4";
    p.documentEvents.play({ target: media });
    assert.equal(media.paused, false);
});
