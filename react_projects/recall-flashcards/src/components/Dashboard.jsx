import { useMemo } from 'react'
import { useDecks } from '../context/DeckContext'
import { isDue, todayISO, addDaysISO } from '../srs'

export default function Dashboard({ onStartAll }) {
    const { cards } = useDecks()

    const stats = useMemo(() => {
        const reviews = cards.reduce((s, c) => s + c.srs.reps, 0)
        const lapses = cards.reduce((s, c) => s + c.srs.lapses, 0)
        return {
            total: cards.length,
            due: cards.filter(isDue).length,
            mature: cards.filter((c) => c.srs.interval >= 21).length,
            retention: reviews ? Math.round((1 - lapses / reviews) * 100) : null,
        }
    }, [cards])

    // 7-day forecast; overdue cards are folded into "Today"
    const forecast = useMemo(() => {
        const t = todayISO()
        return Array.from({ length: 7 }, (_, i) => {
            const date = addDaysISO(t, i)
            let count = cards.filter((c) => c.srs.due === date).length
            if (i === 0) count += cards.filter((c) => c.srs.due < t).length
            const label =
                i === 0
                    ? 'Today'
                    : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })
            return { date, count, label }
        })
    }, [cards])

    const max = Math.max(1, ...forecast.map((f) => f.count))

    return (
        <main className="main">
            <div className="main__head">
                <h2>Overview</h2>
                <button className="btn btn--primary" onClick={onStartAll} disabled={stats.due === 0}>
                    🎯 Study all due ({stats.due})
                </button>
            </div>

            <section className="stats">
                <Stat value={stats.total} label="Cards" />
                <Stat value={stats.due} label="Due now" tone="danger" />
                <Stat value={stats.mature} label="Mature (21d+)" tone="success" />
                <Stat
                    value={stats.retention != null ? `${stats.retention}%` : '—'}
                    label="Retention"
                />
            </section>

            <section className="panel">
                <h3>Due in the next 7 days</h3>
                <div className="chart">
                    {forecast.map((f) => (
                        <div key={f.date} className="chart__col" title={`${f.count} due on ${f.date}`}>
                            <span className="chart__count">{f.count || ''}</span>
                            <div className="chart__bar-wrap">
                                <div
                                    className="chart__bar"
                                    style={{ height: `${(f.count / max) * 100}%` }}
                                />
                            </div>
                            <span className="chart__label">{f.label}</span>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    )
}

function Stat({ value, label, tone }) {
    return (
        <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    )
}