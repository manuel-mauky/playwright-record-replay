**Draft**

# Playwright - Record and Replay

"Playwright" is a tool for end-to-end (e2e) tests for web applications. Instead of testing individual components or
functions, you're writing tests from the perspective of a user interacting with the website. This includes navigating a
webapp, clicking on things and writing text in text fields, and so on. That's the one "end" in "end-to-end". For a
typical SinglePageApp, the other "end" in most cases is one or more REST APIs. E2e tests are a great addition to unit
tests that only focus on individual components. This way, e2e tests can find issues and bugs that otherwise might have
remained undetected. End-to-End tests also act as regression tests to prevent unintentional behavior changes when doing
refactorings or implementing new features in other places of the app.

However, testing against real APIs also introduces some challenges. First, you need the API available when running the
tests, which might be a limitation in some CI pipelines. Bug the biggest issue will be that the API acts as a shared
resource and therefore tests can influence each other. For example, one test might expect a given number of items in a
list while another test verifies the behavior of creating new items or deleting existing ones. Running one test before
the other might break the second test even though that test in isolation would work without any issues. In my
experience, one of the biggest issues with e2e tests is unreliability and flakiness. Sometimes tests are running without
issues and then the same tests are failing without any change. There are ways to mitigate these issues, for example, by
executing tests in a strict order one after the other or by resetting the database for each and every test. However,
this will also significantly slow down test execution and is therefore also not optimal.

An alternative approach is to mock the API. Playwright as a tool provides ways of intercepting and changing or replacing
API responses. But this also has some downsides: Writing mock responses can be a lot of work and keeping them up to date
can be even more annoying. But it also introduces the risk of false positive test results: Your test might run green
when being executed against the mocks but would fail when running against the real API. This can happen quite easy when
the API is evolving, and you missed updating the mocks accordingly.

## Record and Replay

An idea to solve these issues and to get the best of both worlds might be a "Record and Replay" approach: There are two
"modes": "Record" and "Replay". In record mode, we're running the tests against the real API. While doing this, we're
intercepting all network requests to the API and store the requests and responses in a file on the local file system.
Those files would typically be added to version control. In replay mode, we're again intercepting the network requests,
but instead of communicating with the actual API, we're taking the responses from the previously recorded files.
Basically, the files are auto-generated mocks.

This approach has some significant advantages: By being able to conditionally run the tests against the real API, we're
making sure that tests are still up to date and don't just give a good feeling because of false positives. Of course,
you need to actually run the tests against the real API regularly, e.g., on a nightly CI pipeline. In record mode, the
test execution has to be sequential and the test environment (database...) needs to be reset for every testcase to make
sure that the recorded mocks itself are reflecting a flaky API. But on the other hand, running the tests in replay mode
should be way faster and can be done in parallel and without touching the API at all. With this approach, you don't need
to write mocks by hand and don't need to update them but instead can just run the tests again in record mode.

However, there need to be some requirements to be fulfilled for this approach to actually make sense:

1. the recorded mocks should be stable: When nothing has changes (neither in the API nor the tests), there shouldn't be
   any changes to the recorded files so that they can be safely git committed without seeing git changes on every test
   execution. This means that things like timestamps or tokens shouldn't be part of the files
2. as mock files are stored in the git repo, they shouldn't contain sensitive data like request tokens or passwords. We
   have to have a way of filtering those values and tests still have to work as expected.
