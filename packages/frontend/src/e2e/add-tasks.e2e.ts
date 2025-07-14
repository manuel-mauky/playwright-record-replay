import { test } from "./utils/fixtures.ts"
import { expect } from "@playwright/test"
import { TasksPageObject } from "./tasks.page.ts"

test("add task", async ({ page, baseURL }) => {
  const tasksPage = new TasksPageObject(page, baseURL)
  await tasksPage.goto()

  // initial state
  await expect(tasksPage.addItemButton).toBeDisabled()
  await expect(tasksPage.addItemButton).toBeVisible()

  await expect(tasksPage.addItemTextbox).toBeVisible()
  await expect(tasksPage.addItemTextbox).toHaveText("")

  await expect(tasksPage.taskItems).toHaveCount(0)

  await tasksPage.addItemTextbox.fill("Do homework")
  await expect(tasksPage.addItemButton).toBeEnabled()
  await tasksPage.addItemButton.click()

  await expect(tasksPage.addItemTextbox).toHaveText("")

  await expect(tasksPage.taskItems).toHaveCount(1)
  await expect(tasksPage.taskItems.filter({ hasText: "Do homework" })).toBeVisible()
})
