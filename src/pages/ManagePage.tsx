import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Student } from '../types'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { useSeason } from '../hooks/useSeason'
import Modal from '../components/common/Modal'
import StudentForm from '../components/admin/StudentForm'

const schoolType = (school?: string) => {
    if (school === 'middle') return '중학교'
    if (school === 'high')   return '고등학교'
    return '기타'
}

export default function ManagePage() {
    const [students, setStudents] = useState<Student[]>([])
    const toast = useToast()
    const { isSuper } = useAuth()
    const { season } = useSeason()
    const [studentModal, setStudentModal] = useState<Student | 'new' | null>(null)

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/students', {
                params: { season_id: season?.id }  // ✅ 시즌 필터
            })
            setStudents(data)
        } catch {
            toast('불러오기 실패', 'error')
        }
    }

    useEffect(() => { fetchStudents() }, [season])

    // 학교급 + 학년으로 그룹핑
    const groupedByGrade = students.reduce<Record<string, Student[]>>((acc, s) => {
        const key = `${schoolType(s.school_type)}-${s.grade ?? 0}`
        if (!acc[key]) acc[key] = []
        acc[key].push(s)
        return acc
    }, {})

    // 중학교 먼저, 같은 학교급이면 학년 오름차순
    const sortedKeys = Object.keys(groupedByGrade).sort((a, b) => {
        const [schoolA, gradeA] = a.split('-')
        const [schoolB, gradeB] = b.split('-')
        if (schoolA !== schoolB) return schoolA === '중학교' ? -1 : 1
        return Number(gradeA) - Number(gradeB)
    })

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">학생 관리</h2>
                    <p className="text-sm text-gray-500 mt-0.5">총 {students.length}명</p>
                </div>
                <button className="btn-primary" onClick={() => setStudentModal('new')}>+ 학생 등록</button>
            </div>

            <div className="space-y-6">
                {sortedKeys.map((key) => {
                    const [type, grade] = key.split('-')
                    return (
                        <div key={key}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <h3 className="text-sm font-semibold text-gray-700">{type} {grade}학년</h3>
                                <span className="badge-gray">{groupedByGrade[key].length}명</span>
                            </div>

                            <div className="space-y-2">
                                {groupedByGrade[key].map((s) => (
                                    <div key={s.id} className="card px-4 py-3 flex items-center justify-between">
                                        <div>
                                            <span className="font-medium text-gray-900">{s.name}</span>
                                            {(s.warn_count ?? 0) > 0 && (
                                                <span className={`ml-2 ${s.warn_count >= 2 ? 'badge-red' : 'badge-amber'}`}>
                          경고 {s.warn_count}회
                        </span>
                                            )}
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {s.school} · {s.class_names || '미배정'}
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
                        </div>
                    )
                })}
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
