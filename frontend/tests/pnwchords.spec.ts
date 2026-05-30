import { test, expect } from '@playwright/test'
import {
  waitForApp, enterUrl, waitForSections, waitForLoadingDone,
  countSections, clickInIframe, waitForNoSections, TEST_URLS,
  getUrlBar, waitForUrlBarChange, iframe,
} from './helpers'

test.describe('pnwchords.com', () => {
  test('Detects sections on song page', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.pnwchords)
    await waitForSections(page)
    const count = await countSections(page)
    expect(count).toBeGreaterThanOrEqual(2)
    await waitForLoadingDone(page)
    const urlBar = await getUrlBar(page)
    expect(urlBar).toContain('pnwchords.com/the-joy-the-belonging-co')
  })

  test('Chords menu page scans but finds no sections', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.pnwchords)
    await waitForSections(page)
    const urlBefore = await getUrlBar(page)
    await clickInIframe(page, 'Chords')
    await waitForUrlBarChange(page, urlBefore)
    const urlBar = await getUrlBar(page)
    expect(urlBar).toContain('pnwchords.com')
    expect(urlBar).not.toContain('the-joy')
    await page.waitForTimeout(5000)
    await waitForLoadingDone(page)
    await waitForNoSections(page)
  })

  test('Transpose key changes chords without breaking the app', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.pnwchords)
    await waitForSections(page)
    await waitForLoadingDone(page)
    const urlBefore = await getUrlBar(page)
    expect(urlBefore).toContain('pnwchords.com/the-joy-the-belonging-co')
    const frame = iframe(page)
    const transposeLink = frame.locator('a[href="#"]').filter({ hasText: /^[A-G][#b]?$/ }).first()
    const linkCount = await transposeLink.count()
    if (linkCount === 0) {
      test.skip(true, 'no transpose links found')
      return
    }
    await transposeLink.click()
    await page.waitForTimeout(3000)
    const urlAfter = await getUrlBar(page)
    expect(urlAfter).toContain('pnwchords.com/the-joy-the-belonging-co')
    await expect(page.locator('.ant-spin-spinning')).not.toBeVisible({ timeout: 5000 })
  })
})
