import type { Task } from "playwright-record-replay-backend"
import { getUser } from "./auth-config.ts"
import { REST_API_URI } from "./config.ts"

const TASKS_API_URL = `${REST_API_URI}/tasks`

function createAuthHeader() {
  const user = getUser()

  if (user) {
    const token = user.access_token

    return { Authorization: `Bearer ${token}` }
  }
}

export async function fetchTasks() {
  const response = await fetch(TASKS_API_URL, {
    headers: {
      ...createAuthHeader(),
    },
  })
  if (!response.ok) {
    throw new Error("Network response was not ok", { cause: response.statusText })
  }

  const result = await response.json()

  return result.tasks as Array<Task>
}

export async function addTask(title: string) {
  const response = await fetch(TASKS_API_URL, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      ...createAuthHeader(),
    },
    body: JSON.stringify({
      title,
    }),
  })

  if (!response.ok) {
    throw new Error("Network response was not ok", { cause: response.statusText })
  }

  const result = await response.json()
  return result.task as Task
}

export async function updateTask(task: Task) {
  const response = await fetch(`${TASKS_API_URL}/${task.id}`, {
    method: "put",
    headers: {
      "Content-Type": "application/json",
      ...createAuthHeader(),
    },
    body: JSON.stringify({
      title: task.title,
      completed: task.completed,
    }),
  })

  if (!response.ok) {
    throw new Error("Network response was not ok", { cause: response.statusText })
  }

  const result = await response.json()
  return result.task as Task
}

export async function deleteTask(id: number) {
  const response = await fetch(`${TASKS_API_URL}/${id}`, {
    method: "delete",
    headers: {
      ...createAuthHeader(),
    },
  })

  if (!response.ok) {
    throw new Error("Network response was not ok", { cause: response.statusText })
  }
}
