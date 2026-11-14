import settingsPage from '../pageobjects/settings.page.js'

describe('Android Network app', () => {
  it('should display the network entry point', async () => {
    await settingsPage.networkEntryPoint.waitForDisplayed({ timeout: 10000 })
    expect(await settingsPage.networkEntryPoint.isDisplayed()).toBe(true)
    await settingsPage.openNetworkSettings()

    await settingsPage.networkScreenHeader.waitForDisplayed({ timeout: 10000 })
    expect(await settingsPage.networkScreenHeader.isDisplayed()).toBe(true)
  })
})