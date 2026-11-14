import settingsPage from '../pageobjects/settings.page.js'
describe('Android Settings app', () => {
  it('should display the search entry point', async () => {
    await settingsPage.searchBar.waitForDisplayed({ timeout: 10000 })

    expect(await settingsPage.searchBar.isDisplayed()).toBe(true)
  })
})
