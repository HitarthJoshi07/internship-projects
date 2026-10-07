import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DeckProvider } from './context/DeckContext'
import './index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <DeckProvider>
            <App />
        </DeckProvider>
    </StrictMode>
)
