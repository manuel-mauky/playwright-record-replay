import "./login-trigger.css"
import { useAuth } from "react-oidc-context"

export function LoginTrigger() {
  const { isAuthenticated, signinRedirect, user, signoutRedirect } = useAuth()

  async function triggerLogin() {
    await signinRedirect()
  }

  async function triggerLogout() {
    await signoutRedirect()
  }

  return (
    <div className="login-trigger">
      {isAuthenticated ? (
        <div className="logged-in">
          <span>{user?.profile.preferred_username}</span>
          <button onClick={triggerLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={triggerLogin}>Login</button>
      )}
    </div>
  )
}
