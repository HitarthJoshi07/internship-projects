import Signup from "./pages/SignUp"
import Signin from "./pages/Signin"

import { Routes, Route, BrowserRouter } from "react-router-dom"
function App() {

  return (
   <>
   <BrowserRouter>
      <Routes>
          <Route path="/signup" element = {Signup}/>
          <Route path ="/signin" element= {Signin} />
      </Routes>
   </BrowserRouter>
   </ >
  )
}

export default App
