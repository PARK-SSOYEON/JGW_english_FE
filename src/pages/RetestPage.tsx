import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import { Schedule, Class } from '../types'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { useSeason } from '../hooks/useSeason'
import { todayStr, DOW_LABELS } from '../lib/utils'

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'expired'

const STATUS_META: Record<string, { label: string; badge: string }> = {
    pending:     { label: '미시작', badge: 'badge-gray' },
    in_progress: { label: '진행중', badge: 'badge-amber' },
    completed:   { label: '완료',   badge: 'badge-green' },
    expired:     { label: '만료',   badge: 'badge-red' },
}

export default function RetestPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [classes,   setClasses]   = useState<Class[]>([])
    const [loading,   setLoading]   = useState(false)
    const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all')
    const [filterClassId, setFilterClassId] = useState<number | 'all'>('all')
    const [showExpired, setShowExpired] = useState(false)
    const toast = useToast()
    const { isSuper } = useAuth()
    const { season } = useSeason()

    const today = new Date()
    const todayDow = today.getDay()
    const todayStr_ = todayStr()

    const fetchSchedules = async () => {
        setLoading(true)
        try {
            const params: Record<string, any> = { type: 'retest' }
            if (season) params.season_id = season.id
            const { data } = await api.get('/schedules', { params })
            setSchedules(data)
        } catch {
            toast('불러오기 실패', 'error')
        } finally {
            setLoading(false)
        }
    }

    const fetchClasses = async () => {
        try {
            const { data } = await api.get('/classes')
            setClasses(data)
        } catch {}
    }

    useEffect(() => {
        fetchSchedules()
        fetchClasses()
    }, [season])

    const completeRetest = async (id: number) => {
        try {
            await api.patch(`/schedules/${id}`, { status: 'completed' })
            toast('완료 처리되었습니다.', 'success')
            fetchSchedules()
        } catch {
            toast('오류 발생', 'error')
        }
    }

    const deleteSchedule = async (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return
        try {
            await api.delete(`/schedules/${id}`)
            toast('삭제 완료', 'success')
            fetchSchedules()
        } catch {
            toast('오류 발생', 'error')
        }
    }

    const todayClassIds = classes
        .filter(c => c.day_of_week === todayDow)
        .map(c => c.id)

    const filtered = schedules.filter(s => {
        const isExpiredByDate = s.deadline_date && s.deadline_date.slice(0, 10) < todayStr_
        if (!showExpired && isExpiredByDate) return false
        if (statusFilter !== 'all' && s.status !== statusFilter) return false
        if (filterClassId !== 'all') {
            const cls = classes.find(c => c.id === filterClassId)
            if (cls && !s.class_names?.includes(cls.name)) return false
        }
        return true
    })

    const counts = {
        total:       schedules.length,
        pending:     schedules.filter(s => s.status === 'pending').length,
        in_progress: schedules.filter(s => s.status === 'in_progress').length,
        completed:   schedules.filter(s => s.status === 'completed').length,
        expired:     schedules.filter(s => s.status === 'expired').length,
    }

    const groupByClass = () => {
        if (filterClassId !== 'all') return { [filterClassId]: filtered }
        const groups: Record<string, Schedule[]> = {}
        filtered.forEach(s => {
            const key = s.class_names || '반 미배정'
            if (!groups[key]) groups[key] = []
            groups[key].push(s)
        })
        return groups
    }

    const grouped = groupByClass()

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">재시험 현황</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {season ? `📅 ${season.name} · ` : ''}
                        {format(today, 'M월 d일 (eee)', { locale: ko })} 기준
                    </p>
                </div>
                <button className="btn-secondary btn-sm" onClick={fetchSchedules}>새로고침</button>
            </div>

            {todayClassIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm font-medium text-blue-700">
                        📚 오늘 수업: {classes.filter(c => c.day_of_week === todayDow).map(c => c.name).join(', ')}
                    </p>
                </div>
            )}

            {/* 통계 카드 */}
            <div className="grid grid-cols-5 gap-2 mb-4">
                {([
                    { key: 'all',         label: '전체',  value: counts.total,       color: 'text-gray-800' },
                    { key: 'pending',     label: '미시작', value: counts.pending,     color: 'text-gray-500' },
                    { key: 'in_progress', label: '진행중', value: counts.in_progress, color: 'text-amber-600' },
                    { key: 'completed',   label: '완료',   value: counts.completed,   color: 'text-green-600' },
                    { key: 'expired',     label: '만료',   value: counts.expired,     color: 'text-red-600' },
                ] as const).map(({ key, label, value, color }) => (
                    <button key={key} onClick={() => setStatusFilter(key)}
                            className={`card p-3 text-center transition-all ${
                                statusFilter === key ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                            }`}>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </button>
                ))}
            </div>

            {/* 필터 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <select className="input w-auto text-sm"
                        value={filterClassId}
                        onChange={e => setFilterClassId(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                    <option value="all">전체 반</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name}{todayClassIds.includes(c.id) ? ' 📚' : ''}
                        </option>
                    ))}
                </select>

                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                    <input type="checkbox"
                           checked={showExpired}
                           onChange={e => setShowExpired(e.target.checked)}
                           className="rounded" />
                    지난 내역 보기
                </label>
            </div>

            {/* 목록 */}
            {loading ? (
                <div className="card p-8 text-center text-gray-400">불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div className="card p-10 text-center text-gray-400">
                    <p className="text-3xl mb-2">✅</p>
                    <p className="text-sm">해당 조건의 재시험이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([className, items]) => {
                        const cls = classes.find(c => c.name === className)
                        const isToday = cls ? todayClassIds.includes(cls.id) : false

                        return (
                            <div key={className}>
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <span className="text-sm font-semibold text-gray-700">{className}</span>
                                    {isToday && <span className="badge-blue text-[10px]">오늘 수업</span>}
                                    <span className="badge-gray">{items.length}명</span>
                                    <span className="text-xs text-green-600 ml-1">
                    완료 {items.filter(i => i.status === 'completed').length}/{items.length}
                  </span>
                                </div>

                                <div className="card overflow-hidden">
                                    <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                                        <span className="col-span-2">이름</span>
                                        <span className="col-span-2">학년</span>
                                        <span className="col-span-2">예정일</span>
                                        <span className="col-span-2">기한</span>
                                        <span className="col-span-2">상태</span>
                                        <span className="col-span-2"></span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {items.map(s => {
                                            const meta = STATUS_META[s.status] ?? { label: s.status, badge: 'badge-gray' }
                                            return (
                                                <div key={s.id}
                                                     className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 ${
                                                         s.status === 'completed' || s.status === 'expired' ? 'opacity-50' : ''
                                                     }`}>
                                                    <span className="col-span-2 font-medium text-gray-900 text-sm">{s.student_name}</span>
                                                    <span className="col-span-2 text-xs text-gray-500">{s.grade}학년</span>
                                                    <span className="col-span-2 text-xs text-gray-500 whitespace-nowrap">
                            {s.scheduled_date?.slice(0, 10)}
                                                        {(s as any).scheduled_time ? ` ${(s as any).scheduled_time.slice(0, 5)}` : ''}
                          </span>
                                                    <span className="col-span-2 text-xs text-gray-500 whitespace-nowrap">
                            {s.deadline_date?.slice(0, 10) || '-'}
                          </span>
                                                    <span className="col-span-2">
                            <span className={meta.badge}>{meta.label}</span>
                          </span>
                                                    <span className="col-span-2 flex gap-1 justify-end">
                            {s.status !== 'completed' && s.status !== 'expired' && (
                                <button className="btn-primary btn-sm" onClick={() => completeRetest(s.id)}>
                                    완료
                                </button>
                            )}
                                                        {isSuper && (
                                                            <button className="btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}>
                                                                삭제
                                                            </button>
                                                        )}
                          </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
