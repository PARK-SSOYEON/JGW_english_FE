import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'

interface Season {
    id: number
    name: string
    start_date: string
    end_date: string
    is_active: boolean
}

interface SeasonContextType {
    season: Season | null
    seasons: Season[]
    setSeason: (s: Season) => void
    loading: boolean
}

const SeasonContext = createContext<SeasonContextType | null>(null)

export function SeasonProvider({ children }: { children: ReactNode }) {
    const [season,  setSeason]  = useState<Season | null>(null)
    const [seasons, setSeasons] = useState<Season[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            try {
                const [activeRes, allRes] = await Promise.all([
                    api.get('/seasons/active'),
                    api.get('/seasons'),
                ])
                setSeason(activeRes.data)
                setSeasons(allRes.data)
            } catch {} finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    return (
        <SeasonContext.Provider value={{ season, seasons, setSeason, loading }}>
            {children}
        </SeasonContext.Provider>
    )
}

export function useSeason() {
    const ctx = useContext(SeasonContext)
    if (!ctx) throw new Error('useSeason must be inside SeasonProvider')
    return ctx
}
