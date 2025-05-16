import { test } from "./utils/fixtures.ts"
import { expect } from "@playwright/test"
import { TasksPageObject } from "./tasks.page.ts"

test.describe("edit tasks", () => {
  test("change to edit mode", async ({ page }) => {
    console.log("run 1")
    const tasksPage = new TasksPageObject(page)
    await tasksPage.goto()

    // initial state
    await tasksPage.addTask("Test 1")

    const itemToEdit = await tasksPage.getItemByIndex(0)
    await expect(itemToEdit.deleteButton).toBeVisible()
    await expect(itemToEdit.changeTitleOkButton).not.toBeVisible()
    await expect(itemToEdit.changeTitleCancelButton).not.toBeVisible()
    await expect(itemToEdit.editTextbox).not.toBeVisible()

    //when
    await itemToEdit.locator.dblclick()

    // then
    await expect(itemToEdit.deleteButton).not.toBeVisible()
    await expect(itemToEdit.changeTitleOkButton).toBeVisible()
    await expect(itemToEdit.changeTitleCancelButton).toBeVisible()
    await expect(itemToEdit.editTextbox).toBeVisible()
  })

  test("edit title success", async ({ page }) => {
    console.log("run 2")
    const tasksPage = new TasksPageObject(page)
    await tasksPage.goto()

    // initial state
    await tasksPage.addTask("Test 1")

    const itemToEdit = await tasksPage.getItemByIndex(0)

    // when
    await itemToEdit.locator.dblclick()
    await itemToEdit.editTextbox.fill("New Item Title")

    await itemToEdit.changeTitleOkButton.click()

    // then
    await expect(itemToEdit.title).toHaveText("New Item Title")

    // not in edit mode anymore
    await expect(itemToEdit.deleteButton).toBeVisible()
    await expect(itemToEdit.changeTitleOkButton).not.toBeVisible()
    await expect(itemToEdit.changeTitleCancelButton).not.toBeVisible()
    await expect(itemToEdit.editTextbox).not.toBeVisible()
  })

  test("edit title cancel", async ({ page }) => {
    console.log("run 3")
    const tasksPage = new TasksPageObject(page)
    await tasksPage.goto()

    // initial state
    await tasksPage.addTask("Test 1")

    const itemToEdit = await tasksPage.getItemByIndex(0)

    // when
    await itemToEdit.locator.dblclick()
    await itemToEdit.editTextbox.fill("New Item Title")

    await itemToEdit.changeTitleCancelButton.click()

    // then
    await expect(itemToEdit.title).toHaveText("Test 1")
    // not in edit-mode anymore
    await expect(itemToEdit.deleteButton).toBeVisible()
    await expect(itemToEdit.changeTitleOkButton).not.toBeVisible()
    await expect(itemToEdit.changeTitleCancelButton).not.toBeVisible()
    await expect(itemToEdit.editTextbox).not.toBeVisible()
  })
})
