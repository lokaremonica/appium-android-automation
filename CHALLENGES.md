# Challenges Log

Running log of real problems hit while building this framework, and how each was
diagnosed and fixed. Useful both as a record and as interview material — these are
genuine root-cause debugging stories, not hypotheticals.

---

### 1. Node/Java were installed as the wrong CPU architecture

**Symptom:** `node -v`, `npm -v`, `java -version` all failed with `Bad CPU type in
executable`.

**Diagnosis:** `uname -m` showed this Mac is Apple Silicon (arm64), but `file
$(which node)` showed an x86_64 (Intel) binary. Checked for Rosetta 2 (Apple's
x86→arm translator) with `arch -x86_64 /usr/bin/true` — it failed, confirming
Rosetta wasn't installed at all. So the x86_64 binaries had no way to run.

**Fix:** Installed native arm64 builds instead of installing Rosetta (faster,
no translation overhead): `brew install openjdk@17` and `brew install node@22`,
then linked them as the active versions and fixed `~/.zshrc` so a new terminal
picks up the right ones.

**Lesson:** Always check `uname -m` vs. `file $(which <tool>)` when you see
"bad CPU type" — it's almost always an architecture mismatch, not a corrupt
install.

---

### 2. `nvm`'s own Node installs were also broken, and shadowed the fix

**Symptom:** Even after installing a working Node via Homebrew, a fresh shell
sometimes still resolved to a broken x86_64 Node.

**Diagnosis:** `which -a node` showed multiple Node binaries on `PATH`, with
`nvm`'s (also corrupted, x86_64) version appearing *before* Homebrew's in PATH
order. `nvm`'s own shell hook was re-injecting its bin directory on every new
shell.

**Fix:** Pointed `nvm`'s default alias at the system Node instead of one of its
own version directories: `nvm alias default system`. Left the broken nvm
versions on disk untouched (not destructive), just stopped relying on them.

**Lesson:** "It's fixed" isn't verified until you test in a *fresh* shell —
env/version managers can silently re-break things on every new session.

---

### 3. First test run failed instantly — but the real cause was a leftover config change

**Symptom:** `npm test` failed immediately with a connection error to Appium.

