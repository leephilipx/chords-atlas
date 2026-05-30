import { test, expect } from '@playwright/test'
import {
  waitForApp, enterUrl, waitForSections, waitForLoadingDone,
  countSections, clickUGLink, TEST_URLS,
  getUrlBar, waitForUrlBarChange,
} from './helpers'

test.describe('ultimate-guitar.com', () => {
  test('Detects sections on song page', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.ultimateguitar)
    await waitForSections(page)
    const count = await countSections(page)
    expect(count).toBeGreaterThanOrEqual(2)
    await waitForLoadingDone(page)
    const urlBar = await getUrlBar(page)
    expect(urlBar).toContain('tabs.ultimate-guitar.com/tab/the-belonging-co/the-joy-chords')
  })

  test('Non-chord link updates URL bar and loads', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.ultimateguitar)
    await waitForSections(page)
    await waitForLoadingDone(page)
    const urlBefore = await getUrlBar(page)
    await clickUGLink(page, 'Courses')
    await waitForUrlBarChange(page, urlBefore)
    const urlBar = await getUrlBar(page)
    expect(urlBar).toContain('ultimate-guitar.com')
    expect(urlBar).not.toContain('/tab/the-belonging-co/the-joy')
    await expect(page.locator('.ant-spin-spinning')).not.toBeVisible({ timeout: 5000 })
  })
})
