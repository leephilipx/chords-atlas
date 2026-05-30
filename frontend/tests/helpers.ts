import { type Page, expect } from '@playwright/test'

export const TEST_URLS = {
  pnwchords: 'https://pnwchords.com/the-joy-the-belonging-co/',
  worshiptogether: 'https://www.worshiptogether.com/songs/the-joy-the-belonging-co/',
  ultimateguitar: 'https://tabs.ultimate-guitar.com/tab/the-belonging-co/the-joy-chords-4887865',
}

const SECTION_RE = /^(Verse|Chorus|Bridge|Intro|Outro|Pre[ -]?Chorus|Tag|Interlude|Instrumental)/i

export function sectionButtons(page: Page) {
  return page.locator('button').filter({ hasText: SECTION_RE })
}

export async function countSections(page: Page) {
  return sectionButtons(page).count()
}

export async function waitForSections(page: Page, timeout = 30000) {
  await sectionButtons(page).first().waitFor({ state: 'visible', timeout })
}

export async function waitForNoSections(page: Page) {
  await expect(sectionButtons(page)).toHaveCount(0, { timeout: 10000 })
}

export async function waitForLoadingDone(page: Page) {
  await expect(page.locator('.ant-spin-lg.ant-spin-spinning')).not.toBeVisible({ timeout: 10000 })
}

export function iframe(page: Page) {
  return page.frameLocator('iframe[title="chords-viewer"]')
}

export async function clickInIframe(page: Page, text: string) {
  const frame = iframe(page)
  await frame.locator(`a:has-text("${text}")`).first().click()
}

export async function waitForApp(page: Page) {
  await page.goto('/')
  await page.waitForSelector('iframe[title="chords-viewer"]')
}

export async function enterUrl(page: Page, url: string) {
  const input = page.locator('input[placeholder*="Search"]')
  await input.fill(url)
  await input.press('Enter')
}

export async function getIframeSrc(page: Page) {
  return (await page.locator('iframe[title="chords-viewer"]').getAttribute('src')) || ''
}

export async function waitForIframeSrc(page: Page, includes: string, timeout = 15000) {
  await page.waitForFunction(
    (substr) => {
      const el = document.querySelector('iframe[title="chords-viewer"]')
      return (el as HTMLIFrameElement | null)?.src?.includes(substr) ?? false
    },
    includes,
    { timeout }
  )
}

export async function waitForIframeContent(page: Page, timeout = 15000) {
  const frame = iframe(page)
  const body = frame.locator('body')
  await body.waitFor({ state: 'attached', timeout })
  await expect(body).not.toBeEmpty({ timeout })
}

export async function getUrlBar(page: Page) {
  return page.locator('input[placeholder*="Search"]').inputValue()
}

export async function waitForUrlBar(page: Page, includes: string, timeout = 5000) {
  await page.waitForFunction(
    (text) => {
      const input = document.querySelector('input[placeholder*="Search"]')
      if (!input) return false
      return (input as HTMLInputElement).value.includes(text)
    },
    includes,
    { timeout }
  )
}

export async function waitForUrlBarChange(page: Page, previous: string, timeout = 10000) {
  await page.waitForFunction(
    (old) => {
      const input = document.querySelector('input[placeholder*="Search"]')
      if (!input) return false
      return (input as HTMLInputElement).value !== old
    },
    previous,
    { timeout }
  )
}

export async function getIframePreDataKey(page: Page) {
  const frame = iframe(page)
  return frame.locator('pre[data-key]').first().getAttribute('data-key')
}

export async function clickWTLink(page: Page, text: string) {
  const frame = iframe(page)
  const link = frame.locator(`nav a:has-text("${text}"), header a:has-text("${text}"), li a:has-text("${text}")`).first()
  await link.waitFor({ state: 'visible', timeout: 5000 })
  await link.click()
}

export async function clickUGLink(page: Page, text: string) {
  const frame = iframe(page)
  const link = frame.locator(`a[href]:has-text("${text}")`).first()
  await link.waitFor({ state: 'attached', timeout: 10000 })
  await link.click({ force: true })
}
