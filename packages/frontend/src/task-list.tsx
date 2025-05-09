import { useQuery } from "@tanstack/react-query"
import type { Task } from "playwright-record-replay-backend"
import { fetchTasks } from "./tasks-api.ts"
import { TaskItem } from "./task-item.tsx"

export function TaskList() {
  const { isPending, isError, data, error } = useQuery<Array<Task>>({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  })

  if (isPending) {
    return <span>Loading...</span>
  }

  if (isError) {
    return <span>Error: {error.message}</span>
  }

  return (
    <div>
      <ul className="task-list">
        {data.map((task) => (
          <li key={task.id}>
            <TaskItem task={task} />
          </li>
        ))}
      </ul>
    </div>
  )
}
