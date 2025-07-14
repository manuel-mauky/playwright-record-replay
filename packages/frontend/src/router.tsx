import { createBrowserRouter } from "react-router"
import { Layout } from "./layout.tsx"
import { TasksPage } from "./tasks.page.tsx"
import { Error404Page } from "./404.page.tsx"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        children: [
          {
            index: true,
            Component: TasksPage,
          },
          {
            path: "*",
            Component: Error404Page,
          },
        ],
      },
    ],
  },
])
