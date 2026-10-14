import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import api from '../lib/api'
import { Schedule, StudyLog } from '../types'
import { useToast } from '../components/common/Toast'
import Modal from '../components/common/Modal'
import ScheduleForm from '../components/admin/ScheduleForm'
import { useAuth } from '../hooks/useAuth'
import { minutesToHM, todayStr as kstToday } from '../lib/utils'
import ScheduleActionPopover, { PopoverAnchor } from '../components/calendar/ScheduleActionPopover'
import SearchPanel, { SearchRequest } from '../components/calendar/SearchPanel'
import LiveStudyPanel from '../components/calendar/LiveStudyPanel'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

function getScheduleTime(s: Schedule): string {
  return s.scheduled_time?.slice(0, 5) || '00:00'
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() =>
      format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [activeLogs, setActiveLogs] = useState<StudyLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
  const [popover, setPopover] = useState<PopoverAnchor | null>(null)
  const [focusId, setFocusId] = useState<number | null>(null)
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const toast = useToast()
  const { isSuper } = useAuth()

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(parseISO(weekStart), i)
    return { date: format(d, 'yyyy-MM-dd'), dow: d.getDay(), label: format(d, 'M/d') }
  })

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/schedules/week', { params: { start: weekStart } })
      setSchedules(data)
    } catch {
      toast('불러오기 실패', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveLogs = async () => {
    setLogsLoading(true)
    try {
      const { data } = await api.get<StudyLog[]>('/study-logs', { params: { date: kstToday() } })
      setActiveLogs(data.filter((l) => !l.end_time))
    } catch {
      toast('자습 현황 불러오기 실패', 'error')
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => { fetchSchedules() }, [weekStart])

  useEffect(() => {
    fetchActiveLogs()
    const id = setInterval(fetchActiveLogs, 60 * 1000)   // 다른 화면에서 시작한 자습도 반영
    return () => clearInterval(id)
  }, [])

  // 상태가 바뀌면 캘린더·자습 중 목록·검색 결과를 모두 새로 고침
  const refreshAll = () => {
    fetchSchedules()
    fetchActiveLogs()
    setRefreshKey((k) => k + 1)
  }

  const prevWeek = () => setWeekStart(format(addDays(parseISO(weekStart), -7), 'yyyy-MM-dd'))
  const nextWeek = () => setWeekStart(format(addDays(parseISO(weekStart),  7), 'yyyy-MM-dd'))
  const goToday  = () => setWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))

  const closePopover = useCallback(() => setPopover(null), [])

  // ── 상태 변경 ──────────────────────────────
  const startStudy = async (studentId: number, name: string | undefined, scheduleId: number) => {
    setPopover(null)
    try {
      await api.post('/study-logs/start', { student_id: studentId, schedule_id: scheduleId })
      toast(`${name ?? ''} 자습 시작!`, 'success')
      refreshAll()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    }
  }

  const endStudy = async (logId: number, name?: string) => {
    setPopover(null)
    try {
      const { data } = await api.post(`/study-logs/${logId}/end`)
      if (data.schedule_completed) {
        toast(`${name ?? ''} 자습 완료! (${minutesToHM(data.actual_minutes)}) ✅`, 'success')
      } else {
        toast(`${name ?? ''} 자습 종료 (${minutesToHM(data.actual_minutes)})`, 'info')
      }
      refreshAll()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    }
  }

  const setStatus = async (id: number, status: Schedule['status'], msg: string) => {
    setPopover(null)
    try {
      await api.patch(`/schedules/${id}`, { status })
      toast(msg, 'success')
      refreshAll()
    } catch {
      toast('오류가 발생했습니다.', 'error')
    }
  }

  const deleteSchedule = async (id: number) => {
    if (!confirm('일정을 삭제하시겠습니까?')) return
    try {
      await api.delete(`/schedules/${id}`)
      toast('삭제 완료', 'success')
      setEditSchedule(null)
      setPopover(null)
      refreshAll()
    } catch {
      toast('삭제 실패', 'error')
    }
  }

  // ── 캘린더 ────────────────────────────────
  const getForDate = (date: string) =>
      schedules
          .filter((s) => s.scheduled_date.slice(0, 10) === date)
          .sort((a, b) => getScheduleTime(a).localeCompare(getScheduleTime(b)))

  const schoolLabel = (school?: string, grade?: number) => {
    if (!school || !grade) return ''
    const s = school.slice(0, 2)
    return `${s}${grade}`
  }

  const logForSchedule = (s: Schedule) =>
      activeLogs.find((l) => l.schedule_id === s.id) || null

  const openPopover = (s: Schedule, el: HTMLElement) => {
    if (popover?.schedule.id === s.id) { setPopover(null); return }
    setPopover({ schedule: s, rect: el.getBoundingClientRect() })
  }

  const renderChip = (s: Schedule) => {
    const isRetest = s.type === 'retest'
    const live = !isRetest && !!logForSchedule(s)
    const done = s.status === 'completed'
    const focusCls = focusId == null ? '' : focusId === s.student_id ? 'ring-2 ring-primary' : 'opacity-30'
    const color = isRetest
        ? { bg: 'bg-red-50 hover:bg-red-100', name: 'text-red-700', sub: 'text-red-400', time: 'text-red-300' }
        : { bg: 'bg-amber-50 hover:bg-amber-100', name: 'text-amber-800', sub: 'text-amber-500', time: 'text-amber-400' }
    return (
        <button key={s.id}
                data-schedule-chip
                onClick={(e) => openPopover(s, e.currentTarget)}
                className={`w-full text-left ${color.bg} rounded px-1.5 py-1 mb-0.5 transition-colors ${
                    live ? 'ring-1 ring-green-400' : ''
                } ${done && focusId == null ? 'opacity-50' : ''} ${focusCls} ${
                    popover?.schedule.id === s.id ? 'ring-2 ring-primary' : ''
                }`}>
          {/* 넓으면 한 줄, 좁으면 학교·시간이 다음 줄로 내려감 */}
          <div className="flex flex-wrap items-center gap-x-1">
            {live && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0"/>}
            <span className={`text-[11px] ${color.name} font-medium whitespace-nowrap ${done ? 'line-through' : ''}`}>
              {s.student_name}
            </span>
            {done && <span className={`text-[11px] ${color.name}`}>✓</span>}
            <span className={`text-[10px] ${color.sub} whitespace-nowrap`}>{schoolLabel(s.school, s.grade)}</span>
            <span className={`text-[10px] ${color.time} whitespace-nowrap ml-auto`}>{getScheduleTime(s)}</span>
          </div>
        </button>
    )
  }

  return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">주간 캘린더</h2>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" onClick={prevWeek}>‹ 이전</button>
            <button className="btn-secondary btn-sm" onClick={goToday}>오늘</button>
            <button className="btn-secondary btn-sm" onClick={nextWeek}>다음 ›</button>
          </div>
        </div>

        {/* 대시보드: 넓은 화면은 검색 | 캘린더 | 자습 중, 중간 화면은 캘린더 | (검색, 자습 중) */}
        <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-2
                        xl:grid-cols-[minmax(0,1fr)_280px]
                        2xl:grid-cols-[260px_minmax(0,1fr)_270px]">

          <div className="min-w-0 lg:col-span-2 xl:col-span-1
                          xl:col-start-1 xl:row-start-1 xl:row-span-2
                          2xl:col-start-2 2xl:row-span-1">
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDates.map(({ date, dow, label }) => {
                const isToday = date === todayStr
                const items = getForDate(date)
                const studyItems  = items.filter((s) => s.type === 'study')
                const retestItems = items.filter((s) => s.type === 'retest')

                return (
                    <div key={date}
                         className={`card min-w-0 sm:min-h-[160px] p-2.5 ${isToday ? 'ring-2 ring-primary' : ''}`}>
                      <div className="mb-2">
                        <span className={`text-xs font-semibold ${
                            dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'
                        }`}>
                          {DOW[dow]}
                        </span>
                        <span className={`ml-1 text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                          {label}
                        </span>
                        {isToday && <span className="ml-1 badge-blue text-[10px]">오늘</span>}
                      </div>

                      {loading ? (
                          <div className="text-xs text-gray-300 animate-pulse">로딩...</div>
                      ) : (
                          <div className="space-y-1">
                            {retestItems.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-medium text-red-400 mb-0.5">재시험 {retestItems.length}명</p>
                                  {retestItems.map(renderChip)}
                                </div>
                            )}
                            {studyItems.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-medium text-amber-500 mb-0.5">자습 {studyItems.length}명</p>
                                  {studyItems.map(renderChip)}
                                </div>
                            )}
                            {items.length === 0 && (
                                <div className="text-[11px] text-gray-300">일정 없음</div>
                            )}
                          </div>
                      )}
                    </div>
                )
              })}
            </div>

            {/* 주간 요약 */}
            <div className="mt-4 card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">이번 주 요약</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: '전체 일정',  value: schedules.length,                                        color: 'text-gray-700' },
                  { label: '자습 예정',  value: schedules.filter(s => s.type === 'study').length,         color: 'text-amber-600' },
                  { label: '재시험 예정', value: schedules.filter(s => s.type === 'retest').length,       color: 'text-red-600' },
                  { label: '완료',       value: schedules.filter(s => s.status === 'completed').length,   color: 'text-green-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 xl:col-start-2 xl:row-start-1 2xl:col-start-1">
            <SearchPanel
                request={searchRequest}
                refreshKey={refreshKey}
                focusId={focusId}
                onFocus={setFocusId}
                onStartStudy={(studentId, name, scheduleId) => startStudy(studentId, name, scheduleId)}
                onEndStudy={(logId, name) => endStudy(logId, name)}
                onCompleteRetest={(id, name) => setStatus(id, 'completed', `${name} 재시험 완료 처리!`)}
            />
          </div>

          <div className="min-w-0 xl:col-start-2 xl:row-start-2 2xl:col-start-3 2xl:row-start-1">
            <LiveStudyPanel
                logs={activeLogs}
                loading={logsLoading}
                focusId={focusId}
                onEnd={(log) => endStudy(log.id, log.student_name)}
            />
          </div>
        </div>

        {/* 학생 클릭: 상태 변경 팝오버 */}
        {popover && (
            <ScheduleActionPopover
                anchor={popover}
                activeLog={logForSchedule(popover.schedule)}
                isSuper={isSuper}
                onClose={closePopover}
                onStartStudy={(s) => startStudy(s.student_id, s.student_name, s.id)}
                onEndStudy={(log, name) => endStudy(log.id, name)}
                onSetStatus={(s, status, msg) => setStatus(s.id, status, msg)}
                onEdit={(s) => { setPopover(null); setEditSchedule(s) }}
                onFindStudent={(s) => {
                  setPopover(null)
                  setSearchRequest({ name: s.student_name ?? '', key: Date.now() })
                }}
                onDelete={(s) => deleteSchedule(s.id)}
            />
        )}

        {/* 수정 모달: 일정 정보만 수정 */}
        {editSchedule && (
            <Modal
                title={`${editSchedule.student_name} 일정 수정`}
                onClose={() => setEditSchedule(null)}
            >
              <ScheduleForm
                  studentId={editSchedule.student_id}
                  schedule={editSchedule}
                  onSuccess={() => { setEditSchedule(null); refreshAll() }}
              />

              {isSuper && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button className="btn-danger w-full "
                            onClick={() => deleteSchedule(editSchedule.id)}>
                      일정 삭제
                    </button>
                  </div>
              )}
            </Modal>
        )}
      </div>
  )
}