3. it should still be possible to manually mock some specific requests, e.g., to simulate errors or timeouts. Playwright
   provides the [page.route](https://playwright.dev/docs/api/class-route#route-fulfill) feature to intercept and
   manipulate requests for this.
4. The code for record/replay should be outside the actual e2e tests. The tests shouldn't be written specifically for
   one or the other, and there should be no or as little as possible adjustments needed in e2e tests to enable
   record/replay

## How to implement?

The described "record and replay" method is not a new idea. Playwright provides the
[routeFromHAR](https://playwright.dev/docs/mock#replaying-from-har) feature for this. "HAR" stands for "HTTP Archive"
and is a format for tools to record HTTP requests. However, even though playwright provides the basics, there are still
many things to do to get this to work in pracise as the API that's provided by playwright is quite low-level. There are
some additional plugins for playwright that deal with some limitations of the playwright implementation, and there are
also some external libraries that implement their own logic. In this article, I will describe how to set up this
approach with plain playwright APIs.

## Example app

As an example app, I'm using a good old simple task/todo app.

### Backend

I have a small node.js backend with a REST Api to get and manipulate task items. I'm using
[express](https://expressjs.com/) for the server implementation, but any other library would work as well. The backend
consists of two files: `tasks.ts` which contains all the task-related logic and "server.ts" which contains the server
setup.

```ta
// tasks.ts
import { Router, Request, Response } from "express"

export type Task = {
  id: number
  title: string
  completed: boolean
}

export const router = Router()

let tasks: Task[] = []
let idCounter = 0

router.post("/", (req, res) => {
  const newTask: Task = {
    id: idCounter++,
    title: req.body.title,
    completed: false,
  }

  tasks.push(newTask)

  res.status(201).json({
    task: newTask,
  })
})

router.get("/", (_, res) => {
  res.json({
    tasks,
  })
})

router.get("/:id", (req, res) => {
  const task = getTask(req, res)

  if (task) {
    res.json({
      task,
    })
  }
})

router.put("/:id", (req, res) => {
  const task = getTask(req, res)

  if (task) {
    task.title = req.body.title || task.title
    task.completed = req.body.completed || task.completed

    res.json({ task })
  }
})

router.delete("/:id", (req, res) => {
  const task = getTask(req, res)

  if (task) {
    const index = tasks.indexOf(task)
    tasks.splice(index, 1)
    res.status(204).send()
  }
})

/**
 * return the task with the id (from request).
 * If no task with the given id is found, the response is set to 404 and an error message is send
 */
function getTask(req: Request, res: Response) {
  const task = tasks.find((t) => t.id === Number.parseInt(req.params.id))

  if (!task) {
    res.status(404).send("Task not found")
  } else {
    return task
  }
}

/**
 * used for testing. Resets the state of the tasks.
 */
export function reset() {
  tasks = []
  idCounter = 0
}
```

As you can see I'm using an array `tasks` to store the data. In a real-world app you would use a database instead. The
file implements all CRUD operations needed for basic task handling. In addition, there is also a `reset` function that I
will use to set the backend into a fresh state. In a real app, you likely won't do it this way as this would, of course,
be a big security issue. Instead, you could do the reset on the database level. How to get a fresh state for testing is
highly depending on the actual use-case and tech stack and would take a whole series of blog posts by itself, so I won't
go into the details here.

The `server.ts` file looks like this:

```ts
import express from "express"
import cors from "cors"
import { router as tasksRouter, reset } from "./tasks.js"

const app = express()

const port = process.env.PORT || 4000

app.use(express.json())
app.use(cors())
app.use("/tasks", tasksRouter)

app.get("/", (req, res) => {
  res.contentType("application/json").send({
    _links: {
      tasks: `http://${req.headers.host}/tasks`,
    },
  })
})

