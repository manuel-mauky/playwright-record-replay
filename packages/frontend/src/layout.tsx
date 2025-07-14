import { Link, Outlet } from "react-router"
import { cssTransition, ToastContainer } from "react-toastify"
import { useMediaQuery } from "usehooks-ts"
import "./layout.css"

const DisabledAnimation = cssTransition({
  enter: "noop",
  exit: "noop",
  collapse: false,
})

export function Layout() {
  const isLightTheme = useMediaQuery("(prefers-color-scheme: light)")
  const isPrefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  return (
    <>
      <div className="app-root">
        <div className="app-header">
          <Link to={"/"}>
            <strong>TodoApp</strong>
          </Link>
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <ToastContainer
        theme={isLightTheme ? "light" : "dark"}
        {...(isPrefersReducedMotion ? { transition: DisabledAnimation } : {})}
      />
    </>
  )
}
