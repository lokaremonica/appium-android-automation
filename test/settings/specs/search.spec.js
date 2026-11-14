import settingsPage from '../pageobjects/settings.page.js'

describe('Android Settings search', () => {
  // Force Settings to a fresh home screen so leftover state from a
  // previous run (e.g. still on the search screen) can't break the test.
  beforeEach(async () => {
    await settingsPage.launchFresh()
  })

  // A regular `function` (not an arrow) so we can use `this.timeout()`: on a fresh CI
  // emulator the search index may take up to ~90s to be built, longer than the
  // 60s default per-test timeout in wdio.conf.js.
  it('should show results when searching for "battery"', async function () {
    this.timeout(150000)

    await settingsPage.searchUntilResults('battery')

    await expect(settingsPage.searchResultsList).toBeDisplayed()
  })
})
