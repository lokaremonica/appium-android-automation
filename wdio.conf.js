import fs from 'node:fs'
import allureReporter from '@wdio/allure-reporter'

export const config = {
  runner: 'local',
  port: 4723,
  connectionRetryCount: 2,
  connectionRetryTimeout: 90000,

  // Tests are grouped by the app under test:
  //   test/settings/ — Android's built-in Settings app (native, preinstalled)
  //   test/apidemos/ — ApiDemos (native, installed from apps/ApiDemos-debug.apk)
  specs: ['./test/**/specs/**/*.spec.js'],

  // Run one group with: npm run test:settings  /  npm run test:apidemos
  suites: {
    settings: ['./test/settings/specs/**/*.spec.js'],
    apidemos: ['./test/apidemos/specs/**/*.spec.js'],
  },

  maxInstances: 1,

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator',
      // Launch the device's built-in Settings app — no APK to install for this first test.
      'appium:appPackage': 'com.android.settings',
      'appium:appActivity': '.Settings',
    },
  ],

  logLevel: 'info',
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'allure-results',
        disableWebdriverStepsReporting: false,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],

  // ---------- Test evidence for the Allure report ----------
  // Appium has no built-in "trace viewer" like Playwright, so we build the equivalent:
  // a video of every test, a final screenshot, and the UI tree (page source) on failure.

  // Runs once, before any test: start from an empty report so old runs don't mix in.
  onPrepare: function () {
    fs.rmSync('./allure-results', { recursive: true, force: true })
    fs.rmSync('./screenshots', { recursive: true, force: true })
    fs.mkdirSync('./screenshots', { recursive: true })
  },

  // Before each test: start recording the device screen (Android's `screenrecord`).
  // Hard limit is 180s per recording, far longer than any single test here.
  beforeTest: async function () {
    await driver.startRecordingScreen({ timeLimit: '180', bitRate: '2000000' })
  },

  // After each test, pass or fail, attach evidence to that test in Allure.
  afterTest: async function (test, _context, { passed }) {
    // 1. Final screenshot. The Allure reporter automatically attaches any screenshot
    //    taken via takeScreenshot()/saveScreenshot() to the current test.
    if (passed) {
      await browser.takeScreenshot()
    } else {
      // 2. On failure: also keep the PNG on disk for quick local debugging, and attach
      //    the UI tree at the moment of failure (the same XML Inspector shows).
      const name = test.title.replace(/[^a-z0-9]+/gi, '_')
      await browser.saveScreenshot(`./screenshots/${Date.now()}_${name}.png`)
      allureReporter.addAttachment('Page source (UI tree)', await driver.getPageSource(), 'application/xml')
    }

    // 3. Stop recording and attach the video. stopRecordingScreen() returns the MP4 as
    //    base64 text, so convert it to binary before attaching.
    //    To keep video only for failures (common on CI), wrap this in `if (!passed)`.
    try {
      const video = await driver.stopRecordingScreen()
      allureReporter.addAttachment('Screen recording', Buffer.from(video, 'base64'), 'video/mp4')
    } catch (err) {
      console.warn(`Could not attach screen recording: ${err.message}`)
    }
  },

  services: [
    [
      'appium',
      {
        args: {
          address: '127.0.0.1',
        },
        logPath: './logs',
      },
    ],
  ],
}
