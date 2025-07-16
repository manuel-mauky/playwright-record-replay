import { useAuth } from "react-oidc-context"
import { Outlet } from "react-router"

export function AuthGuard() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Outlet />
  } else {
    return <>Please login</>
  }
}
