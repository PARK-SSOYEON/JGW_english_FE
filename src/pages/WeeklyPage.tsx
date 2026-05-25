import {useState, useEffect} from 'react'
import {format, parseISO} from 'date-fns'
import {ko} from 'date-fns/locale'
import api from '../lib/api'
import {Class, Schedule} from '../types'
import {useToast} from '../components/common/Toast'
import {useAuth} from '../hooks/useAuth'
import {DOW_LABELS, minutesToHM} from '../lib/utils'

interface WeeklyData {
    class: Class
    week_start: string
    week_end: string
    week_offset: number
    schedules: Schedule[]
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
    pending: {label: '미시작', badge: 'badge-gray'},
    in_progress: {label: '진행중', badge: 'badge-amber'},
    completed: {label: '완료', badge: 'badge-green'},
    expired: {label: '만료', badge: 'badge-red'},
}

export default function WeeklyPage() {
    const [classes, setClasses] = useState<Class[]>([])
    const [selectedCls, setSelectedCls] = useState<number | null>(null)
    const [weekOffset, setWeekOffset] = useState(0)
    const [data, setData] = useState<WeeklyData | null>(null)
    const [loading, setLoading] = useState(false)
    const toast = useToast()
    const {isSuper} = useAuth()

    useEffect(() => {
        api.get('/classes').then(({data}) => setClasses(data))
    }, [])

    useEffect(() => {
        if (!selectedCls) return
        fetchWeekly()
    }, [selectedCls, weekOffset])

    const fetchWeekly = async () => {
        if (!selectedCls) return
        setLoading(true)
        try {
            const {data: res} = await api.get('/schedules/weekly', {
                params: {class_id: selectedCls, week_offset: weekOffset}
            })
            setData(res)
        } catch {
            toast('불러오기 실패', 'error')
        } finally {
            setLoading(false)
        }
    }

    const completeSchedule = async (id: number) => {
        try {
            await api.patch(`/schedules/${id}`, {status: 'completed'})
            toast('완료 처리되었습니다.', 'success')
            fetchWeekly()
        } catch {
            toast('오류 발생', 'error')
        }
    }

    const changeStatus = async (id: number, status: string) => {
        try {
            await api.patch(`/schedules/${id}`, {status})
            toast('상태 변경 완료', 'success')
            fetchWeekly()
        } catch {
            toast('오류 발생', 'error')
        }
    }

    const deleteSchedule = async (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return
        try {
            await api.delete(`/schedules/${id}`)
            toast('삭제 완료', 'success')
            fetchWeekly()
        } catch {
            toast('오류 발생', 'error')
        }
    }

    const studySchedules = data?.schedules.filter(s => s.type === 'study') || []
    const retestSchedules = data?.schedules.filter(s => s.type === 'retest') || []

    const counts = (items: Schedule[]) => ({
        total: items.length,
        completed: items.filter(s => s.status === 'completed').length,
        expired: items.filter(s => s.status === 'expired').length,
        pending: items.filter(s => s.status === 'pending' || s.status === 'in_progress').length,
    })

    const schools = ['유신고', '창현고', '연무중', '다산중'] as const

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">주차별 현황</h2>

            {/* 반 선택 */}
            <div className="card p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">반 선택</h3>
                <div className="flex flex-wrap gap-2">
                    {schools.map(school => (
                        <div key={school} className="flex flex-wrap gap-1.5">
                            {classes.filter(c => c.school === school).map(c => (
                                <button key={c.id}
                                        onClick={() => {
                                            setSelectedCls(c.id);
                                            setWeekOffset(0)
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                            selectedCls === c.id
                                                ? 'bg-primary-light border-primary text-primary font-medium'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}>
                                    {c.name}
                                    <span className="text-xs text-gray-400 ml-1">({DOW_LABELS[c.day_of_week]})</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {!selectedCls ? (
                <div className="card p-12 text-center text-gray-400">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm">반을 선택하세요</p>
                </div>
            ) : loading ? (
                <div className="card p-8 text-center text-gray-400">불러오는 중...</div>
            ) : data && (
                <div>
                    {/* 주차 네비게이션 */}
                    <div className="flex items-center justify-between mb-4">
                        <button className="btn-secondary btn-sm"
                                onClick={() => setWeekOffset(w => w - 1)}>
                            ‹ 이전 주차
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-gray-900">
                                {format(parseISO(data.week_start), 'M/d (eee)', {locale: ko})}
                                {' ~ '}
                                {format(parseISO(data.week_end), 'M/d (eee)', {locale: ko})}
                            </p>
                            {weekOffset === 0 && (
                                <span className="text-xs text-primary font-medium">이번 주차</span>
                            )}
                            {weekOffset < 0 && (
                                <span className="text-xs text-gray-400">{Math.abs(weekOffset)}주 전</span>
                            )}
                            {weekOffset > 0 && (
                                <span className="text-xs text-gray-400">{weekOffset}주 후</span>
                            )}
                        </div>
                        <button className="btn-secondary btn-sm"
                                onClick={() => setWeekOffset(w => w + 1)}>
                            다음 주차 ›
                        </button>
                    </div>

                    {/* 재시험 섹션 */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-semibold text-gray-800">재시험</h3>
                            {(() => {
                                const c = counts(retestSchedules)
                                return (
                                    <>
                                        <span className="badge-green">완료 {c.completed}</span>
                                        <span className="badge-gray">미완료 {c.pending}</span>
                                        {c.expired > 0 && <span className="badge-red">만료 {c.expired}</span>}
                                        <span className="text-xs text-gray-400">/ 전체 {c.total}</span>
                                    </>
                                )
                            })()}
                        </div>

                        {retestSchedules.length === 0 ? (
                            <div className="card p-4 text-center text-gray-400 text-sm">재시험 없음</div>
                        ) : (
                            <div className="card overflow-hidden">
                                <div
                                    className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                                    <span className="col-span-2">이름</span>
                                    <span className="col-span-2">예정일</span>
                                    <span className="col-span-2">시간</span>
                                    <span className="col-span-2">기한</span>
                                    <span className="col-span-2">상태</span>
                                    <span className="col-span-2"></span>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {retestSchedules.map(s => {
                                        const meta = STATUS_META[s.status]
                                        return (
                                            <div key={s.id}
                                                 className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 ${
                                                     s.status === 'completed' ? 'opacity-50' : ''
                                                 }`}>
                                                <span
                                                    className="col-span-2 font-medium text-sm text-gray-900">{s.student_name}</span>
                                                <span className="col-span-2 text-xs text-gray-500">
                          {s.scheduled_date?.slice(5).replace('-', '/')}
                        </span>
                                                <span className="col-span-2 text-xs text-gray-500">
                          {(s as any).scheduled_time?.slice(0, 5) || '-'}
                        </span>
                                                <span className="col-span-2 text-xs text-gray-500">
                          {s.deadline_date?.slice(5).replace('-', '/') || '-'}
                        </span>
                                                <span className="col-span-2">
                          <span className={meta.badge}>{meta.label}</span>
                        </span>
                                                <span className="col-span-2 flex gap-1 justify-end">

                        {isSuper && (
                            <>
                                {s.status !== 'completed' && (
                                    <button className="btn-primary btn-sm"
                                            onClick={() => completeSchedule(s.id)}>
                                        완료
                                    </button>
                                )}
                                {s.status === 'completed' && (
                                    <button className="btn-secondary btn-sm"
                                            onClick={() => changeStatus(s.id, 'pending')}>
                                        취소
                                    </button>
                                )}
                                <button className="btn-danger btn-sm"
                                        onClick={() => deleteSchedule(s.id)}>
                                    삭제
                                </button>
                            </>
                        )}
                            </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 자습 섹션 */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-semibold text-gray-800">자습</h3>
                            {(() => {
                                const c = counts(studySchedules)
                                return (
                                    <>
                                        <span className="badge-green">완료 {c.completed}</span>
                                        <span className="badge-amber">미완료 {c.pending}</span>
                                        {c.expired > 0 && <span className="badge-red">만료 {c.expired}</span>}
                                        <span className="text-xs text-gray-400">/ 전체 {c.total}</span>
                                    </>
                                )
                            })()}
                        </div>

                        {studySchedules.length === 0 ? (
                            <div className="card p-4 text-center text-gray-400 text-sm">자습 없음</div>
                        ) : (
                            <div className="card overflow-hidden">
                                <div
                                    className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                                    <span className="col-span-2">이름</span>
                                    <span className="col-span-2">예정일</span>
                                    <span className="col-span-2">시간</span>
                                    <span className="col-span-2">필요/완료</span>
                                    <span className="col-span-2">상태</span>
                                    <span className="col-span-2"></span>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {studySchedules.map(s => {
                                        const meta = STATUS_META[s.status]
                                        const done = (s as any).done_minutes || 0
                                        const required = s.required_minutes || 0
                                        return (
                                            <div key={s.id}
                                                 className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 ${
                                                     s.status === 'completed' ? 'opacity-50' : ''
                                                 }`}>
                                                <span
                                                    className="col-span-2 font-medium text-sm text-gray-900">{s.student_name}</span>
                                                <span className="col-span-2 text-xs text-gray-500">
                          {s.scheduled_date?.slice(5).replace('-', '/')}
                        </span>
                                                <span className="col-span-2 text-xs text-gray-500">
                          {(s as any).scheduled_time?.slice(0, 5) || '-'}
                        </span>
                                                <span className="col-span-2 text-xs text-gray-600">
                          {minutesToHM(required)}
                                                    {done > 0 && (
                                                        <span className="text-green-600 ml-1">
                              ({minutesToHM(done)} 완료)
                            </span>
                                                    )}
                        </span>
                                                <span className="col-span-2">
                          <span className={meta.badge}>{meta.label}</span>
                        </span>
                                                <span className="col-span-2 flex gap-1 justify-end">
                                                    {isSuper && (
                                                        <>
                                                            {s.status !== 'completed' && (
                                                                <button className="btn-success btn-sm"
                                                                        onClick={() => completeSchedule(s.id)}>
                                                                    완료
                                                                </button>
                                                            )}

                                                            {s.status === 'completed' && (
                                                                <button className="btn-secondary btn-sm"
                                                                        onClick={() => changeStatus(s.id, 'in_progress')}>
                                                                    취소
                                                                </button>
                                                            )}

                                                            <button className="btn-danger btn-sm"
                                                                    onClick={() => deleteSchedule(s.id)}>
                                                                삭제
                                                            </button>

                                                        </>
                                                    )}
                        </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
