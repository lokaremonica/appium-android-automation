class SettingsPage {
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
  }
  
  export default new SettingsPage()