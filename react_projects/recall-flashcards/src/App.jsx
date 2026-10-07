import { useEffect, useState } from 'react'
import { useDecks } from './context/DeckContext'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import DeckView from './components/DeckView'
import StudySession from './components/StudySession'

export default function App() {
    const { decks, exportJSON } = useDecks()
    const [selectedDeck, setSelectedDeck] = useState(null)
    const [studying, setStudying] = useState(false)

    const activeDeck = decks.find((d) => d.id === selectedDeck) ?? null

    // If the selected deck gets deleted, fall back to overview
    useEffect(() => {
        if (selectedDeck && !activeDeck) setSelectedDeck(null)
    }, [selectedDeck, activeDeck])

    return (
        <div className="app">
            <header className="topbar">
                <h1>🧠 Recall<span className="accent">.</span></h1>
                <span className="topbar__sub">spaced-repetition flashcards</span>
                <button className="btn btn--ghost btn--sm" onClick={exportJSON}>
                    ⬇ Export JSON
                </button>
            </header>

            <div className="layout">
                <Sidebar decks={decks} selected={selectedDeck} onSelect={setSelectedDeck} />
                {activeDeck
                    ? <DeckView deck={activeDeck} onStart={() => setStudying(true)} />
                    : <Dashboard onStartAll={() => setStudying(true)} />}
            </div>

            {studying && (
                <StudySession deckId={selectedDeck} onExit={() => setStudying(false)} />
            )}
        </div>
    )
}