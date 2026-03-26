import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import { Schedule } from '../types'
import { useToast } from '../components/common/Toast'
import Modal from '../components/common/Modal'
import ScheduleForm from '../components/admin/ScheduleForm'
import { useAuth } from '../hooks/useAuth'

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
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
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

  useEffect(() => { fetchSchedules() }, [weekStart])

  const prevWeek = () => setWeekStart(format(addDays(parseISO(weekStart), -7), 'yyyy-MM-dd'))
  const nextWeek = () => setWeekStart(format(addDays(parseISO(weekStart),  7), 'yyyy-MM-dd'))
  const goToday  = () => setWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))

  const deleteSchedule = async (id: number) => {
    if (!confirm('일정을 삭제하시겠습니까?')) return
    try {
      await api.delete(`/schedules/${id}`)
      toast('삭제 완료', 'success')
      setEditSchedule(null)
      fetchSchedules()
    } catch {
      toast('삭제 실패', 'error')
    }
  }

  const getForDate = (date: string) =>
      schedules
          .filter((s) => s.scheduled_date.slice(0, 10) === date)
          .sort((a, b) => getScheduleTime(a).localeCompare(getScheduleTime(b)))

  const schoolLabel = (school?: string, grade?: number) => {
    if (!school || !grade) return ''
    const s = school === '유신고' ? '유신' : '창현'
    return `${s}${grade}`
  }

  return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">주간 캘린더</h2>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" onClick={prevWeek}>‹ 이전</button>
            <button className="btn-secondary btn-sm" onClick={goToday}>오늘</button>
            <button className="btn-secondary btn-sm" onClick={nextWeek}>다음 ›</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDates.map(({ date, dow, label }) => {
            const isToday = date === todayStr
            const items = getForDate(date)
            const studyItems  = items.filter((s) => s.type === 'study')
            const retestItems = items.filter((s) => s.type === 'retest')

            return (
                <div key={date}
                     className={`card min-h-[160px] p-3 ${isToday ? 'ring-2 ring-primary' : ''}`}>
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
                              {retestItems.map((s) => (
                                  <button key={s.id}
                                          onClick={() => setEditSchedule(s)}
                                          className="w-full text-left bg-red-50 hover:bg-red-100 rounded px-1.5 py-1 mb-0.5 transition-colors">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[11px] text-red-700 font-medium truncate">
                                        {s.student_name}
                                        {s.status === 'completed' && ' ✓'}
                                      </span>
                                         <span className="text-[10px] text-red-400 shrink-0 mr-auto">
                                        {schoolLabel(s.school, s.grade)}
                                      </span>
                                        <span className="text-[10px] text-red-300 shrink-0">
                                        {getScheduleTime(s)}
                                      </span>
                                    </div>
                                  </button>
                              ))}
                            </div>
                        )}
                        {studyItems.length > 0 && (
                            <div>
                              <p className="text-[10px] font-medium text-amber-500 mb-0.5">자습 {studyItems.length}명</p>
                              {studyItems.map((s) => (
                                  <button key={s.id}
                                          onClick={() => setEditSchedule(s)}
                                          className="w-full text-left bg-amber-50 hover:bg-amber-100 rounded px-1.5 py-1 mb-0.5 transition-colors">
                                    <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] text-amber-800 font-medium truncate">
                                      {s.student_name}
                                      {s.status === 'completed' && ' ✓'}
                                    </span>
                                       <span className="text-[10px] text-amber-500 shrink-0 mr-auto">
                                      {schoolLabel(s.school, s.grade)}
                                    </span>
                                      <span className="text-[10px] text-amber-400 shrink-0">
                                      {getScheduleTime(s)}
                                    </span>
                                    </div>
                                  </button>
                              ))}
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

        {/* 수정 모달 */}
        {editSchedule && (
            <Modal
                title={`${editSchedule.student_name} 일정 수정`}
                onClose={() => setEditSchedule(null)}
            >
              <ScheduleForm
                  studentId={editSchedule.student_id}
                  schedule={editSchedule}
                  onSuccess={() => { setEditSchedule(null); fetchSchedules() }}
              />
              {isSuper && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button className="btn-danger w-full btn-sm"
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
