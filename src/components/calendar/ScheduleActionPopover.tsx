import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Schedule, StudyLog } from '../../types'
import { minutesToHM } from '../../lib/utils'

export interface PopoverAnchor {
    schedule: Schedule
    rect: DOMRect
}

interface Props {
    anchor: PopoverAnchor
    activeLog: StudyLog | null      // 이 일정으로 진행 중인 자습
    isSuper: boolean
    onClose: () => void
    onStartStudy: (s: Schedule) => void
    onEndStudy: (log: StudyLog, name?: string) => void
    onSetStatus: (s: Schedule, status: Schedule['status'], msg: string) => void
    onEdit: (s: Schedule) => void
    onFindStudent: (s: Schedule) => void
    onDelete: (s: Schedule) => void
}

const WIDTH = 248

export default function ScheduleActionPopover({
                                                  anchor, activeLog, isSuper, onClose,
                                                  onStartStudy, onEndStudy, onSetStatus, onEdit, onFindStudent, onDelete,
                                              }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const { schedule: s, rect } = anchor
    const isMobile = window.innerWidth < 640

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (ref.current?.contains(target)) return
            if (target.closest('[data-schedule-chip]')) return   // 칩 클릭은 페이지에서 처리
            onClose()
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('mousedown', onDown)
        window.addEventListener('keydown', onKey)
        window.addEventListener('resize', onClose)
        if (!isMobile) window.addEventListener('scroll', onClose, true)   // 칩 위치가 바뀌면 닫기
        return () => {
            document.removeEventListener('mousedown', onDown)
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', onClose)
            window.removeEventListener('scroll', onClose, true)
        }
    }, [onClose, isMobile])

    const left = Math.max(8, Math.min(rect.left, window.innerWidth - WIDTH - 8))
    const below = rect.bottom + 6
    const top = below + 260 > window.innerHeight ? Math.max(8, rect.top - 6 - 260) : below

    const style = isMobile ? undefined : { left, top, width: WIDTH }
    const positionCls = isMobile
        ? 'fixed inset-x-0 bottom-0 rounded-b-none rounded-t-2xl p-5 pb-8'
        : 'fixed p-4'

    const done = s.status === 'completed'
    const required = s.required_minutes || 0
    const doneMin = s.done_minutes || 0

    // 큰 버튼: 지금 상태에서 할 수 있는 일
    let primary: JSX.Element | null = null
    let extra: JSX.Element | null = null

    if (s.type === 'retest') {
        if (!done) {
            primary = (
                <button className="btn-primary w-full"
                        onClick={() => onSetStatus(s, 'completed', `${s.student_name} 재시험 완료 처리!`)}>
                    재시험 완료
                </button>
            )
        } else if (isSuper) {
            primary = (
                <button className="btn-secondary w-full"
                        onClick={() => onSetStatus(s, 'pending', `${s.student_name} 재시험 완료 취소`)}>
                    완료 취소
                </button>
            )
        }
    } else if (activeLog) {
        primary = (
            <button className="btn-danger w-full" onClick={() => onEndStudy(activeLog, s.student_name)}>
                자습 종료
            </button>
        )
    } else if (done) {
        if (isSuper) {
            primary = (
                <button className="btn-secondary w-full"
                        onClick={() => onSetStatus(s, 'in_progress', `${s.student_name} 자습 완료 취소`)}>
                    완료 취소
                </button>
            )
        }
    } else {
        if (s.status !== 'expired') {
            primary = (
                <button className="btn-success w-full" onClick={() => onStartStudy(s)}>
                    자습 시작
                </button>
            )
        }
        if (isSuper) {
            extra = (
                <button className="btn-secondary w-full"
                        onClick={() => onSetStatus(s, 'completed', `${s.student_name} 자습 완료 처리`)}>
                    시간 채운 걸로 완료 처리
                </button>
            )
        }
    }

    const statusBadge =
        activeLog ? <span className="badge-green">자습 중</span>
            : done ? <span className="badge-green">완료</span>
                : s.status === 'expired' ? <span className="badge-red">만료</span>
                    : s.status === 'in_progress' ? <span className="badge-amber">진행중</span>
                        : <span className="badge-gray">미시작</span>

    return (
        <>
            {isMobile && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>}
            <div ref={ref} role="dialog" aria-label={`${s.student_name} 일정 처리`}
                 className={`card z-50 shadow-lg space-y-3 ${positionCls}`} style={style}>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{s.student_name}</span>
                        <span className={s.type === 'retest' ? 'badge-red' : 'badge-amber'}>
                {s.type === 'retest' ? '재시험' : '자습'}
              </span>
                        {statusBadge}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {format(parseISO(s.scheduled_date.slice(0, 10)), 'M/d (eee)', { locale: ko })}
                        {s.scheduled_time && ` ${s.scheduled_time.slice(0, 5)}`}
                        {s.type === 'study' && required > 0 && ` · ${minutesToHM(required)} 중 ${minutesToHM(doneMin)} 완료`}
                    </p>
                </div>

                {(primary || extra) && (
                    <div className="space-y-1.5">
                        {primary}
                        {extra}
                    </div>
                )}

                <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                    <button className="btn-secondary btn-sm flex-1 px-2 whitespace-nowrap" onClick={() => onEdit(s)}>일정 수정</button>
                    <button className="btn-secondary btn-sm flex-1 px-2 whitespace-nowrap" onClick={() => onFindStudent(s)}>학생 보기</button>
                    {isSuper && (
                        <button className="btn-sm btn px-2 whitespace-nowrap bg-white border border-red-200 text-danger hover:bg-danger-light"
                                onClick={() => onDelete(s)}>
                            삭제
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}
