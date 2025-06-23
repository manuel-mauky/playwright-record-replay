import { test as testBase, type TestInfo, type Request } from "@playwright/test"
import { BASE_API_URL } from "../../tasks-api.ts"

import { join } from "node:path"

const requestCounterMap = new Map<string, number>()

function getRequestId(request: Request) {
  return `${request.url()}_${request.method()}`
}

/**
 * Construct a testId string from Playwrights TestInfo
 */
function getTestId(testInfo: TestInfo) {
  return testInfo.titlePath.join("_").replaceAll(" ", "-").replace(".e2e.ts", "")
}

export const test = testBase.extend({
  page: async ({ page, request }, use, testInfo) => {
    const recordMode = process.env.PLAYWRIGHT_REPLAY !== "true"
    if (recordMode) {
      // Reset the api/database. In a real-world app this will likely work differently
      const response = await request.post(`${BASE_API_URL}/debug/reset`)
      if (!response.ok()) {
        throw Error("Failed to reset tasks in backend")
      }
    }

    const testFileName = testInfo.titlePath[0]
    const testId = getTestId(testInfo)

    const harFilePath = join("src", "e2e", "api-mock", testFileName.replace(".e2e.ts", ""), testId)

    await page.routeFromHAR(harFilePath, {
      url: `http://localhost:4000/**/*`,

      update: recordMode,
      updateContent: "embed",
      updateMode: "minimal",
    })

    await page.route("http://localhost:4000/**/*", async (route, request) => {
      const headers = await request.allHeaders()
      const requestId = getRequestId(request)

      const key = `${testId}_${requestId}`

      const previousRequestCounter = requestCounterMap.get(key) ?? 0
      const currentRequestCounter = previousRequestCounter + 1

      requestCounterMap.set(key, currentRequestCounter)

      return route.fallback({
        headers: {
          ...headers,
          "X-PLAYWRIGHT-TEST-ID": getTestId(testInfo),
          "X-PLAYWRIGHT-REQUEST-ID": requestId,
          "X-PLAYWRIGHT-REQUEST-COUNT": String(currentRequestCounter),
        },
      })
    })

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})
