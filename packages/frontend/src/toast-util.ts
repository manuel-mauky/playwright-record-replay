import { toast as toastify } from "react-toastify"

// Wrapper to workaround a bug in react-toastify,
// see: https://github.com/fkhadra/react-toastify/issues/857#issuecomment-2865946582
export function toast(message: string) {
  requestAnimationFrame(() => {
    toastify(message)
  })
}
