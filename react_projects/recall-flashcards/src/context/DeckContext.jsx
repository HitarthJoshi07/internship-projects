import { createContext, useContext, useEffect, useReducer } from 'react'
import { newSrs, schedule, todayISO, addDaysISO } from '../srs'
import { uid } from '../utils'

const DeckContext = createContext(null)

// ---------- seed data so the app is alive on first run ----------
function seedCard(deckId, front, back, srs = {}) {
    return { id: uid(), deckId, front, back, srs: { ...newSrs(), ...srs } }
}

const T = todayISO()

const seed = {
    decks: [
        { id: 'deck-js', name: 'JavaScript Fundamentals', createdAt: Date.now() },
        { id: 'deck-es', name: 'Spanish Vocabulary', createdAt: Date.now() },
    ],
    cards: [
        seedCard('deck-js', 'What is a closure?',
            'A function that remembers variables from its outer lexical scope, even after that scope has finished executing.'),
        seedCard('deck-js', 'Difference between == and ===?',
            '== coerces types before comparing; === compares value AND type with no coercion.'),
        seedCard('deck-js', 'What does Array.prototype.reduce do?',
            'Folds an array into a single value by running an accumulator function over every element.'),
        seedCard('deck-js', 'What is the event loop?',
            'The mechanism that moves callbacks from task queues onto the call stack when it empties — enabling non-blocking concurrency.',
            { interval: 45, reps: 5, lapses: 1, ease: 2.3, due: addDaysISO(T, 45), lastReviewed: Date.now() }),
        seedCard('deck-es', 'the kitchen', 'la cocina'),
        seedCard('deck-es', 'to remember', 'recordar',
            { interval: 6, reps: 3, ease: 2.6, due: addDaysISO(T, 6), lastReviewed: Date.now() }),
        seedCard('deck-es', 'the weather', 'el tiempo',
            { interval: 2, reps: 2, ease: 2.4, due: addDaysISO(T, 2), lastReviewed: Date.now() }),
        seedCard('deck-es', 'however / nevertheless', 'sin embargo',
            { interval: 1, reps: 1, ease: 2.5, due: addDaysISO(T, 1), lastReviewed: Date.now() }),
    ],
}

function reducer(state, action) {
    switch (action.type) {
        case 'ADD_DECK':
            return {
                ...state,
                decks: [...state.decks, { id: uid(), name: action.payload, createdAt: Date.now() }],
            }

        case 'DELETE_DECK': // cascade: remove its cards too
            return {
                decks: state.decks.filter((d) => d.id !== action.payload),
                cards: state.cards.filter((c) => c.deckId !== action.payload),
            }

        case 'ADD_CARD': {
            const { deckId, front, back } = action.payload
            return { ...state, cards: [seedCard(deckId, front, back), ...state.cards] }
        }

        case 'UPDATE_CARD':
            return {
                ...state,
                cards: state.cards.map((c) =>
                    c.id === action.payload.id
                        ? { ...c, front: action.payload.front, back: action.payload.back }
                        : c
                ),
            }

        case 'DELETE_CARD':
            return { ...state, cards: state.cards.filter((c) => c.id !== action.payload) }

        case 'GRADE_CARD': // scheduling lives in srs.js — reducer stays thin
            return {
                ...state,
                cards: state.cards.map((c) =>
                    c.id === action.payload.id
                        ? { ...c, srs: schedule(c.srs, action.payload.grade) }
                        : c
                ),
            }

        default:
            return state
    }
}

function load() {
    try {
        const raw = localStorage.getItem('recall.data')
        return raw ? JSON.parse(raw) : seed
    } catch {
        return seed
    }
}

export function DeckProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, null, load)

    useEffect(() => {
        try {
            localStorage.setItem('recall.data', JSON.stringify(state))
        } catch (err) {
            console.warn('Could not persist data:', err)
        }
    }, [state])

    const value = {
        decks: state.decks,
        cards: state.cards,
        addDeck: (name) => dispatch({ type: 'ADD_DECK', payload: name }),
        deleteDeck: (id) => dispatch({ type: 'DELETE_DECK', payload: id }),
        addCard: (deckId, front, back) => dispatch({ type: 'ADD_CARD', payload: { deckId, front, back } }),
        updateCard: (id, front, back) => dispatch({ type: 'UPDATE_CARD', payload: { id, front, back } }),
        deleteCard: (id) => dispatch({ type: 'DELETE_CARD', payload: id }),
        gradeCard: (id, grade) => dispatch({ type: 'GRADE_CARD', payload: { id, grade } }),
        exportJSON: () => {
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `recall-backup-${todayISO()}.json`
            a.click()
            URL.revokeObjectURL(url)
        },
    }

    return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}

export function useDecks() {
    const ctx = useContext(DeckContext)
    if (!ctx) throw new Error('useDecks must be used inside <DeckProvider>')
    return ctx
}