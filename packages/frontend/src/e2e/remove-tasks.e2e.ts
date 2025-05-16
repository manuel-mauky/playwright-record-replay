import { test } from "./utils/fixtures.ts"
import { TasksPageObject } from "./tasks.page.ts"
import { expect } from "@playwright/test"

test("remove existing task", async ({ page }) => {
  const tasksPage = new TasksPageObject(page)
  await tasksPage.goto()

  // initial state
  await tasksPage.addTask("Test 1")
  await tasksPage.addTask("Test 2")
  await tasksPage.addTask("Test 3")

  const itemToDelete = await tasksPage.getItem("Test 2")

  // when
  await itemToDelete.deleteButton.click()

  // then
  await expect(itemToDelete.locator).not.toBeVisible()
})
