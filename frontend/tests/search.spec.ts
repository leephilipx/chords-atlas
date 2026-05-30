import { test, expect } from '@playwright/test'
import { waitForApp, enterUrl, getIframeSrc, waitForIframeSrc } from './helpers'

test('Google search loads without redirect loop', async ({ page }) => {
  await waitForApp(page)
  await enterUrl(page, 'the joy belonging co chords')
  await waitForIframeSrc(page, 'google.com')
  await page.waitForTimeout(5000)
  const src1 = await getIframeSrc(page)
  await page.waitForTimeout(3000)
  const src2 = await getIframeSrc(page)
  expect(src1).toBe(src2)
})
