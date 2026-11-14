# Mobile Test Automation Framework (Appium + WebdriverIO)

End-to-end UI test automation for **native Android apps**, built with **Appium 3**,
**WebdriverIO 10** and the **Page Object Model**, with **Allure** reports that include
a video, a screenshot and (on failure) the UI tree for every test.

It tests two real apps on an Android emulator:

| App | What it is | How it gets on the device |
|---|---|---|
| **Settings** (`com.android.settings`) | Android's built-in system Settings app | Preinstalled, nothing to install |
| **ApiDemos** (`io.appium.android.apis`) | Google's Android API sample app, packaged by the Appium team as a standard automation practice target | Installed from `apps/ApiDemos-debug.apk` |

Both are **native** apps: their UI is built from Android widgets (`android.widget.CheckBox`,
`SeekBar`…), so they're automated through **UiAutomator2**. See
[Native vs. mobile web vs. hybrid](#native-vs-mobile-web-vs-hybrid) below.

---

## Tech stack

| Layer | Tool | Version | Role |
|---|---|---|---|
| Test runner | WebdriverIO (`@wdio/cli`, `local-runner`) | 10.2 | Runs specs, manages sessions and hooks |
| Test framework | Mocha (`@wdio/mocha-framework`) | — | `describe` / `it` / `beforeEach` structure |
| Assertions | `expect-webdriverio` | — | Auto-waiting assertions (`toBeDisplayed`, `toHaveText`) |
| Automation server | Appium | 3.9 | Translates WebDriver commands into device actions |
| Android driver | `appium-uiautomator2-driver` | 8.7 | Drives native Android UI via Google's UiAutomator2 |
| Appium lifecycle | `@wdio/appium-service` | 10.2 | Starts/stops Appium automatically per run |
| Reporting | `@wdio/allure-reporter` + Allure CLI | 2.46 | HTML report with steps, screenshots, video |
| Device | Android Emulator, AVD `Pixel_6_API_34` | Android 14 | arm64 system image on Apple Silicon |
| Runtime | Node.js / OpenJDK | 22 / 17 | Native arm64 builds |
| AI-assisted tooling | Appium MCP (`appium-mcp`, see `.mcp.json`) | — | Live locator discovery and diagnosis from Claude Code |

---

## Project structure

```
Mobile-test/
├── wdio.conf.js                  # Runner config: capabilities, suites, Appium service, evidence hooks
├── package.json                  # Dependencies and npm scripts
├── test/
│   ├── settings/                 # Built-in Settings app
│   │   ├── pageobjects/
│   │   │   └── settings.page.js  #   Locators + actions (launchFresh, scrollToText, search, about, display)
│   │   └── specs/
│   │       ├── settings.spec.js  #   Home screen loads
│   │       ├── network.spec.js   #   Navigate into "Network & internet"
│   │       ├── search.spec.js    #   Type into search, results appear
│   │       ├── about.spec.js     #   Scroll, read Android version, back navigation
│   │       └── display.spec.js   #   Toggle Dark theme switch (and restore it)
│   └── apidemos/                 # ApiDemos app (installed from APK)
│       ├── pageobjects/
│       │   └── apidemos.page.js  #   Locators + W3C gestures (drag & drop, seek bar)
│       └── specs/
│           └── apidemos.spec.js  #   Drag & drop, checkboxes, seek bar, image visibility
├── apps/                         # App binaries under test (gitignored, see "Setup")
├── screenshots/                  # Failure screenshots (gitignored, recreated each run)
├── allure-results/ allure-report/  # Report data and HTML (gitignored)
├── .mcp.json                     # Appium MCP server config for Claude Code
├── SETUP.md                      # Step-by-step environment setup log (Mac M1, SDK, emulator)
└── CHALLENGES.md                 # Real problems hit while building this, with root causes and fixes
```

---

## Getting started

Full environment setup (Java, Node, Android SDK, emulator) is documented step by step in
[`SETUP.md`](SETUP.md). The short version:

**Prerequisites:** Node 22, JDK 17, Android SDK with `ANDROID_HOME` set, and a running
emulator (`adb devices` lists `emulator-5554`).

```bash
# 1. Install dependencies (Appium and the UiAutomator2 driver are project dependencies)
npm install

# 2. Download and install the ApiDemos APK (only needed for the apidemos suite)
mkdir -p apps
curl -fL -o apps/ApiDemos-debug.apk \
  https://github.com/appium/android-apidemos/releases/download/v6.0.18/ApiDemos-debug.apk
adb install -r apps/ApiDemos-debug.apk

# 3. Run the tests
npm test
```

You don't start Appium yourself: `@wdio/appium-service` starts it on `127.0.0.1:4723`
for each run and stops it afterwards.

## Running tests

| Command | Runs |
|---|---|
| `npm test` | Everything (6 spec files, 12 tests) |
| `npm run test:settings` | Only the Settings app suite |
| `npm run test:apidemos` | Only the ApiDemos suite |
| `npx wdio run wdio.conf.js --spec test/settings/specs/search.spec.js` | A single spec file |
| `npm run report` | Generate and open the Allure HTML report from the last run |

---

## Test coverage

| Spec | Test | Operations demonstrated |
|---|---|---|
| `settings.spec.js` | Search entry point is displayed | Wait for element, visibility assertion |
| `network.spec.js` | Open "Network & internet" | Tap, navigate, verify destination screen |
| `search.spec.js` | Searching "battery" shows results | Tap, type text (`setValue`), wait for results |
| `about.spec.js` | Android version is 14 | Scroll into view, tap, read text via sibling locator (`fromParent`) |
| `about.spec.js` | Back button returns home | System back navigation (`driver.back()`) |
| `display.spec.js` | Dark theme switch flips | Toggle switch, read `checked` attribute, restore state in `afterEach` |
| `apidemos.spec.js` | Dot dropped on dot shows "Dropped!" | **Drag and drop**: long press → move → release (W3C actions) |
| `apidemos.spec.js` | Check then uncheck a checkbox | **Checkbox**: tap, verify state before and after each tap |
| `apidemos.spec.js` | Checkboxes toggle independently | Checking one doesn't affect another |
| `apidemos.spec.js` | Seek bar dragged to the right end → 100 | **Drag (slider)**: percent → pixel maths, read value |
| `apidemos.spec.js` | Seek bar dragged to the left end → 0 | Same, opposite direction (value clamps at the end) |
| `apidemos.spec.js` | Image is visible with non-zero size | **Image visibility**: `isDisplayed()` plus a size check |

---

## Design decisions

These are the patterns the framework is built on, and why.

### Page Object Model
Specs describe **what** the user does (`apiDemos.dragDotOnto(1, 2)`); page objects know
**how** (locators, coordinates, gestures). When the UI changes, only the page object is
updated; the specs keep reading like test cases.

### Every test starts from a clean state
- Settings: `launchFresh()` force-stops the app (`terminateApp`) and relaunches it.
- ApiDemos: `open(activity)` force-stops the app and **launches the exact screen under test**
  with `mobile: startActivity` (for example `io.appium.android.apis/.view.SeekBar1`),
  instead of tapping through menus. That's faster, and fewer steps means fewer places to go flaky.
- Tests that change device settings put them back afterwards (Dark theme in `afterEach`).

### Locator strategy (most to least stable)
1. **Accessibility id** (`~Checkbox 1` → Android `content-desc`): fast, works on iOS too.
2. **Resource id** (`id=io.appium.android.apis:id/seek`).
3. **UiAutomator selector** (`android=new UiSelector()...`) for text, relationships and scrolling.
4. **Class + index**, only when the app gives nothing better. The ApiDemos images have no id
   or content-desc, which is both a testability gap and an accessibility bug (screen readers
   can't describe them). The right fix is in the app: add a `contentDescription`.

### Waiting on conditions, never fixed sleeps
- Wait for an element on the **destination** screen, not for the old screen to disappear
  (cached element references can stay "displayed" after the page changes).
- `scrollToText()` waits until the scrolled element **stops moving** before tapping. On
  Android, a tap on a list that's still coasting only stops the scroll; it doesn't click.
  That race was the root cause of a flaky test (see `CHALLENGES.md` #9).

### Gestures as W3C pointer actions
Every drag is the same sequence: **move → pointer down → pause → move → pointer up**
(`pointerDrag()` in `apidemos.page.js`). Elements are converted to screen pixels with
`centerOf()` (top-left corner + half the size).
- Drag and drop **holds 1 second** first, because the app only starts a drag after a long press.
  Without the hold the app sees a swipe and nothing happens.
- The seek bar drag has **no hold**, because sliders respond to touch immediately.

---

## Reports and test evidence

Appium has no built-in trace viewer like Playwright's, so the framework builds the
equivalent with hooks in `wdio.conf.js`:

| Hook | What it captures |
|---|---|
| `onPrepare` | Clears `allure-results/` and `screenshots/` so each report shows one run |
| `beforeTest` | Starts a **screen recording** of the device (`driver.startRecordingScreen()`) |
| `afterTest` | Attaches a **final screenshot** for every test. On failure, also attaches the **page source XML** (the UI tree, same as Appium Inspector) and saves a PNG to `screenshots/`. Then stops recording and attaches the **MP4 video**. |

Open the report with `npm run report`, choose a test, and you'll see its steps (every
WebDriver command with timings), the video, and the screenshot.

**Trade-off:** video adds about 25% to suite time and about 30 MB per run. On CI, a common choice is
video for failed tests only: wrap the attach in `if (!passed)` (marked in the config).

---

## AI-assisted testing (Appium MCP)

`.mcp.json` registers the **Appium MCP** server, so an AI assistant (Claude Code) can
start its own Appium session and inspect the live emulator: list elements, rank locators
(accessibility id → id → UiAutomator → XPath), tap, type, drag and take screenshots.

How it was used here:
- **Locator discovery:** every locator in both page objects was checked against the live
  screen before it went into code.
- **Diagnosis:** it showed that a "broken locator" was really leftover app state (the device
  was already on the search screen), which led to the test-isolation fix.
- **Teaching and demos:** reproducing gestures step by step (for example, the same drag with
  a 0 ms and a 1000 ms hold) to show why the long press matters.

The deterministic WebdriverIO suite stays the source of truth for regressions; the AI
tooling is for exploration and diagnosis. Only one automation client can control the
device at a time, so close the MCP session (or Appium Inspector) before running `npm test`.

---

## Native vs. mobile web vs. hybrid

| Type | What it is | How Appium automates it |
|---|---|---|
| **Native** (this framework) | UI built from platform widgets (Kotlin/Java, Swift) | UiAutomator2 / XCUITest; locators like resource-id and accessibility id |
| **Mobile web** | A website in the phone's browser | Chrome/Safari driver; CSS/XPath on the HTML |
| **Hybrid** | A native app with embedded web content (WebView) | Switch context: `driver.switchContext('WEBVIEW_...')`, then back to `'NATIVE_APP'` |

A mobile-web or hybrid suite would go in its own folder next to `settings/` and `apidemos/`.

---

## Challenges and lessons

[`CHALLENGES.md`](CHALLENGES.md) is a running log of 12 real problems hit while building
this, each with symptom, diagnosis, fix and lesson. Highlights:

- **IPv4 vs. IPv6:** `localhost` resolved to `::1` while the client used `127.0.0.1` (#4)
- **Test isolation:** a test depended on where the previous run left the app (#6)
- **Stale element reference:** waiting for the old screen to vanish never finished (#8)
- **Flaky race condition:** a tap swallowed by a still-scrolling list, found from a
  failure screenshot after two wrong hypotheses were ruled out (#9)
- **Report evidence:** building video + screenshot + UI-tree capture for Allure (#12)

---

## Roadmap

- [ ] CI pipeline (GitHub Actions with an Android emulator) with a quality gate that
      blocks merges when tests fail
- [ ] iOS coverage with the XCUITest driver, reusing the same Page Object pattern
- [ ] Hybrid / WebView example with context switching
- [ ] Comparison suites in Espresso (Android) and XCTest (iOS), the native in-process frameworks
- [ ] Video only for failed tests on CI; retries with flaky-test reporting
