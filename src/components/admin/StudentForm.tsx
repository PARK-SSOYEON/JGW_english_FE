import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { Student, Class } from '../../types'
import { useToast } from '../common/Toast'
import { SCHOOL_OPTIONS, GRADE_OPTIONS } from '../../lib/utils'

interface Props {
  student?: Student
  onSuccess: () => void
}

export default function StudentForm({ student, onSuccess }: Props) {
  const [name, setName] = useState(student?.name || '')
  const [school, setSchool] = useState<'유신고' | '창현고'>(student?.school || '유신고')
  const [grade, setGrade] = useState<1 | 2>(student?.grade || 1)
  const [classIds, setClassIds] = useState<number[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.get('/classes').then(({ data }) => setClasses(data))
    if (student) {
      // 현재 소속 반 불러오기
      api.get(`/classes`).then(({ data }: { data: Class[] }) => {
        // student.class_names에서 매핑
        const names = student.class_names?.split(', ') || []
        const ids = data.filter((c) => names.includes(c.name)).map((c) => c.id)
        setClassIds(ids)
      })
    }
  }, [])

  const toggleClass = (id: number) => {
    setClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const submit = async () => {
    if (!name.trim()) return toast('이름을 입력해주세요.', 'error')
    setLoading(true)
    try {
      if (student) {
        await api.patch(`/students/${student.id}`, { name, school, grade, class_ids: classIds })
        toast('수정 완료', 'success')
      } else {
        await api.post('/students', { name, school, grade, class_ids: classIds })
        toast('학생 등록 완료', 'success')
      }
      onSuccess()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter((c) => c.school === school && c.grade === grade)

  return (
    <div className="space-y-4">
      <div>
        <label className="label">이름</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="학생 이름" />
      </div>

      <div>
        <label className="label">학교</label>
        <div className="flex gap-2">
          {SCHOOL_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setSchool(s)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                school === s
                  ? 'bg-primary-light border-primary text-primary font-medium'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">학년</label>
        <div className="flex gap-2">
          {GRADE_OPTIONS.map((g) => (
            <button key={g} type="button" onClick={() => setGrade(g)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                grade === g
                  ? 'bg-primary-light border-primary text-primary font-medium'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {g}학년
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">반 배정 (복수 선택 가능)</label>
        {filteredClasses.length === 0 ? (
          <p className="text-xs text-gray-400">해당 학교의 반이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredClasses.map((c) => (
              <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  classIds.includes(c.id)
                    ? 'bg-primary-light border-primary text-primary font-medium'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn-primary w-full" onClick={submit} disabled={loading}>
        {loading ? '처리 중...' : student ? '수정' : '등록'}
      </button>
    </div>
  )
}
