import { expect, test } from '@playwright/test'

// Render
test.describe('Render', () => {
  test('Renders index page with expected header', async ({ page }) => {
    await page.goto('/')

    expect(await page.textContent('h1')).toBe('Welcome')
  })
})

// Auth
test.describe('Auth', () => {
  test('Redirects unauthenticated user from settings route', async ({ page }) => {
    await page.goto('/settings')

    await expect(page).toHaveURL('/welcome')
  })
})

// Log In
test.describe('Log In', () => {
  test('Allows connection to node with valid address', async ({ page }) => {
    await page.goto('/connect')

    await page
      .locator('[name=connection]')
      .fill('02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735')

    expect(await page.locator('span:has-text("Invalid node connection address")').isVisible()).toBe(
      false
    )

    const button = page.locator('button:has-text("Connect")')

    expect(await button.isDisabled()).toBe(false)

    await button.click()
  })

  test('Prevents connection to node with invalid address & renders error message', async ({
    page
  }) => {
    await page.goto('/connect')

    await page.locator('[name=connection]').fill('not-a-lightning-address')

    expect(await page.locator('span:has-text("Invalid node connection address")').isVisible()).toBe(
      true
    )

    expect(await page.locator('button:has-text("Connect")').isDisabled()).toBe(true)
  })
})

// i18n
test.describe('i18n', () => {})
