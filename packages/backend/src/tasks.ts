import { Context, Hono } from "hono"
import { createMiddleware } from "hono/factory"

export type User = {
  id: string
  tasks: Array<Task>
}

export type Task = {
  id: number
  title: string
  completed: boolean
}

let users: Map<string, User> = new Map()
let idCounter = 0

function getOrCreateUser(id: string) {
  const user = users.get(id)

  if (user) {
    return user
  } else {
    const newUser: User = {
      id,
      tasks: [],
    }
    users.set(id, newUser)
    return newUser
  }
}

const handleUserMiddleware = createMiddleware<{
  Variables: {
    user: User
  }
}>(async (context, next) => {
  const userId = context.get("userId")
  if (userId) {
    const user = getOrCreateUser(userId)

    context.set("user", user)

    await next()
  } else {
    context.status(401)
    return context.text("Unauthorized")
  }
})

export const tasksRouter = new Hono().use(handleUserMiddleware)

tasksRouter.post("/", async (context) => {
  const user = context.get("user")

  const body = await context.req.json()

  const newTask: Task = {
    id: idCounter++,
    title: body.title,
    completed: false,
  }

  user.tasks.push(newTask)

  context.status(201)

  return context.json({
    task: newTask,
  })
})

tasksRouter.get("/", handleUserMiddleware, (context) => {
  const user = context.get("user")

  return context.json({ tasks: user.tasks })
})

tasksRouter.get("/:id", (context) => {
  const user = context.get("user")
  const task = getTask(user, context)

  if (task) {
    return context.json({
      task,
    })
  } else {
    return context.notFound()
  }
})

tasksRouter.put("/:id", async (context) => {
  const user = context.get("user")
  const body = await context.req.json()

  const task = getTask(user, context)

  if (task) {
    task.title = body.title || task.title
    task.completed = body.completed || task.completed

    return context.json({ task })
  } else {
    return context.notFound()
  }
})

tasksRouter.delete("/:id", (context) => {
  const user = context.get("user")
  const task = getTask(user, context)

  if (task) {
    const index = user.tasks.indexOf(task)
    user.tasks.splice(index, 1)
    return context.body(null, 204)
  } else {
    return context.notFound()
  }
})

/**
 * return the task with the id (from request).
 */
function getTask(user: User, context: Context) {
  const id = context.req.param("id")
  return user.tasks.find((t) => t.id === Number.parseInt(id))
}

/**
 * used for testing. Resets the state of the tasks.
 */
export function reset() {
  users = new Map()
  idCounter = 0
}
