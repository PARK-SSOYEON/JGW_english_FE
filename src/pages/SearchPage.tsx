import { useState } from 'react'
import api from '../lib/api'
import { StudentDetail, StudyLog } from '../types'
import { formatDate, formatTime, minutesToHM } from '../lib/utils'
import { useToast } from '../components/common/Toast'
import Modal from '../components/common/Modal'
import ScheduleForm from '../components/admin/ScheduleForm'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const toast = useToast()

  const [schedModal, setSchedModal] = useState<{ student: StudentDetail } | null>(null)
  const [attendModal, setAttendModal] = useState<{ student: StudentDetail } | null>(null)
  const [attendPurpose, setAttendPurpose] = useState<'study' | 'retest' | 'general'>('general')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const { data } = await api.get('/students/search', { params: { name: query.trim() } })
      setResults(data)
      setSearched(true)
    } catch {
      toast('검색 중 오류가 발생했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const startStudy = async (student: StudentDetail, scheduleId?: number) => {
    try {
      await api.post('/study-logs/start', { student_id: student.id, schedule_id: scheduleId })
      toast(`${student.name} 자습 시작!`, 'success')
      search()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    }
  }

  const endStudy = async (student: StudentDetail, log: StudyLog) => {
    try {
      const { data } = await api.post(`/study-logs/${log.id}/end`)
      if (data.schedule_completed) {
        toast(`${student.name} 자습 완료! (${minutesToHM(data.actual_minutes)}) ✅`, 'success')
      } else {
        toast(`${student.name} 자습 종료 (${minutesToHM(data.actual_minutes)})`, 'info')
      }
      search()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    }
  }

  const checkout = async (student: StudentDetail) => {
    try {
      await api.post('/attendance/checkout', { student_id: student.id })
      toast(`${student.name} 하원 기록 완료`, 'success')
      search()
    } catch {
      toast('오류가 발생했습니다.', 'error')
    }
  }

  const completeRetest = async (student: StudentDetail, schedId: number) => {
    try {
      await api.patch(`/schedules/${schedId}`, { is_completed: true })
      toast(`${student.name} 재시험 완료 처리!`, 'success')
      search()
    } catch {
      toast('오류가 발생했습니다.', 'error')
    }
  }

  const recordAttendance = async (student: StudentDetail) => {
    try {
      await api.post('/attendance', { student_id: student.id, purpose: attendPurpose })
      toast(`${student.name} 등원 기록 완료`, 'success')
      setAttendModal(null)
      search()
    } catch {
      toast('오류가 발생했습니다.', 'error')
    }
  }

  return (
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">학생 조회</h2>

        {/* 검색창 */}
        <div className="flex gap-2 mb-6">
          <input
              className="input flex-1"
              placeholder="학생 이름을 입력하세요"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <button className="btn-primary px-6" onClick={search} disabled={loading}>
            {loading ? '...' : '검색'}
          </button>
        </div>

        {/* 결과 */}
        {searched && results.length === 0 && (
            <div className="card p-8 text-center text-gray-400">해당 학생을 찾을 수 없습니다.</div>
        )}

        <div className="space-y-4">
          {results.map((student) => (
              <StudentCard
                  key={student.id}
                  student={student}
                  onStartStudy={startStudy}
                  onEndStudy={endStudy}
                  onCheckout={checkout}
                  onCompleteRetest={completeRetest}
                  onAddSchedule={() => setSchedModal({ student })}
                  onRecordAttend={() => setAttendModal({ student })}
              />
          ))}
        </div>

        {/* 일정 등록 모달 */}
        {schedModal && (
            <Modal title={`${schedModal.student.name} 일정 등록`} onClose={() => setSchedModal(null)}>
              <ScheduleForm
                  studentId={schedModal.student.id}
                  onSuccess={() => { setSchedModal(null); search() }}
              />
            </Modal>
        )}

        {/* 등원 기록 모달 */}
        {attendModal && (
            <Modal title={`${attendModal.student.name} 등원 기록`} onClose={() => setAttendModal(null)} size="sm">
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
                  <button className="btn-primary" onClick={() => recordAttendance(attendModal.student)}>기록</button>
                </div>
              </div>
            </Modal>
        )}
      </div>
  )
}

