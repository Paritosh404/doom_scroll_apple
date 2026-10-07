const {test, before, after, beforeEach, afterEach} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {join} = require("node:path");
const playwright = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const script = fs.readFileSync("DoomScroll/InstagramFilter.js", "utf8");
let browser, context, page;

// A tiny real audio track exercises HTML media playback without external services.
function tone() {
    const samples = 44100 * 4;
    const buffer = Buffer.alloc(44 + samples * 2);
    buffer.write("RIFF"); buffer.writeUInt32LE(buffer.length - 8, 4);
    buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(44100, 24); buffer.writeUInt32LE(88200, 28);
    buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
    for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.sin(i * 2 * Math.PI * 440 / 44100) * 2000, 44 + i * 2);
    return buffer;
}
const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{margin:0;font:16px sans-serif}#stories{height:80px;background:salmon}' +
    '.card{height:600px;overflow:hidden}video{width:1080px;height:600px;object-fit:cover}' +
    '</style><div id="stories">Stories</div><article class="card">' +
    '<a id="shared" href="/reel/SELECTED/">Shared Reel</a><div id="video-wrapper">' +
    '<video id="selected" muted playsinline preload="auto" src="/tone.wav"></video></div></article>' +
    '<article class="card"><video id="suggested" muted src="/tone.wav"></video>' +
    '<a href="/reel/NEXT/">Suggested Reel</a></article><div style="height:2000px">More homepage</div>';
before(async () => {
    browser = await playwright[process.env.TEST_BROWSER || "webkit"].launch({
        headless: true,
        ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})
    });
});
after(async () => { await browser?.close(); });
beforeEach(async () => {
    context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    page = await context.newPage();
    await context.addInitScript("window.bridgeEvents=[]; window.webkit={messageHandlers:{focusBrowser:{postMessage(e){window.bridgeEvents.push(e)}}}};\n" + script);
    await page.route("**/*", route => route.request().url().includes(".wav")
        ? route.fulfill({contentType:"audio/wav", body:tone()})
        : route.fulfill({contentType:"text/html",body:html}));
});
afterEach(async () => { await context?.close(); });
const player = () => page.locator("#doomscroll-player");
async function openHome() { await page.goto("https://www.instagram.com/"); }
async function openVideo() {
    await openHome();
    await page.locator("#selected").click({position:{x:100,y:100}});
    await player().waitFor();
}

test("normal Home keeps Stories and regular scrolling, with no Following redirect", async () => {
    await openHome();
    assert.equal(page.url(), "https://www.instagram.com/");
    assert.equal(await page.locator("#stories").isVisible(), true);
    assert.equal(await player().count(), 0);
    await page.evaluate(() => window.scrollTo(0, 500));
    assert.ok(await page.evaluate(() => scrollY) > 0);
});
test("selected video is moved into an independent viewport-sized modal", async () => {
    await openVideo();
    const dialog = page.getByRole("dialog", {name:"Single video"});
    const box = await dialog.boundingBox();
    const video = await player().locator("video").boundingBox();
    assert.ok(box.width <= 390 && box.x >= 0);
    assert.ok(video.x >= 0 && video.x + video.width <= 391, JSON.stringify(video));
    assert.equal(await player().locator("video").evaluate(v => getComputedStyle(v).objectFit), "contain");
    assert.equal(await player().locator("video").count(), 1);
    assert.equal(await page.locator("article #selected").count(), 0);
    await page.setViewportSize({width:844,height:390});
    const landscape = await player().locator("video").boundingBox();
    assert.ok(landscape.width <= 844 && landscape.height <= 390);
    fs.mkdirSync("build/test-results", {recursive:true});
    await page.screenshot({path:join("build/test-results", "single-player.png")});
});
test("Play with sound unmutes and starts real media playback", async () => {
    await openVideo();
    await page.getByRole("button", {name:"Play with sound"}).click();
    await page.waitForFunction(() => {
        const v=document.querySelector("#doomscroll-player")?.shadowRoot.querySelector("video");
        return v && !v.paused && !v.muted && v.volume === 1 && v.currentTime > 0;
    });
});
test("wheel/touch and URL-less SPA navigation cannot advance to suggestions", async () => {
    await openVideo();
    const result = await page.evaluate(() => {
        const move = new Event("touchmove", {bubbles:true,cancelable:true});
        window.dispatchEvent(move);
        history.pushState({next:true}, "", "/reel/NEXT/");
        history.replaceState({next:true}, "");
        return {blocked:move.defaultPrevented,path:location.pathname};
    });
    assert.equal(result.blocked, true);
    assert.equal(result.path, "/");
    const wheelBlocked = await page.evaluate(() => {
        const event = new WheelEvent("wheel", {deltaY:1200,bubbles:true,cancelable:true});
        window.dispatchEvent(event);
        return event.defaultPrevented;
    });
    assert.equal(wheelBlocked, true);
    // Mobile WebKit has no mouse wheel input in Playwright.
    if (process.env.TEST_BROWSER === "chromium") await page.mouse.wheel(0, 1200);
    assert.equal(await player().locator("video").getAttribute("id"), "selected");
    assert.equal(await page.locator("#suggested").evaluate(v=>v.paused), true);
});
test("a swipe started on inline video opens the player; Story swipes stay free", async () => {
    await openHome();
    const blocked = await page.locator("#selected").evaluate(v => {
        v.dispatchEvent(new Event("touchstart", {bubbles:true}));
        const move=new Event("touchmove", {bubbles:true,cancelable:true});
        v.dispatchEvent(move);
        return move.defaultPrevented;
    });
    assert.equal(blocked, true);
    assert.equal(await player().count(), 1);
    await page.goto("https://www.instagram.com/stories/person/123/");
    const storyBlocked = await page.locator("#selected").evaluate(v => {
        v.dispatchEvent(new Event("touchstart", {bubbles:true}));
        const move=new Event("touchmove", {bubbles:true,cancelable:true});
        v.dispatchEvent(move);
        return move.defaultPrevented;
    });
    assert.equal(storyBlocked, false);
    assert.equal(await player().count(), 0);
});
test("closing inline player restores the same Home document and video", async () => {
    await openVideo();
    await page.getByRole("button", {name:"Close",exact:true}).click();
    assert.equal(await player().count(), 0);
    assert.equal(await page.locator("article #selected").count(), 1);
    assert.equal(page.url(), "https://www.instagram.com/");
    assert.equal(await page.locator("#stories").isVisible(), true);
    assert.ok((await page.evaluate(()=>bridgeEvents)).includes("player-close"));
});
test("shared Reel permalink isolates only its selected video", async () => {
    await page.goto("https://www.instagram.com/direct/t/123/");
    await page.locator("#shared").click();
    await page.waitForURL("**/reel/SELECTED/");
    await player().locator("video").waitFor();
    assert.equal(await player().locator("video").getAttribute("id"), "selected");
    await page.getByRole("button", {name:"Close",exact:true}).click();
    assert.ok((await page.evaluate(()=>bridgeEvents)).includes("player-return"));
});
test("replacement media source stops instead of playing a suggested clip", async () => {
    await openVideo();
    await player().locator("video").evaluate(v=>{v.src="/next.wav";v.load();});
    await page.waitForFunction(()=>document.querySelector("#doomscroll-player").shadowRoot.querySelector(".status").textContent.includes("changed the video"));
    assert.equal(await player().locator("video").evaluate(v=>v.paused),true);
});
