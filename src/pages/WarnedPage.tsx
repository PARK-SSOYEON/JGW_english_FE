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
      await api.patch(`/students/${student.id}`, { is_warned: false })
      toast('경고 해제 완료', 'success')
      fetch()
    } catch {
      toast('오류 발생', 'error')
    }
  }

  const expel = async (student: Student) => {
    if (!confirm(`${student.name} 학생을 퇴원 처리하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await api.delete(`/students/${student.id}`)
      toast(`${student.name} 퇴원 처리 완료`, 'success')
      fetch()
    } catch {
      toast('오류 발생', 'error')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">경고 대상자</h2>
          <p className="text-sm text-gray-500 mt-0.5">자습 미이행으로 경고를 받은 학생 목록</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={fetch}>새로고침</button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : students.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm text-gray-500">경고 대상자가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700 font-medium">⚠️ 경고 대상자 {students.length}명</p>
            <p className="text-xs text-red-500 mt-0.5">
              경고 상태에서 자습을 또 이행하지 않을 경우 퇴원 조치됩니다.
            </p>
          </div>

          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.id} className="card p-4 border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{s.name}</span>
                      <span className="badge-red">⚠️ 경고</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {s.school} · {s.grade}학년 · {s.class_names || '반 미배정'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary btn-sm"
                      onClick={() => resolveWarning(s)}>
                      경고 해제
                    </button>
                    {isSuper && (
                      <button className="btn-danger btn-sm"
                        onClick={() => expel(s)}>
                        퇴원 처리
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
