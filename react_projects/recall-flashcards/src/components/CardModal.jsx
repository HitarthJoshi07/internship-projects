import { useEffect, useRef, useState } from 'react'
import { useDecks } from '../context/DeckContext'

export default function CardModal({ card, onClose }) {
    const { updateCard } = useDecks()
    const [front, setFront] = useState(card.front)
    const [back, setBack] = useState(card.back)
    const ref = useRef(null)

    useEffect(() => ref.current?.focus(), [])

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    function submit(e) {
        e.preventDefault()
        if (!front.trim() || !back.trim()) return
        updateCard(card.id, front.trim(), back.trim())
        onClose()
    }

    return (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form className="modal" onSubmit={submit}>
                <h3>Edit card</h3>
                <label>
                    Front
                    <textarea ref={ref} rows={2} value={front} onChange={(e) => setFront(e.target.value)} />
                </label>
                <label>
                    Back
                    <textarea rows={3} value={back} onChange={(e) => setBack(e.target.value)} />
                </label>
                <div className="modal__actions">
                    <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn--primary">Save</button>
                </div>
            </form>
        </div>
    )
} 