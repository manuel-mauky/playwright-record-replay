import type { Task } from "playwright-record-replay-backend"
import { useState } from "react"
import { PiCheck, PiTrash, PiXCircle } from "react-icons/pi"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteTask, updateTask } from "./tasks-api.ts"
import { toast } from "./toast-util.ts"

export function TaskItem({ task }: { task: Task }) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast("Task deleted!")
      return queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (error) => {
      toast(`An error occurred: ${error.message}`)
    },
  })
  const editMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (error) => {
      toast(`An error occurred: ${error.message}`)
    },
  })

  const [editMode, setEditMode] = useState(false)
  const [newTitle, setNewTitle] = useState(() => task.title)

  function onChangeTitle() {
    editMutation.mutate({
      ...task,
      title: newTitle,
    })
    setEditMode(false)
  }

  function onCancelEdit() {
    setNewTitle(task.title)
    setEditMode(false)
  }

  function onDelete() {
    deleteMutation.mutate(task.id)
  }

  function onDoubleClick() {
    setEditMode(true)
  }

  return (
    <div className="task-item">
      <div className="task-item-title" onDoubleClick={onDoubleClick}>
        {editMode ? (
          <>
            <input autoFocus={true} type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <button onClick={onChangeTitle} data-testid="change-ok" aria-label="change title">
              <PiCheck />
            </button>
            <button onClick={onCancelEdit} data-testid="change-cancel" aria-label="cancel changing title">
              <PiXCircle />
            </button>
          </>
        ) : (
          <span data-testid="title">{task.title}</span>
        )}
      </div>

      {!editMode && (
        <button onClick={onDelete} className="warning-button">
          <PiTrash />
          Delete
        </button>
      )}
    </div>
  )
}
