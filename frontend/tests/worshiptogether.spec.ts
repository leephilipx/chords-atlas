import { test, expect } from '@playwright/test'
import {
  waitForApp, enterUrl, waitForSections, waitForLoadingDone,
  countSections, clickWTLink, waitForIframeContent, TEST_URLS,
  getUrlBar, waitForUrlBarChange, waitForIframeSrc,
} from './helpers'

test.describe('worshiptogether.com', () => {
  test('Detects sections on song page', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.worshiptogether)
    await waitForSections(page)
    const count = await countSections(page)
    expect(count).toBeGreaterThanOrEqual(2)
    await waitForLoadingDone(page)
    const urlBar = await getUrlBar(page)
    expect(urlBar).toContain('worshiptogether.com/songs/the-joy')
  })

  test('Non-chord link updates URL bar and loads correctly', async ({ page }) => {
    await waitForApp(page)
    await enterUrl(page, TEST_URLS.worshiptogether)
    await waitForSections(page)
    await waitForLoadingDone(page)
    const urlBefore = await getUrlBar(page)
    await clickWTLink(page, 'Worship Leaders')
    await waitForIframeSrc(page, 'worship-leaders')
    const urlBar = await getUrlBar(page)
    expect(urlBar).toContain('worshiptogether.com/worship-leaders')
    expect(urlBar).not.toContain('/songs/the-joy')
    await waitForIframeContent(page)
    await expect(page.locator('.ant-spin-spinning')).not.toBeVisible({ timeout: 5000 })
  })
})
