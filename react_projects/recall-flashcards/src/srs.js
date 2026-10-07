/**
 * SuperMemo-2 scheduling (Anki-style), kept pure and framework-free
 * so it could be unit-tested or swapped for FSRS without touching the UI.
 *
 * Card SRS state:
 *   ease     — how quickly intervals grow (1.3–3.2)
 *   interval — days until next review
 *   reps     — total times reviewed
 *   lapses   — times forgotten ("again")
 *   due      — ISO date of next review
 */

export const GRADES = ['again', 'hard', 'good', 'easy']

const pad = (n) => String(n).padStart(2, '0')

/** Local-time ISO date (avoids UTC off-by-one from toISOString). */
export function todayISO() {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDaysISO(iso, days) {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d + days)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const newSrs = () => ({
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: todayISO(),
    lastReviewed: null,
})

/** Given current SRS state and a grade, compute the next state. */
export function schedule(srs, grade) {
    let { ease, interval, reps, lapses } = srs
    reps += 1

    switch (grade) {
        case 'again': // forgot it — reset, penalize ease, show again today
            lapses += 1
            ease = Math.max(1.3, ease - 0.2)
            interval = 0
            break
        case 'hard': // small bump
            ease = Math.max(1.3, ease - 0.15)
            interval = interval === 0 ? 1 : Math.round(interval * 1.2)
            break
        case 'good': // standard growth: interval × ease
            interval = interval === 0 ? 1 : Math.round(interval * ease)
            break
        case 'easy': // bonus growth + ease reward
            ease = Math.min(3.2, ease + 0.15)
            interval = interval === 0 ? 4 : Math.round(interval * ease * 1.3)
            break
        default:
            break
    }

    return {
        ease,
        interval,
        reps,
        lapses,
        due: addDaysISO(todayISO(), interval),
        lastReviewed: Date.now(),
    }
}

/** ISO dates compare correctly as strings. */
export const isDue = (card) => card.srs.due <= todayISO()

export function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/** Human-friendly interval: 0 → "now", 12 → "12d", 45 → "2mo", 400 → "1.1y" */
export function fmtInterval(days) {
    if (days === 0) return 'now'
    if (days < 30) return `${days}d`
    if (days < 365) return `${Math.round(days / 30)}mo`
    return `${(days / 365).toFixed(1)}y`
}