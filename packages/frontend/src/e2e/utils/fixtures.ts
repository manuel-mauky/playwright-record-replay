import { test as testBase } from "@playwright/test"
import { BASE_API_URL } from "../../tasks-api.ts"

export const test = testBase.extend({
  page: async ({ page, request }, use) => {
    console.log("will reset")
    const response = await request.post(`${BASE_API_URL}/debug/reset`)
    if (!response.ok()) {
      throw Error("Failed to reset tasks in backend")
    }
    console.log("reset done")

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})
