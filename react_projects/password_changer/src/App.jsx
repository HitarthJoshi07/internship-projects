import { useState, useCallback, useEffect, useRef } from 'react'
import './App.css'
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';


function App() {
  const [length, setLength] = useState(8)
  const [numAllowed, setNumAllowed] = useState(false);
  const [charAllowed, setCharAllowed] = useState(false);
  const [password, setPassword] = useState("")

  //use ref
  const passwordRef = useRef(null) 

  const passwordGenerator = useCallback(() => {
    let pass = "";
    let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    if (numAllowed) str += "0123456789";
    if (charAllowed) str += "!@#$%^&*(){}<>?/~`";

    for (let i = 0; i <= length; i++) {
      const char = Math.floor(Math.random() * str.length + 1);
      pass += str.charAt(char)
    }
    setPassword(pass)

  }, [length, numAllowed, charAllowed, setPassword])

  const copyPasswordToClipboard = useCallback( () => {
    passwordRef.current?.select()
    passwordRef.current?.setSelectionRange(0,password.length -1 )
    window.navigator.clipboard.writeText(password)
  }, [password])

  useEffect(() => {
    passwordGenerator()
  }, [length, numAllowed, charAllowed, passwordGenerator])

  return (
    <>
      <h1 className='text-5xl'>hello password genrerator </h1>
      <div className='flex flex-col justify-center w-fit items-center'>
        <div>
          <input type="text" value={password} placeholder='Password' readOnly className='w-100 bg-white p-2 rounded-l-xl px-3 selection:bg-fuchsia-300 selection:text-amber-300' ref ={passwordRef} />
          <button 
            onClick={copyPasswordToClipboard}
          className='bg-blue-500 text-white p-2 rounded-r-xl outline:none focus:not-enabled:'>Copy</button>
        </div>

        <div className='flex flex-wrap gap-2 items-center justify-center'>
          <Box sx={{ width: 120 }}>
            <Slider defaultValue={8} aria-label="Default" max={50} onChange={(e, newValue) => { setLength(newValue) }} />
          </Box>

          <h2>Length: ({length})</h2>

          <input type="checkbox" defaultChecked={charAllowed} id='char' onChange={() => {
            setCharAllowed((prev) => !prev);
          }} />
          <label htmlFor="char">SpecialCharacters</label>


          <input type="checkbox" defaultChecked={numAllowed} id='num' onChange={() => {
            setNumAllowed((prev) => !prev);
          }} />
          <label htmlFor="num">Numbers</label>

        </div>
      </div>
    </>
  )
}

export default App
