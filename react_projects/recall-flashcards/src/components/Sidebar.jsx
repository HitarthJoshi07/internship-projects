import { useState } from 'react'
import { useDecks } from '../context/DeckContext'
import { isDue } from '../srs'

export default function Sidebar({ decks, selected, onSelect }) {
    const { cards, addDeck, deleteDeck } = useDecks()
    const [name, setName] = useState('')

    const dueIn = (deckId) => cards.filter((c) => c.deckId === deckId && isDue(c)).length
    const dueAll = cards.filter(isDue).length

    function submit(e) {
        e.preventDefault()
        const n = name.trim()
        if (!n) return
        addDeck(n)
        setName('')
    }

    return (
        <aside className="sidebar">
            <button
                className={`sidebar__item ${selected === null ? 'sidebar__item--active' : ''}`}
                onClick={() => onSelect(null)}
            >
                <span>📊 Overview</span>
                <span className="due-badge">{dueAll}</span>
            </button>

            <p className="sidebar__heading">Decks</p>

            {decks.map((d) => (
                <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    className={`sidebar__item ${selected === d.id ? 'sidebar__item--active' : ''}`}
                    onClick={() => onSelect(d.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(d.id)}
                >
                    <span className="sidebar__name">{d.name}</span>
                    <span className="sidebar__meta">
                        <span className="due-badge">{dueIn(d.id)}</span>
                        <button
                            className="icon-btn"
                            title="Delete deck"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete "${d.name}" and all its cards?`)) deleteDeck(d.id)
                            }}
                        >
                            🗑
                        </button>
                    </span>
                </div>
            ))}

            <form className="sidebar__add" onSubmit={submit}>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New deck name…"
                />
                <button className="btn btn--primary btn--sm">Add</button>
            </form>
        </aside>
    )
} 