import { MiddlewareHandler } from "hono"
import { bearerAuth } from "hono/bearer-auth"
import * as jose from "jose"
import { Agent } from "undici"

// The OIDC scope that's required for this app.
const requiredScope = "todo_app"

type UserIdToken = {
  iss: string
  scope: string
  sub: string
}

function isUserIdToken(obj: any): obj is UserIdToken {
  if (obj) {
    return (
      "iss" in obj &&
      typeof obj.iss === "string" &&
      "scope" in obj &&
      typeof obj.scope === "string" &&
      "sub" in obj &&
      typeof obj.sub === "string"
    )
  }

  return false
}

// In our testing-setup we're using self-signed certificates and therefore disable checking.
// in a real-world app you shouldn't do this.
const httpsAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
})

const JWKS = jose.createRemoteJWKSet(new URL("https://localhost:8443/oauth2/openid/playwright-demo/public_key.jwk"), {
  // @ts-expect-error
  [jose.customFetch]: (...args) => fetch(args[0], { ...args[1], dispatcher: httpsAgent }),
})

export const authMiddleware: MiddlewareHandler = bearerAuth({
  verifyToken: async (token, context) => {
    try {
      const { payload } = await await jose.jwtVerify(token, JWKS)

      if (isUserIdToken(payload)) {
        if (payload.scope.includes(requiredScope)) {
          context.set("userId", payload.sub)
          return true
        } else {
          console.log("Token doesn't contain required scope 'todo_app'")
        }
      } else {
        console.log("Not a valid OpenID Connect User Token")
      }
    } catch (e) {
      console.error(e)
    }
    return false
  },
})
