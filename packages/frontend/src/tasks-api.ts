import type { Task } from "playwright-record-replay-backend"

export const BASE_API_URL = "http://localhost:4000"
const TASKS_API_URL = `${BASE_API_URL}/tasks`

export async function fetchTasks() {
  const response = await fetch(TASKS_API_URL)
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
  })

  if (!response.ok) {
    throw new Error("Network response was not ok", { cause: response.statusText })
  }
}