**Diagnosis:** While debugging something else earlier, `services: []` had been
set in `wdio.conf.js` (disabling WebdriverIO's auto-start of the Appium server)
and never reverted. On top of that, a stale Appium process from earlier manual
testing was still holding the port.

**Fix:** Restored `services: ['appium', {...}]`, and killed the leftover
process squatting on port 4723.

**Lesson:** When debugging by temporarily disabling a piece of config, track
that change explicitly — it's easy to "fix" the original issue and leave a
decoy behind.

---

### 4. Session requests always failed with `ECONNREFUSED` — even though Appium was definitely running

**Symptom:** Appium logged that it started successfully and was listening, but
every single WebDriver session request from the test client got
`ECONNREFUSED`, no matter how many retries.

**Diagnosis:** Checked what Appium was told to bind to (`address: 'localhost'`)
vs. what the WebdriverIO client actually connects to
(`http://127.0.0.1:...`, hardcoded). On this Mac, the hostname `localhost`
resolves to the **IPv6** loopback (`::1`) first, so Appium ended up listening
only on IPv6 — while the client was always connecting via **IPv4**
(`127.0.0.1`). Two different network interfaces, so the connection was never
possible, regardless of timeouts or retry counts.

**Fix:** Changed the Appium service config to bind explicitly to
`address: '127.0.0.1'`, matching what the client uses.

**Lesson:** `localhost` and `127.0.0.1` are *not* guaranteed to be the same
address — IPv4/IPv6 resolution order is OS- and config-dependent. When a
client and server "should" be able to reach each other but can't, check which
literal address each side is actually using.

---

### 5. Session requests then failed with "Request timed out" instead

**Symptom:** After fixing #4, connections were accepted, but session creation
still failed — this time with a timeout, after many retries over ~80 seconds.

**Diagnosis:** An earlier debugging change had set `connectionRetryTimeout:
2000` (2 seconds) per request. But creating an Appium session involves
installing/launching the UiAutomator2 instrumentation on the device, which
genuinely takes several seconds — especially right after an emulator boot.
Every attempt was being killed and retried *before* it had a chance to finish,
so it looped forever without ever succeeding.

**Fix:** Set a realistic per-request timeout (`connectionRetryTimeout: 90000`)
with fewer retries (`connectionRetryCount: 2`) — give each attempt enough time
to actually finish instead of racing it.

**Lesson:** A timeout that's too short doesn't just fail fast — it can mask a
system that was about to succeed, and manifest as nondeterministic-looking
("flaky") failures that are actually a fixed, discoverable timing mismatch.

---

### 6. Search test would fail depending on where the app was left — test isolation

**Symptom:** While verifying the search test's locators with Appium MCP, the
home-screen search bar (`search_action_bar_title`) couldn't be found at all.

**Diagnosis:** Inspected the live screen with MCP's `generate_locators` — the
device was *already on the search screen*, left over from an earlier run.
Android resumes an app where it was left, so the test's first step was looking
for an element on a screen that wasn't showing. All three locators were
actually correct; the test just assumed a starting state it never set up.

**Fix:** Added a `launchFresh()` helper to the page object
(`driver.terminateApp()` + `driver.activateApp()` on `com.android.settings`,
then wait for the search bar) and call it in `beforeEach` of every spec.

**Lesson:** Every test must establish its own starting state. A test that
depends on what ran before it (or what a human did on the device) is flaky by
design. AI tooling (Appium MCP) was useful for *diagnosis* here — it showed the
real screen state instead of guessing.

---

### 7. The "screenshot on failure" hook never saved anything

**Symptom:** `afterTest` called `browser.takeScreenshot()` on failure, but no
screenshot files ever appeared.

**Diagnosis:** `takeScreenshot()` only *returns* the image as base64 data — it
doesn't write a file. The hook was silently discarding its own evidence.

**Fix:** Switched to `browser.saveScreenshot('./screenshots/<timestamp>_<test>.png')`
and gitignored `screenshots/`. This hook is what later caught the evidence for #9.

**Lesson:** Verify your debugging infrastructure actually works *before* you
need it — find out at the moment of a flaky failure is too late.

---

### 8. Waiting for the old screen to disappear never finished — stale element reference

**Symptom:** After tapping "About emulated device", the step
`searchBar.waitForDisplayed({ reverse: true })` (wait for the home search bar
to go away) timed out after 15s — even though a debug run's screenshot showed
the About page had opened.

**Diagnosis:** A debug spec with a plain 3s pause showed the search bar was
genuinely gone from the page source (`isExisting() === false`). The wait had
grabbed the search bar element *while home was still showing*, then kept
re-checking that same cached element reference, which kept reporting
"displayed" after the page changed.

**Fix:** Wait for something on the **destination** screen instead
(`text("Device name")` on the About page) rather than for something on the
screen being left to vanish.

**Lesson:** Prefer positive waits on the screen you expect to land on.
"Wait for X to disappear" is fragile with cached element references.

---

### 9. About-page tests flaky (~1 in 3 runs) — tap swallowed by a scrolling list (race condition)

**Symptom:** The same test would pass, then fail on the next run with no code
change. Failing runs never left the home screen; which test failed varied.

**Diagnosis:** Locators were ruled out (intermittent ⇒ timing, not a wrong
locator). The failure screenshot from #7 showed "About emulated device" fully
visible on the home screen, with the tap having had no effect. Root cause:
`UiScrollable.scrollIntoView()` returns as soon as the element becomes
visible — often while the list is still coasting (a fling). On Android, **a tap
on a moving list only stops the fling; it does not click the item.** Whether
the list had settled by click time varied run to run → a race.

**Fix:** `scrollToText()` in the page object now waits until the element's
y-position is identical on two consecutive reads (list stopped moving) before
returning it for a click. Verified 6/6 green runs of the spec plus a full green
suite. Deliberately *not* fixed with a fixed `pause()`.

**Lesson:** For flaky tests: (1) intermittent means timing/state, not
locators; (2) gather evidence (failure screenshots) instead of guessing — my
first two hypotheses (slow page load, stale coordinates) were wrong; (3) wait
on an observable condition (element stable), never a fixed sleep.

---

### 10. Download "failed" with exit code 1 — but the file was fine

**Symptom:** Downloading the ApiDemos APK printed a 100% progress bar, then
`curl exit: 1`.

**Diagnosis:** The command was pasted into a regular terminal with Claude Code's
`! ` prefix still on it. In zsh, a leading `!` is the *negation* operator — it
flips the exit status, so curl's success (0) was reported as 1. Verified the
download independently: 6.5 MB, a valid zip containing `AndroidManifest.xml`
and `classes.dex`.

**Fix:** Ran `adb install` without the `!` → `Success`.

**Lesson:** Verify the artifact, not just the exit code — and know that the
same text can mean different things in different shells.

---

### 11. `uiautomator dump` returned nothing while an Appium session was open

**Symptom:** `adb exec-out uiautomator dump` printed no UI hierarchy at all.

**Diagnosis:** Android allows only one UiAutomation connection at a time. The
Appium MCP session (UiAutomator2 server) was holding it, so the standalone dump
silently got nothing. Same root cause as why WDIO and an MCP session can't run
at the same time.

**Fix:** Inspected through the already-open Appium session instead
(`appium_get_page_source`), and closed the MCP session before running WDIO.

**Lesson:** One automation client per device at a time. Empty output from a
tool is a signal to check what else is holding the resource.

**Related finding (testability):** ApiDemos' ImageViews have no resource-id or
content-desc, forcing a brittle `className + instance(n)` locator. In a real app
that's also an accessibility bug (screen readers can't describe the image) —
the fix for testability and for accessibility is the same: add a content-desc.

