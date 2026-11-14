import settingsPage from '../pageobjects/settings.page.js'

describe('Android Settings search', () => {
  // Force Settings to a fresh home screen so leftover state from a
  // previous run (e.g. still on the search screen) can't break the test.
  beforeEach(async () => {
    await settingsPage.launchFresh()
  })

  it('should show results when searching for "battery"', async () => {
    await settingsPage.searchFor('battery')

    await settingsPage.searchResultsList.waitForDisplayed({ timeout: 10000 })
    expect(await settingsPage.searchResultsList.isDisplayed()).toBe(true)
  })
})
