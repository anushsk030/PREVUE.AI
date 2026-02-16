import { createContext } from "react"

const AuthContext = createContext({
  user: null,
  handleLogin: () => {},
  handleLogout: () => {},
  updateUser: () => {},
})

export default AuthContext