// Allow resetting for testing purposes
// A real-world app should not have such an endpoint but should probably go to the database directly
app.post("/debug/reset", (_, res) => {
  reset()
  res.status(204).send()
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
```

### Frontend

The frontend is a small React single-page-app. I won't go into the details, but you can find the code in the
[git repo here](https://github.com/manuel-mauky/playwright-record-replay). The app will trigger REST requests to get and
manipulate the task data. I'm using `@tanstack/react-query` here to handle the loading and error states, when doing the
requests, but again, you could use any other tools for this topic or implement it purely with `fetch` if you like.

## Playwright setup

The playwright setup is straight forward. I'm using the `yarn create playwright` command as described in
[the playwright documentation](https://playwright.dev/docs/intro). This will create a basic settings file
(`playwright.config.ts`) and some example tests. The only adjustment I've done in the settings file is to remove all
browsers but "chromium" because from my experience both firefox and safari aren't working well with playwright. With
these browsers, tests will sometimes fail for no obvious reason. Again, this would be a topic for an own blog post.

In the git repo you can find several e2e tests for all major functionality (adding a task, editing an existing task,
removing a task,...). I'm using a "Page Object" (see [Page Object Model](https://playwright.dev/docs/pom)) to
encapsulate the interaction with the app itself. It looks something like this:

```ts
export class TasksPageObject {
  readonly page: Page
  readonly addItemTextbox: Locator
  readonly addItemButton: Locator
  readonly taskList: Locator
  ...

  constructor(page: Page) {
    this.page = page
    this.addItemTextbox = page.getByRole("textbox")
    this.addItemButton = page.getByRole("button", { name: "Add"})
    this.taskList = page.getByTestId("task-list")
    ...
  }

  async addTask(title: string) {
    await this.addItemTextbox.fill(title)
    await this.addItemButton.click()
    await expect(this.taskList.getByRole("listitem").filter({hasText: title})).toBeVisible()
  }

  ...
}
```

This makes the e2e tests cleaner and easier to read a bit. Instead of having to repeat the low-level interactions for
adding a task in all e2e tests, we can just invoke `addTask`. And it encapsulates the locators that make it easier to
update those if the page gets refactored.

An actual e2e tests can look like this:

```ts
import { expect, test } from "@playwright/test"
import { TasksPageObject } from "./tasks.page.ts"

test("add task", async ({ page }) => {
  const tasksPage = new TasksPageObject(page)
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
```

## Record and Replay

Now that we have the basic example ready and also some e2e tests running, we can get back to the actual topic: Implement
a "record and replay" feature for e2e tests.

Let's have a closer look at the "add task" test again. Basically, this will involve three network requests to the REST
API. First the app will do a `GET /tasks` to get all items for the initial state. This will be an empty array. Then a
`POST /tasks` will be triggered to add the new item. And in the last step, a `GET /tasks` will be done again which now
returns an array with one item. We can already see that it won't be enough to just have a single mock for every API
endpoint. Just creating a mock for `GET /tasks` that returns a static number of items won't do the trick because the
responses depend on previous requests. Instead, we will record the requests for each e2e test individually.

### `routeFromHAR`

Playwright provides the `routeFromHAR` function. It looks like this:

```ts
await page.routeFromHAR("./path/to/file", {
  url: `http://localhost:4000/**/*`,

  update: true, // `true` for record, `false` for replay
})
```

At first glance, this function already does what we want to achieve. However, in the
[Documentation for Mock APIs](https://playwright.dev/docs/mock#mocking-with-har-files), you can see that it's used right
in the e2e test itself. As stated before, we don't want to put record/replay specific code into e2e tests but instead
have this code encapsulated outside tests. Therefore, we will create a _Playwright fixture_.

### Playwright fixture

Fixtures are a way of encapsulating test-related code and make it reusable for several tests. They allow us to intercept
the execution of tests and to provide utils to tests.

We will create a fixture for the standard `test` function that's used to write e2e tests in playwright. This way, every
test execution will get record/replay behavior without any additional changes to the tests.

#### Basic fixture setup

First we create a file `src/e2e/utils/fixtures.ts`. The minimal setup looks like this:

```ts
import { test as testBase } from "@playwright/test"

export const test = testBase.extend({
  page: async ({ page }, use) => {
    await use(page)
  },
})
```

The call of `use` basically marks the point-in-time where the actual test is executed. Everything before the line
`await use(page)` will be done before test execution, and everything after that call will be done after test execution.
In our case, everything we're doing will be done _before_ `await use(page)`. The only change we need to do in our e2e
tests is to replace the import of `test`:

`import { test } from "@playwright/test"`

becomes

`import { test } from "./utils/fixtures.ts"`

#### Env variable and database reset

The first thing we need to do is to decide whether we are in "record mode" or in "replay mode". We will use an
environment variable for this.

There is one issue with our current e2e tests that we can fix now. Tests aren't independent of each other. For example,
our test for adding a task expects the initial state to be an empty list of tasks. But when this test is executed as
second time, this expectation won't be true anymore. So we need to reset the data for every test execution. In the
backend, we've added a `/debug/reset` endpoint that can be used for this. As said before, in a real app, this will
likely be a bit more complex, but we won't go into more details here.

We will do the reset only in recordMode because in replayMode, the backend won't be used at all.

```ts
const BASE_API_URL = "http://localhost:4000"

...
page: async ({ page, request }, use) => {
  const recordMode = process.env.PLAYWRIGHT_REPLAY !== "true"

  if(recordMode) {
    const response = await request.post(`${BASE_API_URL}/debug/reset`)

    if(!response.ok()) {
      throw Error("Failed to reset tasks in backend")
    }
  }

  await use(page)
}
```

#### Record requests

Now we can start recording. We will record requests for every test individually and store the recorded requests and
responses in a separate HAR file for each test. In the first step, we need to determine the file name for that HAR file
depending on the currently running test. Playwright provides the
[`TestInfo` class](https://playwright.dev/docs/api/class-testinfo) that we can also use in our fixture.

The TestInfo contains `titlePath` which is an array of strings containing the hierarchical titles of a test. Imagine a
test like this:

```ts
// src/e2e/some-folder/edit-task.e2e.ts

test.describe("edit tasks", () => {
  test.describe("edit an existing task", () => {
    test("should successfully edit a task", async () => {
      // test steps
    })

    test("should fail for invalid data", async () => {
      // test steps
    })
  })
})
```

This file contains two tests which are structured via `test.describe`. Grouping together related tests is a good idea to
keep track of the tests. The `titlePath` for the first test will look like this:

```ts
;["some-folder/edit-task.e2e.ts", "edit tasks", "edit and existing task", "should successfully edit a task"]
```

The first string is the filename including any subfolders. We can use this to construct a unique id to identify
individual tests. I'm using this function:

```ts
function getTestId(testInfo: TestInfo) {
  return testInfo.titlePath.join("_").replaceAll(" ", "-").replace(".e2e.ts", "")
}
```

In my fixture, I'm using the function like this:

```ts
import { join } from "node:path"

...

page: async ({ page, request }, use, testInfo) => {
  const recordMode = process.env.PLAYWRIGHT_REPLAY !== "true"

  if(recordMode) {
    const response = await request.post(`${BASE_API_URL}/debug/reset`)

    if(!response.ok()) {
      throw Error("Failed to reset tasks in backend")
    }
  }


  const testFileName = testInfo.titlePath[0]
  const testId = getTestId(testInfo)

  const harFilePath = join("src", "e2e", "api-mock", testFileName.replace(".e2e.ts", ""), testId)

  // TODO: setup recording

  await use(page)
}
```

The path may be adjusted to your personal needs. I'm creating a separate folder per test file and within that folder,
for each test a separate file will be created.

The next step is to set up the actual recording.

The code looks like this:

```ts
await page.routeFromHAR(`${harFilePath}.json`, {
  url: "http://localhost:4000/**/*",

  update: recordMode,
  updateContent: "embed",
  updateMode: "minimal",
})
```

The `url` param tells playwright which API calls to intercept and record. In our case, it's the base URL of our REST
API. `update` determines whether to record or replay. We're directly using our `recordMode` variable that's depending on
the environment variable. `updateContent: "embed"` tells playwright to embed the response data directly in the HAR file.
Without this, playwright would create a separate JSON file with a cryptic random name for the data payload of each
response. This might be a good idea in apps where the payload is quite big. And finally, the `updateMode` setting is
used to limit the amount of data that is recorded, especially related to timing and performance. We don't need that kind
of data in our case.

The full fixture now looks like this:

```ts
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

    await page.routeFromHAR(`${harFilePath}.json`, {
      url: `http://localhost:4000/**/*`,

      update: recordMode,
      updateContent: "embed",
      updateMode: "minimal",
    })

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})
```

With this setup, we're now able to record requests and responses during test execution. We only need to run the test
with the given environment variable set. For this, in my package.json I've added these scripts:

```json
"scripts": {
  "test:e2e:record": "playwright test",
  "test:e2e:record:ui": "playwright test --ui",
  "test:e2e:replay": "cross-env PLAYWRIGHT_REPLAY=true playwright test",
  "test:e2e:replay:ui": "cross-env PLAYWRIGHT_REPLAY=true playwright test --ui"
}
```

As you can see, I'm also preparing scripts to run playwright in the [UI Mode](https://playwright.dev/docs/test-ui-mode)
because that's a very cool feature of playwright I'm using a lot in day-to-day work.

When running the "add tasks" test from above, there will now be a new file
`src/e2e/api-mock/add-tasks/add-task_add-tasks.json` file. This is a JSON file is a recording of all requests for that
specific test. Besides some meta-data, there is an "entries" array which contains the requests with their response. The
content looks something like this:

```json
{
  "log": {
    "version": "1.2",
    "creator": {
      "name": "Playwright",
      "version": "1.52.0"
    },
    "browser": {
      "name": "chromium",
      "version": "136.0.7103.25"
    },
    "entries": [
      {
        "startedDateTime": "2025-06-23T12:06:04.814Z",
        "time": 11.021,
        "request": {
          "method": "GET",
          "url": "http://localhost:4000/tasks",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "accept", "value": "*/*" },
            { "name": "accept-language", "value": "en-US" },
            { "name": "origin", "value": "http://localhost:5173" },
            { "name": "referer", "value": "http://localhost:5173/" },
            {
              "name": "user-agent",
              "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.25 Safari/537.36"
            },
            {
              "name": "sec-ch-ua",
              "value": "\"Chromium\";v=\"136\", \"HeadlessChrome\";v=\"136\", \"Not.A/Brand\";v=\"99\""
            },
            { "name": "sec-ch-ua-mobile", "value": "?0" },
            { "name": "sec-ch-ua-platform", "value": "\"Windows\"" }
          ],
          "queryString": [],
          "headersSize": -1,
          "bodySize": -1
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "Access-Control-Allow-Origin", "value": "*" },
            { "name": "Connection", "value": "keep-alive" },
            { "name": "Content-Length", "value": "12" },
            {
              "name": "Content-Type",
              "value": "application/json; charset=utf-8"
            },
            { "name": "Date", "value": "Mon, 23 Jun 2025 12:06:04 GMT" },
            { "name": "ETag", "value": "W/\"c-vYhJ+637j7hGzLiQJl8ECNUD9Wk\"" },
            { "name": "Keep-Alive", "value": "timeout=5" },
            { "name": "X-Powered-By", "value": "Express" }
          ],
          "content": {
            "size": -1,
            "mimeType": "application/json; charset=utf-8",
            "text": "{\"tasks\":[]}"
          },
          "headersSize": -1,
          "bodySize": -1,
          "redirectURL": ""
        },
        "cache": {},
        "timings": { "send": -1, "wait": -1, "receive": 11.021 }
      },
      {
        "startedDateTime": "2025-06-23T12:06:04.904Z",
        "time": 3.803,
        "request": {
          "method": "POST",
          "url": "http://localhost:4000/tasks",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "accept", "value": "*/*" },
            { "name": "accept-language", "value": "en-US" },
            { "name": "content-type", "value": "application/json" },
            { "name": "origin", "value": "http://localhost:5173" },
            { "name": "referer", "value": "http://localhost:5173/" },
            {
              "name": "user-agent",
              "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.25 Safari/537.36"
            },
            {
              "name": "sec-ch-ua",
              "value": "\"Chromium\";v=\"136\", \"HeadlessChrome\";v=\"136\", \"Not.A/Brand\";v=\"99\""
            },
            { "name": "sec-ch-ua-mobile", "value": "?0" },
            { "name": "sec-ch-ua-platform", "value": "\"Windows\"" }
          ],
          "queryString": [],
          "headersSize": -1,
          "bodySize": -1,
          "postData": {
            "mimeType": "application/json",
            "text": "{\"title\":\"Do homework\"}",
            "params": []
          }
        },
        "response": {
          "status": 201,
          "statusText": "Created",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "Access-Control-Allow-Origin", "value": "*" },
            { "name": "Connection", "value": "keep-alive" },
            { "name": "Content-Length", "value": "57" },
            {
              "name": "Content-Type",
              "value": "application/json; charset=utf-8"
            },
            { "name": "Date", "value": "Mon, 23 Jun 2025 12:06:04 GMT" },
            { "name": "ETag", "value": "W/\"39-tAuF26j5h8QrpW1xXm4mbu/kxT4\"" },
            { "name": "Keep-Alive", "value": "timeout=5" },
            { "name": "X-Powered-By", "value": "Express" }
          ],
          "content": {
            "size": -1,
            "mimeType": "application/json; charset=utf-8",
            "text": "{\"task\":{\"id\":0,\"title\":\"Do homework\",\"completed\":false}}"
          },
          "headersSize": -1,
          "bodySize": -1,
          "redirectURL": ""
        },
        "cache": {},
        "timings": { "send": -1, "wait": -1, "receive": 3.803 }
      },
      {
        "startedDateTime": "2025-06-23T12:06:04.910Z",
        "time": 4.212,
        "request": {
          "method": "GET",
          "url": "http://localhost:4000/tasks",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "accept", "value": "*/*" },
            { "name": "accept-language", "value": "en-US" },
            { "name": "origin", "value": "http://localhost:5173" },
            { "name": "referer", "value": "http://localhost:5173/" },
            {
              "name": "user-agent",
              "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.25 Safari/537.36"
            },
            {
              "name": "sec-ch-ua",
              "value": "\"Chromium\";v=\"136\", \"HeadlessChrome\";v=\"136\", \"Not.A/Brand\";v=\"99\""
            },
            { "name": "sec-ch-ua-mobile", "value": "?0" },
            { "name": "sec-ch-ua-platform", "value": "\"Windows\"" }
          ],
          "queryString": [],
          "headersSize": -1,
          "bodySize": -1
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "Access-Control-Allow-Origin", "value": "*" },
            { "name": "Connection", "value": "keep-alive" },
            { "name": "Content-Length", "value": "60" },
            {
              "name": "Content-Type",
              "value": "application/json; charset=utf-8"
            },
            { "name": "Date", "value": "Mon, 23 Jun 2025 12:06:04 GMT" },
            { "name": "ETag", "value": "W/\"3c-2YpHp+sblhPZ2nBxnzaAZrvsmjU\"" },
            { "name": "Keep-Alive", "value": "timeout=5" },
            { "name": "X-Powered-By", "value": "Express" }
          ],
          "content": {
            "size": -1,
            "mimeType": "application/json; charset=utf-8",
            "text": "{\"tasks\":[{\"id\":0,\"title\":\"Do homework\",\"completed\":false}]}"
          },
          "headersSize": -1,
          "bodySize": -1,
          "redirectURL": ""
        },
        "cache": {},
        "timings": { "send": -1, "wait": -1, "receive": 4.212 }
      }
    ]
  }
}
```

You can see that the recording contains three request objects in the "entries" array. Included are also all headers,
response codes, and some other meta-data.

#### Fixing Replay

While this setup already works for recording, the replay mode will not work properly yet. The issue is in the way how
Playwright determines which recorded response to use for an incoming request. While the requests are stored in the HAR
file in the same order they've been triggered by the app, playwright won't just simply use them in the same order.
Instead, they're using a matching algorithm that's trying to find the best matching entry for an incoming request.
However, in our case, the first and the third entry is quite similar. They are requests for the same endpoint
`GET /tasks` and have the same headers. Only the actual timestamps are different. Only the response is different (empty
array in the first one and an array with one element for the third one). However, Playwright cannot use the response for
matching. So basically, when we run the tests in replay mode, when the first `GET /tasks` requests arrives, both
recorded requests will match and Playwright will use the _third_ request instead of the _first_ one, which will let our
e2e test fail.

In the [docs](https://playwright.dev/docs/mock#replaying-from-har) we can read:

> HAR replay matches URL and HTTP method strictly. For POST requests, it also matches POST payloads strictly. If
> multiple recordings match a request, the one with the most matching headers is picked.

However, I'm not 100% sure how playwright is determining which request to choose if more than one has the same number of
matching headers. I assume that the last request is a better fit because the timestamps are closer to that of the new
incoming request.

This is a know limitation and there is
[lengthy discussion on github about this issue](https://github.com/microsoft/playwright/issues/18288). Basically, the
workaround is to add additional headers to the request to be able to uniquely identify them.

So the first step is to intercept all requests that are going to the REST API. Notice, this code has to come _after_ the
`routeFromHAR` invocation. Otherwise, it won't be part of the recording:

```ts
// routeFromHAR ...

