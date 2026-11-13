export const config = {
  runner: 'local',
  port: 4723,
  connectionRetryCount: 2,
  connectionRetryTimeout: 90000,

  specs: ['./test/specs/**/*.js'],

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
