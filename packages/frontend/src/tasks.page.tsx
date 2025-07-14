import { AddTasksForm } from "./add-tasks-form.tsx"
import { TaskList } from "./task-list.tsx"
import "./tasks.page.css"

export function TasksPage() {
  return (
    <>
      <h1>Tasks</h1>
      <AddTasksForm />
      <TaskList />
    </>
  )
}
