import { test } from "./utils/fixtures.ts"
import { expect } from "@playwright/test"
import { TasksPageObject } from "./tasks.page.ts"
import { REST_API_URI } from "../config.ts"

test.describe("task-list", () => {
  test("has title", async ({ page, baseURL }) => {
    const tasksPage = new TasksPageObject(page, baseURL)
    await tasksPage.goto()

    await expect(page).toHaveTitle(/Task Example/)
  })

  test("show error message when API is not available", async ({ page, baseURL }) => {
    await page.route(`${REST_API_URI}/**/*`, (route) => {
      return route.abort("connectionrefused")
    })

    const tasksPage = new TasksPageObject(page, baseURL)
    await tasksPage.goto()

    await expect(page.getByText("Error: Failed to fetch")).toBeVisible({ timeout: 15_000 })
  })
})
