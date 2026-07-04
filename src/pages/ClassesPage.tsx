import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Class } from '../types'
import { useToast } from '../components/common/Toast'
import { useSeason } from '../hooks/useSeason'
import { DOW_LABELS, minutesToHM } from '../lib/utils'
import Modal from '../components/common/Modal'
import ScheduleForm from '../components/admin/ScheduleForm'

interface ClassStudent {
  id: number
  name: string
  school: string
  grade: number
  is_warned: boolean
  warn_count: number
  class_names: string
  pending_study_count: number
  pending_retest_count: number
  remaining_minutes: number
}

const schoolType = (school?: string) => {
  if (school?.includes('중')) return '중학교'
  if (school?.includes('고')) return '고등학교'
  return '기타'
}

export default function ClassesPage() {
  const [classes,    setClasses]    = useState<Class[]>([])
  const [selected,   setSelected]   = useState<Class | null>(null)
  const [students,   setStudents]   = useState<ClassStudent[]>([])
  const [loading,    setLoading]    = useState(false)
  const [schedModal, setSchedModal] = useState<ClassStudent | null>(null)
  const toast = useToast()
  const { season } = useSeason()

  useEffect(() => {
    if (!season) return
    api.get('/classes', { params: { season_id: season.id } })  // ✅ season_id 추가
        .then(({ data }) => setClasses(data))
        .catch(() => toast('반 목록 로드 실패', 'error'))
  }, [season])

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

  // 학교급 + 학년으로 그룹핑
  const groupedClasses = classes.reduce<Record<string, Class[]>>((acc, c) => {
    const key = `${schoolType(c.school)}-${c.grade ?? 0}`
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  // 중학교 먼저, 같은 학교급이면 학년 오름차순
  const sortedKeys = Object.keys(groupedClasses).sort((a, b) => {
    const [schoolA, gradeA] = a.split('-')
    const [schoolB, gradeB] = b.split('-')
    if (schoolA !== schoolB) return schoolA === '중학교' ? -1 : 1
    return Number(gradeA) - Number(gradeB)
  })

  return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">반별 조회</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 반 목록 */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">반 목록</h3>
              <div className="space-y-4">
                {sortedKeys.map((key) => {
                  const [type, grade] = key.split('-')
                  return (
                      <div key={key}>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">
                          {type} {grade}학년
                        </p>
                        <div className="space-y-1">
                          {groupedClasses[key].map((cls) => (
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
                                <button
                                    onClick={() => setSchedModal(s)}
                                    className="flex items-center gap-2 text-left hover:text-primary transition-colors">
                                  <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                                  {(s.warn_count ?? 0) > 0 && (
                                      <span className={s.warn_count >= 2 ? 'badge-red' : 'badge-amber'}>
                              경고 {s.warn_count}회
                            </span>
                                  )}
                                  <span className="text-xs text-gray-300">+ 일정</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                  {hasRetest && <span className="badge-red">재시험</span>}
                                  {hasStudy  && <span className="badge-amber">자습 {minutesToHM(remaining)}</span>}
                                  {!hasStudy && !hasRetest && <span className="text-xs text-gray-300">-</span>}
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

        {schedModal && (
            <Modal
                title={`${schedModal.name} 일정 등록`}
                onClose={() => setSchedModal(null)}
            >
              <ScheduleForm
                  studentId={schedModal.id}
                  onSuccess={() => {
                    setSchedModal(null)
                    if (selected) selectClass(selected)
                  }}
              />
            </Modal>
        )}
      </div>
  )
}
