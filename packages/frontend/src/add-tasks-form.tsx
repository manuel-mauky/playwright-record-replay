import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addTask } from "./tasks-api.ts"

export function AddTasksForm() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: addTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
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
      {mutation.isPending ? (
        "Adding task..."
      ) : (
        <>
          {mutation.isError && <div>An error occurred: {mutation.error.message}</div>}

          {mutation.isSuccess && <div>Task added!</div>}

          <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
          <button disabled={newTaskTitle.trim().length <= 0} onClick={addNewTask}>
            Add
          </button>
        </>
      )}
    </div>
  )
}
