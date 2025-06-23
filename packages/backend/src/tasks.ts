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