---

### 12. The Allure report couldn't show what happened on screen

**Symptom:** Opening the Allure report, there was no way to see what the screen
looked like or what was tapped — only a list of WebDriver commands as text.

**Diagnosis:** Checked `allure-results/`: 154 results from *every run since the
project started* (the folder was never cleared), ~3,800 JSON step attachments,
and only 8 screenshots — all from failed tests, because the `afterTest` hook only
captured on failure. No video at all. Unlike Playwright, Appium has no built-in
trace viewer, so nothing is captured unless you wire it up.

**Fix (in `wdio.conf.js`):**
- `onPrepare` — wipe `allure-results/` and `screenshots/` so each report is one run.
- `beforeTest` — `driver.startRecordingScreen()` (Android `screenrecord`).
- `afterTest` — final screenshot for every test; on failure also the page source
  XML (the UI tree, same as Inspector) and a PNG on disk; then
  `driver.stopRecordingScreen()` → base64 MP4 → attached to the test as video.
- Verified with a deliberately failing throwaway test: it got screenshot + page
  source + video. Also caught a duplicate screenshot on failures
  (`saveScreenshot()` also triggers Allure's auto-attach) and removed it.

**Trade-off:** video added ~25% to suite time and ~30 MB of results per run.
Common CI practice is to keep video only for failures — a one-line change
(`if (!passed)` around the video attach).

**Lesson:** A test report is only as good as the evidence you deliberately
capture. Build the "trace" for mobile from video + screenshots + UI tree.

---

### 13. Search test passed locally but failed on CI — fresh device, empty search index

**Symptom:** First CI run: 11/12 green. The search test failed with
`list_results still not displayed after 10000ms`. It had never failed locally.

**Diagnosis:** Downloaded the `failure-evidence` artifact from the CI run. The
failure screenshot showed "battery" typed correctly and the message **"No results
for battery"**. So locators and taps were fine — search ran, but returned nothing.
Root cause: Settings search reads from an index Android builds **in the background
some time after a device's first boot**. The local emulator had been running for
days (index ready); the CI emulator is created fresh minutes before the tests
(index still empty).

**Fix:** `searchUntilResults()` in the Settings page object re-submits the query
until results appear (bounded at 90s, with a timeout message naming the
condition). The test raises its own Mocha timeout to 150s with `this.timeout()`,
since the suite default is 60s. On a warm device the first attempt succeeds, so
local runs are unaffected.

**Trade-off:** if search were genuinely broken, the test now takes ~90s to fail
instead of 10s. Acceptable: it still fails, with a precise message. Not used: a
blanket "retry the whole test" setting, which would hide this kind of
environment difference instead of naming it.

**Lesson:** "Passes locally, fails on CI" is usually an environment difference,
not a flaky test. CI devices are *fresh* every run: anything that relies on a
warmed-up device (indexes, caches, first-run dialogs) must be an explicit,
named precondition. Having CI upload failure screenshots turned this into a
5-minute diagnosis.
