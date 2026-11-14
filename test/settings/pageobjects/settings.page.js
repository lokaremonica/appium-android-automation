const SETTINGS_PACKAGE = 'com.android.settings'

// Scrolls the first scrollable container until an element with the given text
// is on screen, then waits for the list to STOP MOVING before returning it.
//
// Why: scrollIntoView returns as soon as the element is visible, often while the
// list is still coasting (flinging). On Android, a tap on a moving list only stops
// the fling; it does not click the item. That race made About-page tests flaky.
const scrollToText = async (text) => {
  await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${text}"))`)
  const el = await $(`android=new UiSelector().text("${text}")`)
  await el.waitForDisplayed({ timeout: 5000 })

  let last = null
  await browser.waitUntil(
    async () => {
      const { y } = await el.getLocation()
      const stable = y === last
      last = y
      return stable
    },
    { timeout: 5000, interval: 300, timeoutMsg: `"${text}" never stopped moving` }
  )
  return el
}

class SettingsPage {
  // ---------- App lifecycle ----------

  // Kill and relaunch Settings so every test starts on the home screen,
  // regardless of where a previous test (or a human) left the app.
  async launchFresh() {
    await driver.terminateApp(SETTINGS_PACKAGE)
    await driver.activateApp(SETTINGS_PACKAGE)
    await this.searchBar.waitForDisplayed({ timeout: 10000 })
  }

  // ---------- Home screen ----------

  get searchBar() {
    return $('android=new UiSelector().resourceId("com.android.settings:id/search_action_bar_title")')
  }

  get networkEntryPoint() {
    return $('android=new UiSelector().text("Network & internet")')
  }

  get networkScreenHeader() {
    return $('android=new UiSelector().description("Network & internet")')
  }

  async openNetworkSettings() {
    await this.networkEntryPoint.click()
  }

  // ---------- Search ----------

  get searchInput() {
    return $('android=new UiSelector().resourceId("com.google.android.settings.intelligence:id/open_search_view_edit_text")')
  }

  get searchResultsList() {
    return $('android=new UiSelector().resourceId("com.google.android.settings.intelligence:id/list_results")')
  }

  async searchFor(query) {
    await this.searchBar.click()
    await this.searchInput.waitForDisplayed({ timeout: 10000 })
    await this.searchInput.setValue(query)
  }

  // Search, and keep re-submitting until results appear.
  //
  // Why: Settings search reads from an index that Android builds in the background
  // some time after a device's FIRST boot. A fresh CI emulator can be searched before
  // that index exists and shows "No results". On a warm device the first attempt
  // succeeds, so this costs nothing locally. If search is genuinely broken, it still
  // fails, with a message saying what it waited for.
  async searchUntilResults(query, { timeout = 90000 } = {}) {
    await this.searchFor(query)
    await browser.waitUntil(
      async () => {
        if (await this.searchResultsList.isDisplayed()) return true
        await this.searchInput.setValue(query) // re-submit: clears the field and types again
        return this.searchResultsList.waitForDisplayed({ timeout: 3000 }).catch(() => false)
      },
      {
        timeout,
        interval: 2000,
        timeoutMsg: `No search results for "${query}" after ${timeout / 1000}s (settings search index never became ready)`,
      }
    )
  }

  // ---------- About device (scrolling + reading text) ----------

  async openAboutDevice() {
    // "About emulated device" is near the bottom of the list, so it must be scrolled to.
    await (await scrollToText('About emulated device')).click()
    // Wait for something on the DESTINATION screen, not for the old screen to vanish.
    // (Waiting for the home search bar to disappear failed: the cached element
    // reference kept reporting "displayed" even after the page changed.)
    await this.aboutDeviceName.waitForDisplayed({ timeout: 15000 })
  }

  get aboutDeviceName() {
    return $('android=new UiSelector().text("Device name")')
  }

  // The version value ("14") lives in a sibling "summary" TextView next to the
  // "Android version" title. Many rows share the summary id, so we anchor on the
  // title text and hop to its sibling with fromParent().
  async getAndroidVersion() {
    await scrollToText('Android version')
    const value = $('android=new UiSelector().text("Android version").fromParent(new UiSelector().resourceId("android:id/summary"))')
    return value.getText()
  }

  // ---------- Display (toggling a switch) ----------

  async openDisplaySettings() {
    await (await scrollToText('Display')).click()
  }

  get darkThemeSwitch() {
    // Accessibility id = content-desc on Android: the most stable locator type.
    return $('~Dark theme')
  }

  async isDarkThemeOn() {
    return (await this.darkThemeSwitch.getAttribute('checked')) === 'true'
  }
}

export default new SettingsPage()
