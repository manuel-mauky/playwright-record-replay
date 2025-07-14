import { expect, type Locator, type Page } from "@playwright/test"

export class TasksPageObject {
  readonly page: Page
  readonly baseUrl: string

  readonly addItemTextbox: Locator
  readonly addItemButton: Locator
  readonly taskList: Locator
  readonly taskItems: Locator

  constructor(page: Page, baseUrl: string | undefined) {
    this.page = page
    this.baseUrl = baseUrl ?? ""
    this.addItemTextbox = page.getByRole("textbox")
    this.addItemButton = page.getByRole("button", { name: "Add" })
    this.taskList = page.getByTestId("task-list")
    this.taskItems = this.taskList.getByRole("listitem")
  }

  async goto() {
    await this.page.goto(this.baseUrl)
  }

  async addTask(title: string) {
    await this.addItemTextbox.fill(title)
    await this.addItemButton.click()
    await expect(this.taskList.getByRole("listitem").filter({ hasText: title })).toBeVisible()
  }

  async getItem(title: string) {
    const itemLocator = this.taskItems.filter({ hasText: title })

    return new TaskItemPageObject(itemLocator)
  }

  async getItemByIndex(index: number) {
    const itemLocator = this.taskItems.nth(index)
    return new TaskItemPageObject(itemLocator)
  }
}

export class TaskItemPageObject {
  readonly locator: Locator

  readonly deleteButton: Locator
  readonly editTextbox: Locator
  readonly changeTitleOkButton: Locator
  readonly changeTitleCancelButton: Locator
  readonly title: Locator

  constructor(itemLocator: Locator) {
    this.locator = itemLocator

    this.deleteButton = this.locator.getByRole("button").getByText("Delete")
    this.editTextbox = this.locator.getByRole("textbox")
    this.changeTitleOkButton = this.locator.getByTestId("change-ok")
    this.changeTitleCancelButton = this.locator.getByTestId("change-cancel")

    this.title = this.locator.getByTestId("title")
  }
}
