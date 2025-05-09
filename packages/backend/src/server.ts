import express from "express"
import cors from "cors"
import { router as tasksRouter } from "./tasks.js"

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
