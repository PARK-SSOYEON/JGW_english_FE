import { useState } from 'react'
import Modal from '../common/Modal'
import { StudyLog } from '../../types'
import { minutesToHM } from '../../lib/utils'

interface Props {
    log: StudyLog
    onClose: () => void
    onSave: (log: StudyLog, body: { start_time: string; end_time?: string }) => void
}

// 'YYYY-MM-DD HH:mm:ss' → 'HH:mm'
const hm = (dt: string | null) => (dt ? dt.slice(11, 16) : '')

export default function StudyLogTimeModal({ log, onClose, onSave }: Props) {
    const date = log.start_time.slice(0, 10)
    const finished = !!log.end_time
    const [start, setStart] = useState(hm(log.start_time))
    const [end, setEnd] = useState(hm(log.end_time))

    const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number)
        return h * 60 + m
    }
    const minutes = finished && start && end ? toMin(end) - toMin(start) : null
    const invalid = !start || (finished && (!end || (minutes ?? 0) <= 0))

    const required = log.required_minutes ?? null
    const otherDone = (log.done_minutes || 0) - (log.actual_minutes || 0)   // 이 기록을 뺀 나머지 자습 시간
    const remainAfter = required != null && minutes != null && minutes > 0
        ? Math.max(required - otherDone - minutes, 0)
        : null

    const save = () => {
        if (invalid) return
        onSave(log, finished
            ? { start_time: `${date} ${start}:00`, end_time: `${date} ${end}:00` }
            : { start_time: `${date} ${start}:00` })
    }

    return (
        <Modal title={`${log.student_name} 자습 시간 수정`} onClose={onClose} size="sm">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label">시작</label>
                        <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)}/>
                    </div>
                    <div>
                        <label className="label">종료</label>
                        {finished ? (
                            <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)}/>
                        ) : (
                            <p className="text-sm text-gray-400 py-2">자습 중</p>
                        )}
                    </div>
                </div>

                {finished && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-0.5">
                        {minutes != null && minutes > 0
                            ? <p>자습 시간 {minutesToHM(log.actual_minutes || 0)} → <b>{minutesToHM(minutes)}</b></p>
                            : <p className="text-danger">종료 시간은 시작 시간보다 늦어야 합니다.</p>}
                        {remainAfter != null && (
                            <p>수정 후 {remainAfter === 0 ? '강제자습 완료' : `${minutesToHM(remainAfter)} 남음`}</p>
                        )}
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button className="btn-secondary" onClick={onClose}>취소</button>
                    <button className="btn-primary" onClick={save} disabled={invalid}>저장</button>
                </div>
            </div>
        </Modal>
    )
}
