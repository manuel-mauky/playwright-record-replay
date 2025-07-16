import { createBrowserRouter } from "react-router"
import { Layout } from "./layout.tsx"
import { TasksPage } from "./tasks.page.tsx"
import { Error404Page } from "./404.page.tsx"
import { AuthRedirectPage } from "./auth-redirect.page.tsx"
import { AuthGuard } from "./auth-guard.tsx"

export const OAUTH_HANDLER_ROUTE = "/oauth/handler"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        children: [
          {
            // need authentication
            Component: AuthGuard,
            children: [
              {
                index: true,
                Component: TasksPage,
              },
            ],
          },
          {
            // doesn't need authentication
            children: [
              {
                path: OAUTH_HANDLER_ROUTE,
                Component: AuthRedirectPage,
              },
            ],
          },
        ],
      },
      {
        path: "*",
        Component: Error404Page,
      },
    ],
  },
])
