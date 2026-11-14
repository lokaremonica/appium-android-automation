import settingsPage from '../pageobjects/settings.page.js'

describe('Display settings', () => {
  let originalDarkTheme

  beforeEach(async () => {
    await settingsPage.launchFresh()
    await settingsPage.openDisplaySettings()
    await settingsPage.darkThemeSwitch.waitForDisplayed({ timeout: 10000 })
    originalDarkTheme = await settingsPage.isDarkThemeOn()
  })

  // Put the device back the way we found it, even if the test failed,
  // so this test can't leak state into other tests.
  afterEach(async () => {
    if ((await settingsPage.isDarkThemeOn()) !== originalDarkTheme) {
      await settingsPage.darkThemeSwitch.click()
    }
  })

  // Operations: toggle a switch, read an element attribute
  it('should flip the Dark theme switch when tapped', async () => {
    await settingsPage.darkThemeSwitch.click()

    // Wait for the UI to reflect the new state instead of using a fixed sleep.
    await browser.waitUntil(
      async () => (await settingsPage.isDarkThemeOn()) !== originalDarkTheme,
      { timeout: 5000, timeoutMsg: 'Dark theme switch did not change state' }
    )
  })
})
