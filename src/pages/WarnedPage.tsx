import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Student } from '../types'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'

export default function WarnedPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const { isSuper } = useAuth()

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/students', { params: { warned: 'true' } })
      setStudents(data)
    } catch {
      toast('불러오기 실패', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const resolveWarning = async (student: Student) => {
    if (!confirm(`${student.name} 학생의 경고를 해제하시겠습니까?`)) return
    try {
      await api.patch(`/students/${student.id}`, { warn_count: 0 })
      toast('경고 해제 완료', 'success')
      fetch()
    } catch {
      toast('오류 발생', 'error')
    }
  }

  const expel = async (student: Student) => {
    if (!confirm(`${student.name} 학생을 퇴원 처리하시겠습니까?`)) return
    try {
      await api.delete(`/students/${student.id}`)
      toast(`${student.name} 퇴원 처리 완료`, 'success')
      fetch()
    } catch {
      toast('오류 발생', 'error')
    }
  }

  // 경고 횟수별 분류
  const warned1 = students.filter(s => s.warn_count === 1)
  const warned2 = students.filter(s => s.warn_count >= 2)

  const StudentRow = ({ s }: { s: Student }) => (
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{s.name}</span>
            {s.warn_count >= 2
                ? <span className="badge-red">⚠️ 경고 {s.warn_count}회 (퇴원 대상)</span>
                : <span className="badge-amber">⚠️ 경고 {s.warn_count}회</span>
            }
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {s.school} · {s.grade}학년 · {s.class_names || '반 미배정'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => resolveWarning(s)}>
            경고 해제
          </button>
          {isSuper && (
              <button className="btn-danger btn-sm" onClick={() => expel(s)}>
                퇴원 처리
              </button>
          )}
        </div>
      </div>
  )

  return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">경고 대상자</h2>
            <p className="text-sm text-gray-500 mt-0.5">총 {students.length}명</p>
          </div>
          <button className="btn-secondary btn-sm" onClick={fetch}>새로고침</button>
        </div>

        {loading ? (
            <div className="card p-8 text-center text-gray-400">불러오는 중...</div>
        ) : students.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm text-gray-500">경고 대상자가 없습니다.</p>
            </div>
        ) : (
            <div className="space-y-6">
              {/* 퇴원 대상 (2회 이상) */}
              {warned2.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-red-600">퇴원 조치 대상</h3>
                      <span className="badge-red">{warned2.length}명</span>
                    </div>
                    <div className="space-y-2">
                      {warned2.map(s => <StudentRow key={s.id} s={s} />)}
                    </div>
                  </div>
              )}

              {/* 경고 1회 */}
              {warned1.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-amber-600">경고 1회</h3>
                      <span className="badge-amber">{warned1.length}명</span>
                    </div>
                    <div className="space-y-2">
                      {warned1.map(s => <StudentRow key={s.id} s={s} />)}
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  )
}
