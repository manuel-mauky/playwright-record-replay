import "./App.css"
import { TaskList } from "./task-list.tsx"
import { AddTasksForm } from "./add-tasks-form.tsx"

function App() {
  return (
    <>
      <div className="app-root">
        <h1>Tasks</h1>
        <AddTasksForm />
        <TaskList />
      </div>
    </>
  )
}

export default App
