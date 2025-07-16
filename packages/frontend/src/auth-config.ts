import type { AuthProviderProps } from "react-oidc-context"
import { OAUTH_HANDLER_ROUTE } from "./router.tsx"
import { User, WebStorageStateStore } from "oidc-client-ts"

const baseUri = "https://localhost:5173"

const OAUTH_AUTHORITY = "https://localhost:8443/oauth2/openid/playwright-demo"
const OAUTH_CLIENT_ID = "playwright-demo"

export function resolveSessionStorageOidcKey(oauthAuthority: string, oauthClientId: string) {
  return `oidc.user:${oauthAuthority}:${oauthClientId}`
}

export function getUser() {
  const oidcStorage = localStorage.getItem(resolveSessionStorageOidcKey(OAUTH_AUTHORITY, OAUTH_CLIENT_ID))

  if (!oidcStorage) {
    return null
  } else {
    return User.fromStorageString(oidcStorage)
  }
}

export const oidcConfig: AuthProviderProps = {
  authority: OAUTH_AUTHORITY,
  client_id: OAUTH_CLIENT_ID,
  redirect_uri: `${baseUri}${OAUTH_HANDLER_ROUTE}`,
  scope: "openid email profile todo_app",
  monitorSession: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  post_logout_redirect_uri: `${window.location.origin}/logout`,
  response_type: "code",
}
