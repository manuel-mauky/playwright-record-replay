import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import { reset, tasksRouter } from "./tasks.js"
import { authMiddleware } from "./auth.js"

const app = new Hono()

declare module "hono" {
  interface ContextVariableMap {
    userId: string | undefined
  }
}

app.use("*", cors())
app.use("*", authMiddleware)
app.route("/tasks", tasksRouter)

app.get("/", (context) => {
  const req = context.req

  return context.json({
    _links: {
      tasks: `http://${req.header("host")}/tasks`,
    },
  })
})

// // Allow resetting for testing purposes
// // A real-world app should not have such an endpoint but should probably go to the database directly
app.post("/debug/reset", (context) => {
  reset()

  context.status(201)
  return context.text("Reset done")
})

serve(
  {
    fetch: app.fetch,
    port: 4000,
  },
  (info) => {
    console.log(`Server running at "http://localhost:${info.port}`)
  },
)
