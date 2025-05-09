import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addTask } from "./tasks-api.ts"
import { toast } from "./toast-util.ts"

export function AddTasksForm() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: addTask,
    onSuccess: () => {
      toast("Task added!")
      return queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (error) => {
      toast(`An error occurred: ${error.message}`)
    },
  })

  const [newTaskTitle, setNewTaskTitle] = useState("")

  function addNewTask() {
    if (newTaskTitle.trim().length > 0) {
      mutation.mutate(newTaskTitle)
      setNewTaskTitle("")
    }
  }
  return (
    <div className="add-task-form">
      <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
      <button disabled={newTaskTitle.trim().length <= 0} onClick={addNewTask}>
        Add
      </button>
    </div>
  )
}