function StudentCard({
                       student, onStartStudy, onEndStudy, onCheckout, onCompleteRetest, onAddSchedule, onRecordAttend
                     }: {
  student: StudentDetail
  onStartStudy: (s: StudentDetail, schedId?: number) => void
  onEndStudy: (s: StudentDetail, log: StudyLog) => void
  onCheckout: (s: StudentDetail) => void
  onCompleteRetest: (s: StudentDetail, schedId: number) => void
  onAddSchedule: () => void
  onRecordAttend: () => void
}) {
  const { activeStudyLog, studySchedules, retestSchedules, hasClassToday } = student

  return (
      <div className="card p-5">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-lg">{student.name}</span>
              {!!student.is_warned && <span className="badge-red">⚠️ 경고</span>}
              {hasClassToday && <span className="badge-blue">📚 오늘 수업</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {student.school} · {student.grade}학년 · {student.class_names || '반 미배정'}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button className="btn-secondary btn-sm" onClick={onAddSchedule}>일정 등록</button>
            <button className="btn-secondary btn-sm" onClick={onRecordAttend}>등원 기록</button>
            {/* 자습 중이 아닐 때만 하원 버튼 표시 */}
            {!activeStudyLog && (
                <button className="btn-secondary btn-sm" onClick={() => onCheckout(student)}>하원</button>
            )}
          </div>
        </div>

        {/* 오늘 수업 안내 */}
        {hasClassToday ? (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
              📚 오늘은 본 수업일입니다. 별도 자습·재시험 일정이 없습니다.
            </div>
        ) : (
            <>
              {/* 진행 중인 자습 */}
              {activeStudyLog && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-green-800">🟢 자습 진행 중</span>
                        <p className="text-xs text-green-600 mt-0.5">시작: {formatTime(activeStudyLog.start_time)}</p>
                      </div>
                      <button className="btn-danger btn-sm"
                              onClick={() => onEndStudy(student, activeStudyLog)}>
                        자습 종료
                      </button>
                    </div>
                  </div>
              )}

              {/* 자습 일정 */}
              {studySchedules.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">자습 일정</p>
                    {studySchedules.map((s) => {
                      const remaining = (s.required_minutes || 0) - (s.done_minutes || 0)
                      const isNotStarted = (s.done_minutes || 0) === 0
                      return (
                          <div key={s.id} className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div>
                        <span className="text-sm font-medium text-amber-800">
                          {isNotStarted
                              ? `자습 필요: ${minutesToHM(s.required_minutes || 0)}`
                              : `남은 자습: ${minutesToHM(remaining > 0 ? remaining : 0)}`
                          }
                        </span>
                                {s.deadline_date && (
                                    <p className="text-xs text-amber-600 mt-0.5">
                                      기한: {formatDate(s.deadline_date)}
                                    </p>
                                )}
                              </div>
                              {!activeStudyLog && (
                                  <button className="btn-success btn-sm"
                                          onClick={() => onStartStudy(student, s.id)}>
                                    자습 시작
                                  </button>
                              )}
                            </div>
                          </div>
                      )
                    })}
                  </div>
              )}

              {/* 재시험 일정 */}
              {retestSchedules.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">재시험 일정</p>
                    {retestSchedules.map((s) => (
                        <div key={s.id} className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-red-800">재시험 미완료</span>
                              {s.deadline_date && (
                                  <p className="text-xs text-red-500 mt-0.5">
                                    기한: {formatDate(s.deadline_date)}
                                  </p>
                              )}
                              {s.note && <p className="text-xs text-red-400">{s.note}</p>}
                            </div>
                            <button className="btn-primary btn-sm"
                                    onClick={() => onCompleteRetest(student, s.id)}>
                              완료 처리
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
              )}

              {/* 아무 일정 없음 */}
              {!activeStudyLog && studySchedules.length === 0 && retestSchedules.length === 0 && (
                  <div className="text-sm text-gray-400 py-1">오늘 자습·재시험 일정이 없습니다.</div>
              )}
            </>
        )}
      </div>
  )
}
