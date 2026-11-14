import settingsPage from '../pageobjects/settings.page.js'

describe('About device screen', () => {
  beforeEach(async () => {
    await settingsPage.launchFresh()
  })

  // Operations: scroll, tap, read text
  it('should show Android version 14 after scrolling to About', async () => {
    await settingsPage.openAboutDevice()

    const version = await settingsPage.getAndroidVersion()
    expect(version).toBe('14')
  })

  // Operations: system back navigation
  it('should return to the Settings home screen with the back button', async () => {
    await settingsPage.openAboutDevice()
    await expect(settingsPage.aboutDeviceName).toBeDisplayed()

    await driver.back()

    await settingsPage.searchBar.waitForDisplayed({ timeout: 10000 })
    await expect(settingsPage.searchBar).toBeDisplayed()
  })
})
