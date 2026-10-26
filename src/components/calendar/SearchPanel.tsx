import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { StudentDetail } from '../../types'
import { formatDate, formatTime, minutesToHM } from '../../lib/utils'
import { useToast } from '../common/Toast'
import { useSeason } from '../../hooks/useSeason'
import Modal from '../common/Modal'
import ScheduleForm from '../admin/ScheduleForm'

export interface SearchRequest {
    name: string
    key: number
}

interface Props {
    request: SearchRequest | null     // 캘린더에서 "학생 보기"로 들어온 검색
    refreshKey: number                // 상태가 바뀌면 다시 검색
    focusId: number | null
    onFocus: (studentId: number | null) => void
    onStartStudy: (studentId: number, name: string, scheduleId: number) => void
    onEndStudy: (logId: number, name: string) => void
    onCompleteRetest: (scheduleId: number, name: string) => void
    onChanged: () => void             // 일정 등록·등원·하원 후 대시보드 새로 고침
}

export default function SearchPanel({
                                        request, refreshKey, focusId, onFocus, onStartStudy, onEndStudy, onCompleteRetest, onChanged,
                                    }: Props) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<StudentDetail[]>([])
    const [searched, setSearched] = useState('')
    const [loading, setLoading] = useState(false)
    const [schedModal, setSchedModal] = useState<StudentDetail | null>(null)
    const [attendModal, setAttendModal] = useState<StudentDetail | null>(null)
    const [attendPurpose, setAttendPurpose] = useState<'study' | 'retest' | 'general'>('general')
    const toast = useToast()
    const { season } = useSeason()

    const search = async (name: string, keepFocus = false) => {
        if (!name.trim()) return
        setLoading(true)
        try {
            const { data } = await api.get<StudentDetail[]>('/students/search', {
                params: { name: name.trim(), season_id: season?.id },
            })
            setResults(data)
            setSearched(name.trim())
            if (!keepFocus) onFocus(data.length === 1 ? data[0].id : null)
        } catch {
            toast('검색 중 오류가 발생했습니다.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!request) return
        setQuery(request.name)
        search(request.name)
    }, [request?.key])

    useEffect(() => {
        if (searched) search(searched, true)
    }, [refreshKey])

    const checkout = async (st: StudentDetail) => {
        try {
            await api.post('/attendance/checkout', { student_id: st.id })
            toast(`${st.name} 하원 기록 완료`, 'success')
            onChanged()
        } catch {
            toast('오류가 발생했습니다.', 'error')
        }
    }

    const recordAttendance = async (st: StudentDetail) => {
        try {
            await api.post('/attendance', { student_id: st.id, purpose: attendPurpose })
            toast(`${st.name} 등원 기록 완료`, 'success')
            setAttendModal(null)
            onChanged()
        } catch {
            toast('오류가 발생했습니다.', 'error')
        }
    }

    const clear = () => {
        setQuery('')
        setResults([])
        setSearched('')
        onFocus(null)
    }

    return (
        <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">학생 검색</h3>
            <div className="flex gap-1.5 mb-3">
                <input
                    className="input"
                    placeholder="학생 이름"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search(query)}
                />
                <button className="btn-primary btn-sm shrink-0" onClick={() => search(query)} disabled={loading}>
                    {loading ? '...' : '검색'}
                </button>
            </div>

            {!searched && (
                <p className="text-xs text-gray-400">검색하면 캘린더에서 그 학생의 일정이 강조됩니다.</p>
            )}
            {searched && results.length === 0 && !loading && (
                <p className="text-sm text-gray-400 py-2">해당 학생을 찾을 수 없습니다.</p>
            )}

            <div className="space-y-2">
                {results.map((st) => {
                    const focused = focusId === st.id
                    const log = st.activeStudyLog
                    return (
                        <div key={st.id}
                             className={`rounded-lg border p-3 transition-colors ${
                                 focused ? 'border-primary bg-primary-light/40' : 'border-gray-200'
                             }`}>
                            <button className="w-full text-left" onClick={() => onFocus(focused ? null : st.id)}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-gray-900">{st.name}</span>
                                    {(st.warn_count ?? 0) > 0 && (
                                        <span className={st.warn_count >= 2 ? 'badge-red' : 'badge-amber'}>경고 {st.warn_count}</span>
                                    )}
                                    {st.hasClassToday && <span className="badge-blue">오늘 수업</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {st.school} · {st.grade}학년 · {st.class_names || '반 미배정'}
                                </p>
                            </button>

                            <div className="flex gap-1 flex-wrap mt-2">
                                <button className="btn-secondary btn-sm px-2" onClick={() => setSchedModal(st)}>일정 등록</button>
                                <button className="btn-secondary btn-sm px-2" onClick={() => setAttendModal(st)}>등원 기록</button>
                                {!log && (
                                    <button className="btn-secondary btn-sm px-2" onClick={() => checkout(st)}>하원</button>
                                )}
                            </div>

                            <div className="space-y-1.5 mt-2">
                                {log && (
                                    <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <span className="text-xs font-medium text-green-800 min-w-0">
                            🟢 자습 중 · {formatTime(log.start_time)}~
                          </span>
                                        <button className="btn-danger btn-sm shrink-0 whitespace-nowrap" onClick={() => onEndStudy(log.id, st.name)}>
                                            자습 종료
                                        </button>
                                    </div>
                                )}

                                {/* 강제자습: 미완료 일정만 내려옴 */}
                                {st.studySchedules.map((s) => {
                                    const remain = Math.max((s.required_minutes || 0) - (s.done_minutes || 0), 0)
                                    return (
                                        <div key={s.id}
                                             className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-amber-800">자습 {minutesToHM(remain)} 남음</p>
                                                {s.deadline_date && (
                                                    <p className="text-[11px] text-amber-600">기한 {formatDate(s.deadline_date)}</p>
                                                )}
                                            </div>
                                            {!log && (
                                                <button className="btn-success btn-sm shrink-0"
                                                        onClick={() => onStartStudy(st.id, st.name, s.id)}>
                                                    자습 시작
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}

                                {st.retestSchedules.map((s) => (
                                    <div key={s.id}
                                         className="flex items-center justify-between gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-red-800">재시험 미완료</p>
                                            {s.deadline_date && (
                                                <p className="text-[11px] text-red-500">기한 {formatDate(s.deadline_date)}</p>
                                            )}
                                        </div>
                                        <button className="btn-primary btn-sm shrink-0"
                                                onClick={() => onCompleteRetest(s.id, st.name)}>
                                            완료
                                        </button>
                                    </div>
                                ))}

                                {!log && st.studySchedules.length === 0 && st.retestSchedules.length === 0 && (
                                    <p className="text-xs text-gray-400">남은 자습·재시험이 없습니다.</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {searched && (
                <button className="text-xs text-gray-400 hover:text-gray-600 mt-3" onClick={clear}>
                    검색 지우기
                </button>
            )}

            {/* 일정 등록 모달 */}
            {schedModal && (
                <Modal title={`${schedModal.name} 일정 등록`} onClose={() => setSchedModal(null)}>
                    <ScheduleForm
                        studentId={schedModal.id}
                        onSuccess={() => { setSchedModal(null); onChanged() }}
                    />
                </Modal>
            )}

            {/* 등원 기록 모달 */}
            {attendModal && (
                <Modal title={`${attendModal.name} 등원 기록`} onClose={() => setAttendModal(null)} size="sm">
                    <div className="space-y-4">
                        <div>
                            <label className="label">방문 목적</label>
                            <select className="input" value={attendPurpose}
                                    onChange={(e) => setAttendPurpose(e.target.value as any)}>
                                <option value="general">수업</option>
                                <option value="retest">재시험</option>
                                <option value="study">자습</option>
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button className="btn-secondary" onClick={() => setAttendModal(null)}>취소</button>
                            <button className="btn-primary" onClick={() => recordAttendance(attendModal)}>기록</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
