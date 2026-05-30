import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  workers: 4,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
})
