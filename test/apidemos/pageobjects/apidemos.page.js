// Page object for Appium's ApiDemos practice app (io.appium.android.apis).
// Install once with: adb install -r apps/ApiDemos-debug.apk
const APIDEMOS_PACKAGE = 'io.appium.android.apis'

// Center point of an element, in screen pixels.
async function centerOf(el) {
  const { x, y } = await el.getLocation()
  const { width, height } = await el.getSize()
  return { x: Math.round(x + width / 2), y: Math.round(y + height / 2) }
}

// Low-level W3C pointer gesture: press at `from`, optionally hold, move to `to`, release.
// This is what every drag on a touch screen really is under the hood.
async function pointerDrag(from, to, { holdMs = 0, moveMs = 600 } = {}) {
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: from.x, y: from.y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: holdMs }, // long-press before moving (needed for drag-and-drop)
        { type: 'pointerMove', duration: moveMs, origin: 'viewport', x: to.x, y: to.y },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
  await browser.releaseActions()
}

class ApiDemosPage {
  // ---------- Navigation ----------

  // Deep-link straight to the screen under test instead of tapping through menus:
  // faster, and fewer steps means fewer places to go flaky. Kill the app first so
  // every test starts from a clean state.
  async open(activity) {
    await driver.terminateApp(APIDEMOS_PACKAGE)
    await driver.execute('mobile: startActivity', {
      component: `${APIDEMOS_PACKAGE}/${activity}`,
    })
  }

  // ---------- Drag and drop (Views > Drag and Drop) ----------

  dragDot(n) {
    return $(`id=${APIDEMOS_PACKAGE}:id/drag_dot_${n}`)
  }

  get dragResult() {
    return $(`id=${APIDEMOS_PACKAGE}:id/drag_result_text`)
  }

  async dragDotOnto(fromN, toN) {
    const from = await centerOf(this.dragDot(fromN))
    const to = await centerOf(this.dragDot(toN))
    // This screen only starts a drag after a LONG press, so hold before moving.
    await pointerDrag(from, to, { holdMs: 1000 })
  }

  // ---------- Checkboxes (Views > Controls > Light Theme) ----------

  checkbox(label) {
    return $(`~${label}`) // accessibility id, e.g. "Checkbox 1"
  }

  async isChecked(el) {
    return (await el.getAttribute('checked')) === 'true'
  }

  // ---------- Seek bar / slider drag (Views > Seek Bar) ----------

  get seekBar() {
    return $(`id=${APIDEMOS_PACKAGE}:id/seek`)
  }

  // A SeekBar's text is its current progress as a float string, e.g. "50.0".
  async seekValue() {
    return parseFloat(await this.seekBar.getText())
  }

  // Drag the thumb from its current spot to `percent` (0-100) of the bar's width.
  async dragSeekBarTo(percent) {
    const { x, y } = await this.seekBar.getLocation()
    const { width, height } = await this.seekBar.getSize()
    const current = await this.seekValue()
    const midY = Math.round(y + height / 2)
    const xAt = (p) => Math.round(x + (width - 1) * (p / 100))
    await pointerDrag({ x: xAt(current), y: midY }, { x: xAt(percent), y: midY })
  }

  // ---------- Images (Views > ImageView) ----------

  // These images have no resource-id or content-desc, so the only option is
  // class + index. In a real app, that's an accessibility bug worth filing:
  // screen readers can't describe them either.
  image(index) {
    return $(`android=new UiSelector().className("android.widget.ImageView").instance(${index})`)
  }
}

export default new ApiDemosPage()
