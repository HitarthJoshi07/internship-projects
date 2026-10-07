import { useEffect, useState } from 'react'
import { useDecks } from '../context/DeckContext'
import { GRADES, isDue, schedule, shuffle, fmtInterval } from '../srs'

export default function StudySession({ deckId, onExit }) {
    const { cards, gradeCard } = useDecks()

    // Snapshot the due queue once — grading changes the store, not this session
    const [initial] = useState(() =>
        shuffle(cards.filter((c) => (deckId ? c.deckId === deckId : true) && isDue(c)))
    )
    const [queue, setQueue] = useState(initial.map((c) => c.id))
    const [flipped, setFlipped] = useState(false)
    const [log, setLog] = useState({ again: 0, hard: 0, good: 0, easy: 0 })

    const total = initial.length
    const done = total - queue.length
    const current = cards.find((c) => c.id === queue[0])

    function grade(g) {
        const id = queue[0]
        gradeCard(id, g)
        setLog((l) => ({ ...l, [g]: l[g] + 1 }))
        // "again" sends the card to the back of the queue (relearn step)
        setQueue((q) => (g === 'again' ? [...q.slice(1), q[0]] : q.slice(1)))
        setFlipped(false)
    }

    // Keyboard: Space = flip, 1–4 = grade, Esc = exit
    useEffect(() => {
        function onKey(e) {
            if (e.key === ' ') {
                e.preventDefault()
                setFlipped((f) => !f)
            } else if (e.key === 'Escape') {
                onExit()
            } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
                grade(GRADES[Number(e.key) - 1])
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [flipped, queue, onExit])

    if (!current) {
        const graded = log.again + log.hard + log.good + log.easy
        const accuracy = graded ? Math.round((1 - log.again / graded) * 100) : 100
        return (
            <div className="session">
                <div className="session__done panel">
                    <h2>🎉 Session complete</h2>
                    <p className="muted">
                        {total} card{total !== 1 && 's'} graded · {accuracy}% first-try accuracy
                    </p>
                    <div className="session__log">
                        {GRADES.map((g) => (
                            <span key={g} className={`chip chip--${g}`}>
                                {g}: {log[g]}
                            </span>
                        ))}
                    </div>
                    <button className="btn btn--primary" onClick={onExit}>Back to decks</button>
                </div>
            </div>
        )
    }

    return (
        <div className="session">
            <header className="session__top">
                <button className="btn btn--ghost btn--sm" onClick={onExit}>✕ Exit</button>
                <div className="session__progress">
                    <div style={{ width: `${(done / total) * 100}%` }} />
                </div>
                <span className="muted">{done}/{total}</span>
            </header>

            <div
                className={`flip-card ${flipped ? 'flipped' : ''}`}
                onClick={() => setFlipped(!flipped)}
            >
                <div className="flip-inner">
                    <div className="flip-face flip-face--front">
                        <p>{current.front}</p>
                        <span className="muted">click or press <kbd>Space</kbd> to reveal</span>
                    </div>
                    <div className="flip-face flip-face--back">
                        <p>{current.back}</p>
                    </div>
                </div>
            </div>

            {flipped ? (
                <div className="grade-bar">
                    {GRADES.map((g, i) => (
                        <button key={g} className={`grade grade--${g}`} onClick={() => grade(g)}>
                            <span className="grade__key">{i + 1}</span>
                            {g}
                            <span className="grade__interval">
                                {fmtInterval(schedule(current.srs, g).interval)}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="muted grade-hint">
                    Grade buttons appear after flipping — each shows the interval it would schedule.
                </p>
            )}
        </div>
    )
}