await page.route("http://localhost:4000/**/*", async (route, request) => {
  const headers = await request.allHeaders()

  return route.fallback({
    headers: {
      ...headers,
      // TODO add custom headers
    },
  })
})

await use(page)
```

We will introduce a counter to record the number of incoming requests and add the counter as a header. For this, we need
to add a `Map` _outside_ of the fixture so that it's state is persisted across test executions.

```ts
const requestCounterMap = new Map<string, number>()

export const test = testBase.extend({
  ...
})
```

Now, in our request handler we can use this "global" map to store the counter-values:

```ts
await page.route("http://localhost:4000/**/*", async (route, request) => {
  const headers = await request.allHeaders()
  const requestId = `${testId}_${request.url()}_${request.method()}`

  const previousRequestCounter = requestCounterMap.get(requestId) ?? 0
  const currentRequestCounter = previousRequestCounter + 1

  requestCounterMap.set(requestId, currentRequestCounter)

  return route.fallback({
    headers: {
      ...headers,
      "X-PLAYWRIGHT-REQUEST-COUNT": String(currentRequestCounter),
    },
  })
})
```

The code creates a "requestId" that consists of the `testId` that is already defined above and the `url` and `method` of
the incoming request. Then we take the previous counter-value from the map (or 0 if none exist yet), increase it by 1
and update the requestMap. And then we're adding a custom header with the counter-value as string.

This should help playwright to choose the correct request from the recording. However, In some bigger apps, I noticed
that there might still be cases where the wrong request is chosen. In the linked GitHub ticket where this basic idea was
born, there were also responses that this wasn't enough. A
[proposed solution](https://github.com/microsoft/playwright/issues/18288#issuecomment-2309957338) was to add basically
the same header multiple times (e.g. `"X-PLAYWRIGHT-REQUEST-COUNT-2"`, `"X-PLAYWRIGHT-REQUEST-COUNT-3"`) to convince
playwright to choose the right request. If you're facing issues in that direction, it might help to add additional
headers. I've also had some luck with adding the `requestId` as a separate header and in the linked GitHub ticket you
will find additional proposals, but I will keep the one header for now.

The full fixture code now looks like this:

```ts
import { test as testBase, type TestInfo } from "@playwright/test"
import { BASE_API_URL } from "../../tasks-api.ts"
import { join } from "node:path"

