import { useState } from 'react'
import { useDecks } from '../context/DeckContext'
import { isDue, fmtInterval } from '../srs'
import CardModal from './CardModal'

export default function DeckView({ deck, onStart }) {
    const { cards, addCard, deleteCard } = useDecks()
    const deckCards = cards.filter((c) => c.deckId === deck.id)
    const due = deckCards.filter(isDue).length

    const [front, setFront] = useState('')
    const [back, setBack] = useState('')
    const [editing, setEditing] = useState(null)

    function quickAdd(e) {
        e.preventDefault()
        const f = front.trim()
        const b = back.trim()
        if (!f || !b) return
        addCard(deck.id, f, b)
        setFront('')
        setBack('')
    }

    return (
        <main className="main">
            <div className="main__head">
                <div>
                    <h2>{deck.name}</h2>
                    <p className="muted">{deckCards.length} cards · {due} due</p>
                </div>
                <button className="btn btn--primary" onClick={onStart} disabled={due === 0}>
                    ▶ Study ({due})
                </button>
            </div>

            <form className="quick-add panel" onSubmit={quickAdd}>
                <input
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder="Front (question)…"
                />
                <input
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder="Back (answer)…"
                />
                <button className="btn btn--primary">+ Add card</button>
            </form>

            <div className="card-list">
                {deckCards.length === 0 && (
                    <p className="muted panel">No cards yet — add your first one above.</p>
                )}
                {deckCards.map((c) => (
                    <div key={c.id} className="card-row">
                        <div className="card-row__text">
                            <strong>{c.front}</strong>
                            <span>{c.back}</span>
                        </div>
                        <div className="card-row__srs">
                            <span className={`chip ${isDue(c) ? 'chip--due' : ''}`}>
                                {isDue(c) ? 'due now' : `in ${fmtInterval(c.srs.interval)}`}
                            </span>
                            <span className="chip">ease {c.srs.ease.toFixed(2)}</span>
                            <button className="icon-btn" title="Edit" onClick={() => setEditing(c)}>✏️</button>
                            <button className="icon-btn" title="Delete" onClick={() => deleteCard(c.id)}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>

            {editing && <CardModal card={editing} onClose={() => setEditing(null)} />}
        </main>
    )
}