import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Class } from '../types'
import { useToast } from '../components/common/Toast'
import { DOW_LABELS, minutesToHM } from '../lib/utils'
import Modal from '../components/common/Modal'
import ScheduleForm from '../components/admin/ScheduleForm'

// 반별 학생 (스케줄 집계 포함)
interface ClassStudent {
  id: number
  name: string
  school: string
  grade: number
  is_warned: boolean
  class_names: string
  pending_study_count: number
  pending_retest_count: number
  remaining_minutes: number
}

export default function ClassesPage() {
  const [classes,  setClasses]  = useState<Class[]>([])
  const [selected, setSelected] = useState<Class | null>(null)
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [loading,  setLoading]  = useState(false)
  const [schedModal, setSchedModal] = useState<ClassStudent | null>(null)
  const toast = useToast()

  useEffect(() => {
    api.get('/classes')
        .then(({ data }) => setClasses(data))
        .catch(() => toast('반 목록 로드 실패', 'error'))
  }, [])

  const selectClass = async (cls: Class) => {
    setSelected(cls)
    setLoading(true)
    try {
      const { data } = await api.get(`/classes/${cls.id}/students`)
      setStudents(data)
    } catch {
      toast('학생 목록 로드 실패', 'error')
    } finally {
      setLoading(false)
    }
  }

  const schools = ['유신고', '창현고'] as const

  return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">반별 조회</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 반 목록 */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">반 목록</h3>
              <div className="space-y-4">
                {schools.map((school) => (
                    <div key={school}>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">{school}</p>
                      {([1, 2] as const).map((grade) => {
                        const gradeClasses = classes.filter((c) => c.school === school && c.grade === grade)
                        if (!gradeClasses.length) return null
                        return (
                            <div key={grade} className="mb-2">
                              <p className="text-xs text-gray-400 pl-1 mb-1">{grade}학년</p>
                              <div className="space-y-1">
                                {gradeClasses.map((cls) => (
                                    <button key={cls.id} onClick={() => selectClass(cls)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                                selected?.id === cls.id
                                                    ? 'bg-primary-light text-primary font-medium'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                            }`}>
                                      <span className="font-medium">{cls.name}</span>
                                      <span className="text-xs text-gray-400 ml-1.5">({DOW_LABELS[cls.day_of_week]}요일)</span>
                                    </button>
                                ))}
                              </div>
                            </div>
                        )
                      })}
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* 학생 목록 */}
          <div className="lg:col-span-2">
            {!selected ? (
                <div className="card p-12 text-center text-gray-400">
                  <p className="text-4xl mb-3">🏫</p>
                  <p className="text-sm">왼쪽에서 반을 선택하세요</p>
                </div>
            ) : (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                      <p className="text-xs text-gray-500">
                        {DOW_LABELS[selected.day_of_week]}요일 수업 · {students.length}명
                      </p>
                    </div>
                  </div>

                  {loading ? (
                      <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>
                  ) : students.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">등록된 학생이 없습니다.</div>
                  ) : (
                      <div className="divide-y divide-gray-100">
                        {students.map((s) => {
                          const hasStudy  = s.pending_study_count > 0
                          const hasRetest = s.pending_retest_count > 0
                          const remaining = Number(s.remaining_minutes) || 0

                          return (
                              <div key={s.id}
                                   className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50">
                                {/* 이름 클릭 → 일정 등록 */}
                                <button
                                    onClick={() => setSchedModal(s)}
                                    className="flex items-center gap-2 text-left hover:text-primary transition-colors">
                                  <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                                  {!!s.is_warned && <span className="badge-red">경고</span>}
                                  <span className="text-xs text-gray-300">+ 일정</span>
                                </button>

                                {/* 미완료 상태 뱃지 */}
                                <div className="flex items-center gap-1.5">
                                  {hasRetest && (
                                      <span className="badge-red">
                              재시험
                            </span>
                                  )}
                                  {hasStudy && (
                                      <span className="badge-amber">
                              자습 {minutesToHM(remaining)}
                            </span>
                                  )}
                                  {!hasStudy && !hasRetest && (
                                      <span className="text-xs text-gray-300">-</span>
                                  )}
                                </div>
                              </div>
                          )
                        })}
                      </div>
                  )}
                </div>
            )}
          </div>
        </div>

        {/* 일정 등록 모달 */}
        {schedModal && (
            <Modal
                title={`${schedModal.name} 일정 등록`}
                onClose={() => setSchedModal(null)}
            >
              <ScheduleForm
                  studentId={schedModal.id}
                  onSuccess={() => {
                    setSchedModal(null)
                    if (selected) selectClass(selected) // 목록 새로고침
                  }}
              />
            </Modal>
        )}
      </div>
  )
}
