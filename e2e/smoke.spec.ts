import { test, expect } from '@playwright/test'

// Smoke test — verifies the homepage loads once the app/ directory exists.
// Expand with critical user-journey tests as features are built.
test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/YardUp/)
})
