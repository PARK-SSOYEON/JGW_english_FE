import { useEffect, useState } from 'react'
import { StudyLog } from '../../types'
import { formatTime, minutesToHM } from '../../lib/utils'

interface Props {
    logs: StudyLog[]          // end_time 이 없는 오늘 자습 기록
    finishedLogs: StudyLog[]  // 오늘 끝난 자습 기록 (최근 종료 순)
    loading: boolean
    focusId: number | null
    onEnd: (log: StudyLog) => void
    onEditTime: (log: StudyLog) => void
}

function elapsedMinutes(start: string, now: number) {
    const t = new Date(start.replace(' ', 'T')).getTime()
    return Math.max(Math.floor((now - t) / 60000), 0)
}

export default function LiveStudyPanel({ logs, finishedLogs, loading, focusId, onEnd, onEditTime }: Props) {
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30 * 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700">지금 자습 중</h3>
                <span className="badge-green">{logs.length}명</span>
            </div>

            {loading && logs.length === 0 ? (
                <div className="text-xs text-gray-300 animate-pulse">로딩...</div>
            ) : logs.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">지금 자습 중인 학생이 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => {
                        const elapsed = elapsedMinutes(log.start_time, now)
                        const required = log.required_minutes ?? null
                        const total = (log.done_minutes || 0) + elapsed
                        const pct = required ? Math.min(Math.round((total / required) * 100), 100) : null
                        return (
                            <div key={log.id}
                                 className={`rounded-lg border p-3 ${
                                     focusId === log.student_id ? 'border-primary bg-primary-light/40' : 'border-green-200 bg-green-50/50'
                                 }`}>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"/>
                                    <span className="font-semibold text-gray-900 text-sm truncate">{log.student_name}</span>
                                    <span className="ml-auto text-sm font-semibold text-green-700 tabular-nums">
                          {minutesToHM(elapsed)}
                        </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    {log.student_school} {log.student_grade}학년 · {formatTime(log.start_time)} 시작
                                </p>
                                {pct !== null && (
                                    <div className="mt-2">
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-success" style={{ width: `${pct}%` }}/>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1 tabular-nums">
                                            {minutesToHM(total)} / {minutesToHM(required!)}
                                            {total < required! && ` · ${minutesToHM(required! - total)} 남음`}
                                        </p>
                                    </div>
                                )}
                                <div className="flex justify-end gap-1.5 mt-2">
                                    <button className="btn-secondary btn-sm" onClick={() => onEditTime(log)}>시간 수정</button>
                                    <button className="btn-danger btn-sm" onClick={() => onEnd(log)}>자습 종료</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* 오늘 자습 마친 학생 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">오늘 자습 완료</h3>
                    <span className="badge-gray">{finishedLogs.length}건</span>
                </div>
                {finishedLogs.length === 0 ? (
                    <p className="text-xs text-gray-400 py-1">아직 자습을 마친 학생이 없습니다.</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {finishedLogs.map((log) => {
                            const required = log.required_minutes ?? null
                            const remain = log.remain_minutes ?? (required != null ? Math.max(required - (log.done_minutes || 0), 0) : null)
                            return (
                                <div key={log.id}
                                     className={`py-2 ${focusId === log.student_id ? 'bg-primary-light/40 -mx-2 px-2 rounded' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm truncate">{log.student_name}</span>
                                        <span className="ml-auto text-xs font-medium text-gray-600 tabular-nums">
                            {minutesToHM(log.actual_minutes || 0)}
                          </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-gray-400 tabular-nums">
                            {formatTime(log.start_time)}~{formatTime(log.end_time!)}
                          </span>
                                        {remain === 0 && <span className="badge-green text-[10px]">강제자습 완료</span>}
                                        {remain != null && remain > 0 && (
                                            <span className="badge-amber text-[10px]">{minutesToHM(remain)} 남음</span>
                                        )}
                                        <button className="ml-auto text-[11px] text-gray-400 hover:text-primary"
                                                onClick={() => onEditTime(log)}>
                                            시간 수정
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
