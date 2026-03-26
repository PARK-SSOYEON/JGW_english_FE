import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Student } from '../types'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/common/Modal'
import StudentForm from '../components/admin/StudentForm'

export default function ManagePage() {
  const [students, setStudents] = useState<Student[]>([])
  const toast = useToast()
  const { isSuper } = useAuth()
  const [studentModal, setStudentModal] = useState<Student | 'new' | null>(null)

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/students')
      setStudents(data)
    } catch {
      toast('불러오기 실패', 'error')
    }
  }

  useEffect(() => { fetchStudents() }, [])

  return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">학생 관리</h2>
          <button className="btn-primary" onClick={() => setStudentModal('new')}>+ 학생 등록</button>
        </div>

        <div className="space-y-2">
          {students.map((s) => (
              <div key={s.id} className="card px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {!!s.is_warned && <span className="badge-red ml-2">경고</span>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.school} · {s.grade}학년 · {s.class_names || '반 미배정'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setStudentModal(s)}>수정</button>
                  {isSuper && (
                      <button className="btn-danger btn-sm" onClick={async () => {
                        if (!confirm(`${s.name} 학생을 퇴원 처리하시겠습니까?`)) return
                        await api.delete(`/students/${s.id}`)
                        toast('퇴원 처리 완료', 'success')
                        fetchStudents()
                      }}>퇴원</button>
                  )}
                </div>
              </div>
          ))}
        </div>

        {studentModal && (
            <Modal
                title={studentModal === 'new' ? '학생 등록' : `${(studentModal as Student).name} 수정`}
                onClose={() => setStudentModal(null)}
            >
              <StudentForm
                  student={studentModal === 'new' ? undefined : studentModal as Student}
                  onSuccess={() => { setStudentModal(null); fetchStudents() }}
              />
            </Modal>
        )}
      </div>
  )
}
