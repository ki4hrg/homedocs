/*
 * The journeys homedocs exists for, on a phone, in the order a family would
 * build up their house record. Each "question" test asserts the answer is one
 * search and one tap away.
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function create(page: Page, path: string, fill: Record<string, string>, submit: string | RegExp = /^(Add|Save)/) {
  await page.goto(path)
  for (const [name, value] of Object.entries(fill)) await page.locator(`[name="${name}"]`).fill(value)
  await page.getByRole('button', { name: submit }).click()
}

test('build the house: places, a light and its bulb', async ({ page }) => {
  await create(page, '/places/new', { name: 'Living room' }, 'Add place')
  await expect(page.getByRole('heading', { name: 'Living room' })).toBeVisible()

  await page.getByRole('link', { name: 'Add fixture' }).click()
  await page.locator('[name=name]').fill('Overhead light')
  await page.getByRole('button', { name: 'Add fixture' }).click()
  await expect(page.getByRole('heading', { name: 'Overhead light' })).toBeVisible()

  await page.getByRole('link', { name: 'Add part' }).click()
  await page.getByRole('link', { name: 'Light bulb' }).click()
  await page.locator('[name=f_base]').fill('E26')
  await page.locator('[name=f_shape]').fill('A19')
  await page.locator('[name=f_color_temp]').fill('2700K')
  await page.locator('[name=quantity]').fill('3')
  await page.getByRole('button', { name: /Add to Overhead light/ }).click()
  await expect(page.getByText('A19 E26 2700K bulb · 3 bulbs')).toBeVisible()
})

test('home leads with places and the parts the house takes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Living room.*1 fixture/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /A19 E26 2700K bulb.*Overhead light/ })).toBeVisible()
})

test('the + menu adds right where you are', async ({ page }) => {
  await page.goto('/places')
  await page.getByRole('link', { name: 'Living room' }).click()
  await expect(page.getByRole('heading', { name: 'Living room' })).toBeVisible()
  await page.getByRole('button', { name: 'Add something' }).click()
  const fixture = page.getByRole('menuitem', { name: /^Fixture/ })
  await expect(fixture).toHaveAttribute('href', /\/fixtures\/new\?space=[0-9a-f-]{36}$/)
  await page.keyboard.press('Escape')
  await expect(fixture).toHaveCount(0)
})

test('a new fixture asks for a photo, and password managers stay out of the form', async ({ page }) => {
  await page.goto('/fixtures/new')
  await expect(page.locator('[name=name]')).toHaveAttribute('data-1p-ignore', '')
  await expect(page.locator('[name=name]')).toHaveAttribute('autocomplete', 'off')
  await page.locator('[name=name]').fill('Kitchen sink shutoff')
  await page.getByRole('button', { name: 'Add fixture' }).click()
  await expect(page.getByRole('button', { name: /Add photo/ })).toBeVisible()
})

test('question 1: what bulb does the living room light take?', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Search everything' }).fill('living room bulb')
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: /Overhead light/ }).click() // one tap
  await expect(page.getByText('A19 E26 2700K bulb · 3 bulbs')).toBeVisible()
})

test('mulch: what we used, and the lesson for next time', async ({ page }) => {
  await create(page, '/places/new', { name: 'Front flowerbed' }, 'Add place')
  await page.getByRole('link', { name: 'Add part' }).click()
  await page.getByRole('link', { name: 'Landscaping' }).click()
  await page.locator('[name=f_product]').fill('Brown hardwood mulch')
  await page.locator('[name=quantity]').fill('12')
  await page.getByRole('button', { name: /Add to Front flowerbed/ }).click()

  await page.getByRole('link', { name: 'Add note' }).click()
  await page.locator('[name=title]').fill('Spring mulch')
  await page.locator('[name=supplyId]').selectOption({ label: 'Brown hardwood mulch' })
  await page.locator('[name=quantity]').fill('12')
  await page.locator('[name=unit]').fill('bag')
  await page.locator('[name=nextTime]').fill('Needed 3 more bags')
  await page.getByRole('button', { name: 'Save note' }).click()

  await page.getByRole('button', { name: /really needs 15/ }).click()
  await expect(page.getByText(/Remembered: Front flowerbed really needs 15 bags/)).toBeVisible()
})

test('question 2: how many bags does the front bed take?', async ({ page }) => {
  await page.goto('/search?q=front+flowerbed')
  await page.getByRole('link', { name: /Front flowerbed/ }).first().click() // one tap
  await expect(page.getByText(/Next time:.*Needed 3 more bags/).first()).toBeVisible()
  await expect(page.getByText(/really needs 15 bags/)).toBeVisible()
})

test('question 3: which paint is in the bedroom?', async ({ page }) => {
  await create(page, '/places/new', { name: 'Bedroom' }, 'Add place')
  await page.getByRole('link', { name: 'Add part' }).click()
  await page.getByRole('link', { name: 'Paint colour' }).click()
  await page.locator('[name=f_brand]').fill('Sherwin-Williams')
  await page.locator('[name=f_color_code]').fill('SW 7015')
  await page.locator('[name=f_color_name]').fill('Repose Gray')
  await page.locator('[name=surface]').fill('walls')
  await page.locator('[name=finish]').fill('Eggshell')
  await page.getByRole('button', { name: /Add to Bedroom/ }).click()

  await page.goto('/search?q=bedroom+paint')
  await page.getByRole('link', { name: /Bedroom|Sherwin/ }).first().click()
  await expect(page.getByText(/Sherwin-Williams SW 7015 Repose Gray/).first()).toBeVisible()
  await expect(page.getByText(/walls, Eggshell/)).toBeVisible()
})

test('question 4: who is our plumber?', async ({ page }) => {
  await page.goto('/contacts/new')
  await page.locator('[name=name]').fill('Ace Plumbing')
  await page.locator('[name=phoneValue]').first().fill('(555) 123-4567')
  await page.getByText('Plumber', { exact: true }).click()
  await page.getByRole('group', { name: 'Go-to for' }).getByLabel('Plumber').check()
  await page.getByRole('button', { name: 'Add contact' }).click()
  await expect(page.getByRole('heading', { name: 'Ace Plumbing' })).toBeVisible()

  await page.goto('/')
  // On Home, with a call button — zero taps to the number.
  await expect(page.getByRole('link', { name: 'Call Ace Plumbing' })).toHaveAttribute('href', 'tel:5551234567')
})

test('a project with a quote and a to-do list', async ({ page }) => {
  await create(page, '/projects/new', { title: 'Replace electrical panel' }, 'Add project')
  await page.getByRole('textbox', { name: 'New to-do' }).fill('2 outlets in the garage')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('2 outlets in the garage')).toBeVisible()

  await page.getByRole('button', { name: 'Add a quote' }).click()
  await page.locator('[name=amount]').fill('2400')
  await page.getByRole('button', { name: 'Add quote' }).click()
  await expect(page.getByText('$2,400.00')).toBeVisible()
  await page.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByText('Scheduled ·').or(page.getByText(/^Scheduled/)).first()).toBeVisible()
})

test('main pages have no serious accessibility problems', async ({ page }) => {
  for (const path of ['/', '/places', '/projects', '/contacts', '/more', '/parts', '/search?q=bulb', '/guide', '/settings']) {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${path}: ${v.id} — ${v.nodes[0]?.target}`)).toEqual([])
  }
})
