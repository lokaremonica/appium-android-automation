import apiDemos from '../pageobjects/apidemos.page.js'

describe('ApiDemos: gestures and controls', () => {
  describe('Drag and drop', () => {
    beforeEach(async () => {
      await apiDemos.open('.view.DragAndDropDemo')
      await apiDemos.dragDot(1).waitForDisplayed({ timeout: 10000 })
    })

    it('should report "Dropped!" when a dot is dropped onto another dot', async () => {
      await expect(apiDemos.dragResult).toHaveText('')

      await apiDemos.dragDotOnto(1, 2)

      await expect(apiDemos.dragResult).toHaveText('Dropped!')
    })
  })

  describe('Checkboxes', () => {
    beforeEach(async () => {
      await apiDemos.open('.view.Controls1')
      await apiDemos.checkbox('Checkbox 1').waitForDisplayed({ timeout: 10000 })
    })

    it('should check and then uncheck a checkbox', async () => {
      const box = apiDemos.checkbox('Checkbox 1')
      expect(await apiDemos.isChecked(box)).toBe(false)

      await box.click()
      expect(await apiDemos.isChecked(box)).toBe(true)

      await box.click()
      expect(await apiDemos.isChecked(box)).toBe(false)
    })

    it('should toggle checkboxes independently', async () => {
      const box1 = apiDemos.checkbox('Checkbox 1')
      const box2 = apiDemos.checkbox('Checkbox 2')

      await box1.click()

      expect(await apiDemos.isChecked(box1)).toBe(true)
      expect(await apiDemos.isChecked(box2)).toBe(false)
    })
  })

  describe('Seek bar (drag)', () => {
    beforeEach(async () => {
      await apiDemos.open('.view.SeekBar1')
      await apiDemos.seekBar.waitForDisplayed({ timeout: 10000 })
    })

    it('should move to the maximum when dragged to the right end', async () => {
      expect(await apiDemos.seekValue()).toBe(50)

      await apiDemos.dragSeekBarTo(100)

      expect(await apiDemos.seekValue()).toBe(100)
    })

    it('should move to the minimum when dragged to the left end', async () => {
      await apiDemos.dragSeekBarTo(0)

      expect(await apiDemos.seekValue()).toBe(0)
    })
  })

  describe('Images', () => {
    beforeEach(async () => {
      await apiDemos.open('.view.ImageView1')
    })

    it('should display the first image with a non-zero size', async () => {
      const img = apiDemos.image(0)
      await img.waitForDisplayed({ timeout: 10000 })

      // "Visible" means more than isDisplayed(): a 0x0 image is technically displayed.
      const { width, height } = await img.getSize()
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
    })
  })
})
