import { test } from "./utils/fixtures.ts"
import { expect } from "@playwright/test"
import { TasksPageObject } from "./tasks.page.ts"

test("has title", async ({ page }) => {
  const tasksPage = new TasksPageObject(page)
  await tasksPage.goto()

  await expect(page).toHaveTitle(/Task Example/)
})
