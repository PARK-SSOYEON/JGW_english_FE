import { useEffect, useState } from 'react'
import { StudyLog } from '../../types'
import { formatTime, minutesToHM } from '../../lib/utils'

interface Props {
    logs: StudyLog[]      // end_time 이 없는 오늘 자습 기록
    loading: boolean
    focusId: number | null
    onEnd: (log: StudyLog) => void
}

function elapsedMinutes(start: string, now: number) {
    const t = new Date(start.replace(' ', 'T')).getTime()
    return Math.max(Math.floor((now - t) / 60000), 0)
}

export default function LiveStudyPanel({ logs, loading, focusId, onEnd }: Props) {
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
                                <div className="flex justify-end mt-2">
                                    <button className="btn-danger btn-sm" onClick={() => onEnd(log)}>자습 종료</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
