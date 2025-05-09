import "./App.css"
import { TaskList } from "./task-list.tsx"
import { AddTasksForm } from "./add-tasks-form.tsx"
import { cssTransition, ToastContainer } from "react-toastify"
import { useMediaQuery } from "usehooks-ts"

const DisabledAnimation = cssTransition({
  enter: "noop",
  exit: "noop",
  collapse: false,
})

function App() {
  const isLightTheme = useMediaQuery("(prefers-color-scheme: light)")
  const isPrefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  return (
    <>
      <div className="app-root">
        <h1>Tasks</h1>
        <AddTasksForm />
        <TaskList />
      </div>
      <ToastContainer
        theme={isLightTheme ? "light" : "dark"}
        {...(isPrefersReducedMotion ? { transition: DisabledAnimation } : {})}
      />
    </>
  )
}

export default App
