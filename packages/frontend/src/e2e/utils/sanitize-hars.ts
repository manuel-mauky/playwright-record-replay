/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "node:fs/promises"
import type { Log } from "har-format"

import FastGlob from "fast-glob"

type Filter = {
  key: string
  value?: any
}

const filters: Array<Filter> = [
  {
    key: "time",
  },
  { key: "startedDateTime" },
  {
    key: "timings",
  },
  {
    key: "name",
    value: "Date",
  },
]

async function main() {
  const files = await FastGlob(["src/e2e/api-mock/**/*.json"])

  for (const file of files) {
    const fileContent = await fs.readFile(file, { encoding: "utf-8" })

    const originalJson = JSON.parse(fileContent)

    checkJson(file, originalJson)

    const sanitizedJson = sanitizeJson(originalJson, filters)

    await fs.writeFile(file, JSON.stringify(sanitizedJson, null, 2), "utf-8")
  }
}

main()

function checkJson(filePath: string, json: any) {
  const log: Log = json.log

  let counter = 0

  log.entries.forEach((entry) => {
    const headers = entry.request.headers

    if (!headers.some((header) => header.name === "X-PLAYWRIGHT-REQUEST-COUNT")) {
      counter++
    }
  })

  if (counter > 0) {
    console.log(`In ${filePath} there are ${counter} requests without X-PLAYWRIGHT-REQUEST-COUNT header.`)
  }
}

function sanitizeJson(json: any, filters: Array<Filter>): any {
  if (Array.isArray(json)) {
    return json
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const shouldRemove = filters.some(
            (filter) => filter.value !== undefined && filter.key in item && item[filter.key] === filter.value,
          )

          return shouldRemove ? null : sanitizeJson(item, filters)
        }
      })
      .filter((item) => item !== null && item !== undefined)
  } else if (typeof json === "object" && json !== null) {
    const newJson: any = {}

    for (const [key, value] of Object.entries(json)) {
      const shouldRemoveKey = filters.some((filter) => filter.value === undefined && filter.key === key)

      const shouldRemoveObject = filters.some(
        (filter) => filter.value !== undefined && filter.key === key && value === filter.value,
      )

      if (!shouldRemoveKey && !shouldRemoveObject) {
        newJson[key] = sanitizeJson(value, filters)
      }
    }
    return Object.keys(newJson).length > 0 ? newJson : null
  } else {
    return json
  }
}