const requestCounterMap = new Map<string, number>()

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

    await page.routeFromHAR(`${harFilePath}.json`, {
      url: `http://localhost:4000/**/*`,

      update: recordMode,
      updateContent: "embed",
      updateMode: "minimal",
    })

    await page.route("http://localhost:4000/**/*", async (route, request) => {
      const headers = await request.allHeaders()
      const requestId = `${testId}_${request.url()}_${request.method()}`

      const previousRequestCounter = requestCounterMap.get(requestId) ?? 0
      const currentRequestCounter = previousRequestCounter + 1

      requestCounterMap.set(requestId, currentRequestCounter)

      return route.fallback({
        headers: {
          ...headers,
          "X-PLAYWRIGHT-REQUEST-COUNT": String(currentRequestCounter),
        },
      })
    })

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})
```

With this setup, I was able to successfully record _and_ replay my tests. It allows me to run the e2e tests without the
backend running.

However, there are still some adjustments to be done before I'm really happy with the result.

### Git diff

Let's have another look at the generated HAR files. A request/response looks something like this:

```json
{
  "startedDateTime": "2025-07-11T08:58:32.320Z",
  "time": 5.856,
  "request": {
    "method": "GET",
    "url": "http://localhost:4000/tasks",
    "httpVersion": "HTTP/1.1",
    "cookies": [],
    "headers": [
      { "name": "accept", "value": "*/*" },
      { "name": "accept-language", "value": "en-US" },
      { "name": "origin", "value": "http://localhost:5173" },
      { "name": "referer", "value": "http://localhost:5173/" },
      { "name": "user-agent", "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.25 Safari/537.36" },
      { "name": "sec-ch-ua", "value": "\"Chromium\";v=\"136\", \"HeadlessChrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"" },
      { "name": "sec-ch-ua-mobile", "value": "?0" },
      { "name": "sec-ch-ua-platform", "value": "\"Windows\"" },
      { "name": "X-PLAYWRIGHT-REQUEST-COUNT", "value": "1" }
    ],
    "queryString": [],
    "headersSize": -1,
    "bodySize": -1
  },
  "response": {
    "status": 200,
    "statusText": "OK",
    "httpVersion": "HTTP/1.1",
    "cookies": [],
    "headers": [
      { "name": "Access-Control-Allow-Origin", "value": "*" },
      { "name": "Connection", "value": "keep-alive" },
      { "name": "Content-Length", "value": "12" },
      { "name": "Content-Type", "value": "application/json; charset=utf-8" },
      { "name": "Date", "value": "Fri, 11 Jul 2025 08:58:32 GMT" },
      { "name": "ETag", "value": "W/\"c-vYhJ+637j7hGzLiQJl8ECNUD9Wk\"" },
      { "name": "Keep-Alive", "value": "timeout=5" },
      { "name": "X-Powered-By", "value": "Express" }
    ],
    "content": {
      "size": -1,
      "mimeType": "application/json; charset=utf-8",
      "text": "{\"tasks\":[]}"
    },
    "headersSize": -1,
    "bodySize": -1,
    "redirectURL": ""
  },
  "cache": {},
  "timings": { "send": -1, "wait": -1, "receive": 5.856 }
},
```

As you can see, there are several data fields that contain timing-related values:

```json
"startedDateTime": "2025-07-11T08:58:32.320Z",
"time": 5.856,
```

Both "startedDateTime" and "time" will have different values for every test execution. But our goal was to `git commit`
those HAR files to have them available for other developers and the CI pipeline if needed. This won't work when there
are changes everytime a test is re-executed. The goal is this: When a developer sees a change in one of the HAR files,
it should be treated as a warning sign: Is this change intentionally? If you actually change something in your app code
or your e2e tests, then changes in the HAR files are perfectly fine. You should commit them together with your code
changes. If you didn't change your code but still there are changes in the HAR files, there might be a change in the
REST-APIs behavior. In this case, you should at least have a look at whether that difference in behavior somehow
influences your app or not.

But just running the tests without touching the code and without any changes in the REST-API shouldn't result in any
changes in your HAR files. How can we achieve this?

#### Sanitize HAR files

Let's create a script that will remove "unstable" values from the HAR files. As HAR files are basically just JSON files,
this isn't too hard. I will create a TypeScript script to do this job, but you could use a plain bash script as well. I
will use [tsx](https://github.com/privatenumber/tsx) to execute the standalone script and I will add `@types/har-format`
as dependency to have better TypeScript support when working with HAR files.

The script will iterate over all HAR files and remove values/fields which contain unstable data by applying a list of
filters.

The basic workflow looks like this:

```ts
// src/e2e/utils/sanitize-hars.ts

import fs from "node:fs/promises"
import FastGlob from "fast-glob"

async function main() {
  const files = await FastGlob(["src/e2e/api-mock/**/*.json"])

  for (const file of files) {
    const fileContent = await fs.readFile(file, { encoding: "utf-8" })

    const originalJson = JSON.parse(fileContent)

    const sanitizedJson = // TODO sanitize
      await fs.writeFile(file, JSON.stringify(sanitizedJson, null, 2), "utf-8")
  }
}
```

For the actual cleanup I'm using a list of `Filter` objects, which contain a `key` and (optionally) a `value`:

```ts
type Filter = {
  key: string
  value?: any
}

const filters: Array<Filter> = [
  {
    key: "time",
  },
  {
    key: "startedDateTime",
  },
  {
    key: "timings",
  },
  {
    key: "name",
    value: "Date",
  },
]
```

When those filters match key-value pairs or objects in the JSON, those will be removed.

The code for applying those filters looks like this:

```ts
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
```

I don't want to go into too many details, but basically we're traversing the JSON tree structure and look for matching
key-value pairs and objects and remove them.

This approach is kind of a sledgehammer approach. It does work for my example, but in a real-world application there
might be more sophisticated logic needed to filter and sanitize the HAR files. The good thing is: Even though we're
manipulating the HAR files, playwright can still work with them and replay our requests.

In addition to the sanitization, I've also added a separate "checkJson" function which will look at all requests and
verify that our custom "X-PLAYWRIGHT-REQUEST-COUNT" header is available:

```ts
import type { Log } from "har-format"

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
```

However, this isn't as useful as it might sound. Actually, there are good reasons for a recorded request to _not_ have
the custom header: When you're using playwright's mocking in your tests, those mocked requests will be recorded, but the
custom header might not be added. Here is one of my e2e tests as an example:

```ts
test("show error message when API is not available", async ({ page }) => {
  await page.route(`${BASE_API_URL}/**/*`, (route) => {
    return route.abort("connectionrefused")
  })

  const tasksPage = new TasksPageObject(page)
  await tasksPage.goto()

  await expect(page.getByText("Error: Failed to fetch")).toBeVisible({
    timeout: 15_000,
  })
})
```

Here I'm using playwrights `page.route` to simulate a connection error and expect an error message to be shown to the
user. In the recorded HAR file, this request will appear, but it won't have the custom header because I'm using
`route.abort` here which breaks out of the chain of execution of route mocking. The code in the fixture which adds the
custom header is never reached here. This is not an issue here because neither in replay-mode nor in record-mode the
real REST-API will be accessed and therefore no HAR mocking is required here at all. So the tests will still be executed
just fine in both modes.

Only the check method will complain. It's basically a false-negative here. For that reason, I would take it just as a
hint but not as a blocking error. The function can be valuable when debugging the e2e tests though.

#### Limitations

There is one big limitation to this approach: If your REST-API's payload contains variable values, this approach won't
work. For example, if you have to add a time-depending parameter to the request or the response `content` contains a
variable value, you're out of luck. Filtering those values from the request or response will likely influence the
behavior of your app and the outcome of the e2e tests.

It should still be possible to use the whole Record/Replay setup, but you will have to manually work with the changes in
your git working tree - either commit them or revert them everytime you run the tests in record mode.

## Authentication

There is another topic I'd like to cover: Authentication. In most apps, REST-Requests will require some form of user
authentication. A typical setup is to use OAuth / OpenID Connect. The user is signing in with their user credentials,
and an access token is stored locally in the browser. This token is sent with the request to the server which is
verifying the token and sends back the response if authentication was successful.

What does this mean for our e2e use-case? First of all, we will have to adjust our tests so that an access token is sent
with the requests. With Playwright, there are at least two options:

1. Execute the sign-in steps as part of the test execution. Basically, we're automating all the steps that a real user
   would do to sign in: Click on "sign in", navigate to the login form, enter the credentials, press "login" and so on.
   In the end, the browser will have the access token the same way as it would be the case in a normal user scenario
   with a real user.
2. Intercept all requests and add an access token "behind the scenes".

I won't go into the details of how to set up these options but just reference the
[Playwright Documentation](https://playwright.dev/docs/auth) on this topic.

What's important for our Record/Replay setup is: With HAR recording, the **access token will also be recorded and stored
in the HAR files**. And as we're committing the files in git, the **access tokens would be part of the git history**.
You can imagine that this is a hot topic and we should think about this a bit.

First of all: Is it really critical? I'd say, it depends. In a real-world application where I was implementing this
record/replay mechanisms, we were using only test user accounts in a pure local [Keycloak](https://www.keycloak.org/)
instance. Who ever would be able to acquire the access tokens from the git history wouldn't be able to do anything
meaningful with them. But when you're using a centrally hosted
[IAM](https://en.wikipedia.org/wiki/Identity_and_access_management) instance, it might be a different story.

In general, I would always try to prevent committing any credential data in git even though it _seems_ to be safe.

### Filter auth tokens from HARs

Good thing is, with our filtering and sanitizing script, we already have everything in place to remove auth data from
the recordings.

In my example setup, I'm using the first approach like described above: The login process is part of my test steps but
because the recording configured to only look for requests towards the REST API, those requests for signing in the user
won't be part of the recording. After the login is successful, the access-token will be added to every request towards
the API as a header param. Let's look at the recorded HAR files:

```json
...
"headers": [
  ...
  {
    "name": "authorization",
    "value": "Bearer eyJhbGciOiJFUzI1NiIs...Y1QFQ"
  },
]
```

The only thing we need to do is to add new filters to the filter list:

```
const filters: Array<Filter> = [
  ...
  {
    key: "name",
    value: "authorization",
  },
  {
    key: "name",
    value: "Authorization",
  },
```

In addition to the filter for `"authorization"` with lowercase I've also added the same filter with the first character
being upper case because I noticed that both cases can happen and this way we're on the safe side.

## Limitations

While this record/replay approach looks very promising, it also has some limitations I don't want to hide.

### Time depending payloads

In the filter script above, we've removed timing-related data from the recordings. However, this was only meta-data
neither needed for playwright to match requests and responses nor for the application to do its work. But in a
real-world application, this might be different. If you have time-related data in the _payload_ of the
requests/responses, it might be hard to get this approach to work. With "time-related" I mean data, that depends on the
point in time where the request or response is generated. For example, when the frontend sends a request to get all
items that were created in the timeframe between "now" and "one month ago". The request for this would likely include
the current date as filter param, and this would be different for every recording. Maybe it can be solved by using
playwrights [Clock](https://playwright.dev/docs/clock) feature which allows mocking the "current date" in the test
context.

However, if your API is expecting or returning time-dependent values, you will likely have a hard time with e2e tests
anyway because this also makes it harder to write propper expectations in your tests. But making e2e tests independent
of time-related values is its own separate topic.

### Polling

In our application, we have an automatic polling in the background: Every 30 seconds some requests are triggered
automatically to update the latest data. While for normal e2e testing, this isn't a big deal because our test data in
the test database is stable and so the returned values are always the same. The polling won't change the UI and so won't
interfere with the e2e tests in most situations. However, it will interfere with the record and replay mechanism.
Depending on when the tests are executed, sometimes a background polling request will happen during test execution and
therefore will be recorded while another time this might not be the case. This means that the recorded files might be
different at random.

To circumvent this, we had to disable polling for e2e tests. For the majority of our use-cases, this wasn't any issue.
But of course, the polling is part of the application and therefore should be tested properly. One way would be to have
individual tests that only focus on the polling behavior while the rest of the tests focus on the actual business logic.

## Separate recorded from non-recorded tests

Looking at the limitations, one way to solve the issues could be to separate tests into two categories: Those that run
with record/replay and those that don't. We need a way to mark some tests that will not work with record/replay mode and
will always require a real backend. In replay-mode, those tests will be skipped.

There are multiple ways with playwright to configure this, and I won't go into the details here. The first option is to
have a different file name pattern or a different subfolder for non-recording tests. This way, you can filter the tests
by file path pattern. In Playwright, you can use so-called [Projects](https://playwright.dev/docs/test-projects) for
this use-case. "Projects" allow you to define different options for a different set of files.

Another way to solve this would be to adjust our fixtures, for example, by passing a param that marks a test as
non-recording. This way, you can define on a test-by-test level which one is suitable for record/replay and which is
not, even in the same test file.

## Conclusion

The possibility to have a record/replay mechanism for e2e tests is promising. You can run tests agains an api mock
without having to manually write and update the mock. But you can also run the tests agains the real API to make sure
that your app code and e2e tests are actually working correctly and not just in a friendly simulated environment. This
way you can combine the best of both worlds.

However, it also comes with quite some limitations and the effort to get this kind of setup up and running shouldn't be
underestimated. Especially in bigger real-world scenarios, there might be many other difficulties on the way. In the
end, it's highly depending on the actual use-cases whether record/replay makes sense and is a real improvement or if
it's not worth the effort. The purpose of this blog post is not to convince you that you definitely should do this. It's
about telling you about an idea and providing the basic building blocks to build upon if you think this idea could be
beneficial in your application.
