import { useState, useEffect } from 'react'
import api from '../lib/api'
import { AttendanceLog } from '../types'
import { formatDateTime, todayStr } from '../lib/utils'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const PURPOSE_LABEL: Record<string, { label: string; cls: string }> = {
    study:   { label: '자습',           cls: 'badge-amber' },
    retest:  { label: '재시험',         cls: 'badge-red' },
    general: { label: '수업', cls: 'badge-blue' },
}

export default function AttendancePage() {
    const { isSuper } = useAuth()
    if (!isSuper) return <Navigate to="/" replace />

    const [logs, setLogs] = useState<AttendanceLog[]>([])
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState(todayStr())
    const [filterPurpose, setFilterPurpose] = useState<'all' | 'study' | 'retest' | 'general'>('all')
    const [filterSchool, setFilterSchool] = useState<'all' | '유신고' | '창현고'>('all')
    const toast = useToast()

    const fetch = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/attendance', { params: { date } })
            setLogs(data)
        } catch {
            toast('불러오기 실패', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetch() }, [date])

    const deleteLog = async (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return
        try {
            await api.delete(`/attendance/${id}`)
            toast('삭제 완료', 'success')
            fetch()
        } catch {
            toast('삭제 실패', 'error')
        }
    }

    const filtered = logs.filter((l) => {
        if (filterPurpose !== 'all' && l.purpose !== filterPurpose) return false
        if (filterSchool !== 'all' && l.school !== filterSchool) return false
        return true
    })

    // 통계
    const stats = {
        total:   logs.length,
        study:   logs.filter((l) => l.purpose === 'study').length,
        retest:  logs.filter((l) => l.purpose === 'retest').length,
        general: logs.filter((l) => l.purpose === 'general').length,
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">등원 기록</h2>
                    <p className="text-sm text-gray-500 mt-0.5">슈퍼 관리자 전용</p>
                </div>
                <div className="flex items-center gap-2">
                    <input type="date" className="input w-auto" value={date}
                           onChange={(e) => setDate(e.target.value)} />
                    <button className="btn-secondary btn-sm" onClick={fetch}>새로고침</button>
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { label: '전체 등원',        value: stats.total,   color: 'text-gray-800' },
                    { label: '자습',            value: stats.study,   color: 'text-amber-600' },
                    { label: '재시험',           value: stats.retest,  color: 'text-red-600' },
                    { label: '수업',              value: stats.general, color: 'text-blue-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="card p-4 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* 필터 */}
            <div className="flex gap-2 mb-4 flex-wrap">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {(['all', 'study', 'retest', 'general'] as const).map((p) => (
                        <button key={p} onClick={() => setFilterPurpose(p)}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                    filterPurpose === p
                                        ? 'bg-white shadow-sm font-medium text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {p === 'all' ? '전체' : PURPOSE_LABEL[p].label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {(['all', '유신고', '창현고'] as const).map((s) => (
                        <button key={s} onClick={() => setFilterSchool(s)}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                    filterSchool === s
                                        ? 'bg-white shadow-sm font-medium text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {s === 'all' ? '전체 학교' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* 목록 */}
            {loading ? (
                <div className="card p-8 text-center text-gray-400">불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div className="card p-10 text-center text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">해당 날짜의 등원 기록이 없습니다.</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    {/* 헤더 */}
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                        <span className="col-span-2">시각</span>
                        <span className="col-span-2">이름</span>
                        <span className="col-span-2">학교</span>
                        <span className="col-span-1">학년</span>
                        <span className="col-span-3">목적</span>
                        <span className="col-span-1">메모</span>
                        <span className="col-span-1"></span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {filtered.map((log) => {
                            const purpose = PURPOSE_LABEL[log.purpose] ?? { label: log.purpose, cls: 'badge-gray' }
                            return (
                                <div key={log.id}
                                     className="grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                                    <span className="col-span-2 text-xs text-gray-500">{formatDateTime(log.created_at)}</span>
                                    <span className="col-span-2 font-medium text-gray-900 text-sm">{log.student_name}</span>
                                    <span className="col-span-2 text-sm text-gray-600">{log.school}</span>
                                    <span className="col-span-1 text-sm text-gray-600">{log.grade}학년</span>
                                    <span className="col-span-3">
                    <span className={purpose.cls}>{purpose.label}</span>
                  </span>
                                    <span className="col-span-1 text-xs text-gray-400 truncate">{log.note || '-'}</span>
                                    <span className="col-span-1 text-right">
                    <button className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            onClick={() => deleteLog(log.id)}>
                      삭제
                    </button>
                  </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
