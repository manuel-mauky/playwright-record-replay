import { useAuth } from "react-oidc-context"
import { useNavigate } from "react-router"
import { useEffect } from "react"

export function AuthRedirectPage() {
  const { isAuthenticated } = useAuth()

  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  return <p>Auth Redirect</p>
}
