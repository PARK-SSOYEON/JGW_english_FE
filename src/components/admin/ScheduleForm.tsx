import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../../lib/api'
import { Schedule, Student, Class } from '../../types'
import { minutesToHM, DOW_LABELS } from '../../lib/utils'
import { useToast } from '../common/Toast'

interface Props {
  studentId?: number
  schedule?: Schedule
  onSuccess: () => void
}

function calcDefaultDeadline(classDow?: number): string {
  const today = new Date()
  const days = classDow === 2 ? 5 : 6
  return format(addDays(today, days), 'yyyy-MM-dd')
}

function getSelectableDates(classDow?: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let rangeEnd: Date
  if (classDow !== undefined) {
    let daysUntilNext = (classDow - today.getDay() + 7) % 7
    if (daysUntilNext === 0) daysUntilNext = 7
    const nextClass = addDays(today, daysUntilNext)
    rangeEnd = addDays(nextClass, -1)
  } else {
    rangeEnd = addDays(today, 6)
  }

  let rangeStart: Date
  if (classDow !== undefined) {
    let daysSinceLast = (today.getDay() - classDow + 7) % 7
    if (daysSinceLast === 0) daysSinceLast = 7
    const lastClass = addDays(today, -daysSinceLast)
    rangeStart = addDays(lastClass, 1)
  } else {
    rangeStart = addDays(today, 1)
  }

  const dates = []
  let cur = new Date(rangeStart)
  while (cur <= rangeEnd) {
    const dow = cur.getDay()
    if (dow !== 1) {
      dates.push({
        date: format(cur, 'yyyy-MM-dd'),
        dow,
        label: DOW_LABELS[dow],
        fullLabel: format(cur, 'M/d (eee)', { locale: ko }),
      })
    }
    cur = addDays(cur, 1)
  }
  return dates
}

export default function ScheduleForm({ studentId, schedule, onSuccess }: Props) {
  const [students, setStudents]         = useState<Student[]>([])
  const [classes,  setClasses]          = useState<Class[]>([])
  const [selStudentId, setSelStudentId] = useState(studentId || schedule?.student_id || 0)
  const [type,     setType]             = useState<'study' | 'retest'>(schedule?.type || 'retest')
  const [date,     setDate]             = useState(schedule?.scheduled_date?.slice(0, 10) || '')
  const [timeH,    setTimeH]            = useState((schedule as any)?.scheduled_time?.slice(0, 2) || '')
  const [timeM,    setTimeM]            = useState((schedule as any)?.scheduled_time?.slice(3, 5) || '00')
  const [fHomework, setFHomework]       = useState(!!schedule?.f_homework)
  const [fRetest,   setFRetest]         = useState(!!schedule?.f_retest)
  const [note,     setNote]             = useState(schedule?.note || '')
  const [loading,  setLoading]          = useState(false)
  const [autoDeadline, setAutoDeadline] = useState<string>(
      schedule?.deadline_date?.slice(0, 10) || calcDefaultDeadline()
  )
  const [studentClassDow, setStudentClassDow] = useState<number | undefined>(undefined)
  const toast = useToast()

  const fCount = (fHomework ? 1 : 0) + (fRetest ? 1 : 0)
  const requiredMinutes = type === 'study'
      ? fCount === 1 ? 180 : fCount === 2 ? 420 : null
      : null
  const time = timeH ? `${timeH}:${timeM}` : ''

  // 초기 데이터 로드
  useEffect(() => {
    if (!studentId && !schedule) {
      api.get('/students').then(({ data }) => setStudents(data))
    }
    api.get('/classes').then(({ data }) => setClasses(data))
  }, [])

  // 반 요일 resolve (async) - classes/students 로드 후 실행
  useEffect(() => {
    if (!classes.length) return
    const sid = Number(selStudentId || studentId || schedule?.student_id)
    if (!sid) return

    const resolve = async () => {
      let classNames: string | undefined

      if (schedule) {
        // 수정 모드: 전체 학생 목록에서 찾기
        try {
          const { data } = await api.get('/students')
          const found = data.find((s: Student) => s.id === schedule.student_id)
          classNames = found?.class_names
        } catch { return }
      } else {
        // 신규: 로드된 students 배열에서 찾기
        const student = students.find(s => s.id === sid)
        classNames = student?.class_names
      }

      if (!classNames) return
      const names = classNames.split(', ').map((n: string) => n.trim())
      const cls = classes.find(c => names.includes(c.name))
      const dow = cls?.day_of_week

      setStudentClassDow(dow)
      if (!schedule) {
        setAutoDeadline(calcDefaultDeadline(dow))
      }
    }

    resolve()
  }, [selStudentId, classes, students]) // ← useEffect 하나로 통합

  const selectableDates = getSelectableDates(studentClassDow)

  const submit = async () => {
    if (!selStudentId) return toast('학생을 선택해주세요.', 'error')
    if (!date) return toast('날짜를 선택해주세요.', 'error')
    if (!timeH) return toast('시간을 입력해주세요.', 'error')
    if (type === 'study' && fCount === 0)
      return toast('숙제X 또는 시험X 중 하나 이상 선택해주세요.', 'error')
    setLoading(true)
    try {
      const payload: any = {
        scheduled_date: date,
        scheduled_time: time,
        f_homework: fHomework,
        f_retest:   fRetest,
        deadline_date: autoDeadline,
        note: note || null,
      }
      if (schedule) {
        await api.patch(`/schedules/${schedule.id}`, payload)
        toast('수정 완료', 'success')
      } else {
        await api.post('/schedules', { ...payload, student_id: selStudentId, type })
        toast('일정 등록 완료', 'success')
      }
      onSuccess()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="space-y-4">
        {!studentId && !schedule && (
            <div>
              <label className="label">학생</label>
              <select className="input" value={selStudentId}
                      onChange={(e) => setSelStudentId(Number(e.target.value))}>
                <option value={0}>학생 선택</option>
                {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.school} {s.grade}학년)
                    </option>
                ))}
              </select>
            </div>
        )}

        {!schedule && (
            <div>
              <label className="label">종류</label>
              <div className="flex gap-2">
                {(['retest', 'study'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setType(t)}
                            className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                                type === t
                                    ? t === 'retest'
                                        ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                                        : 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
                                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}>
                      {t === 'retest' ? '재시험' : '자습'}
                    </button>
                ))}
              </div>
            </div>
        )}

        {type === 'study' && (
            <div>
              <label className="label">F 항목 선택</label>
              <div className="flex gap-2">
                {[
                  { key: 'homework', label: '숙제 X', state: fHomework, set: setFHomework },
                  { key: 'retest',   label: '시험 X', state: fRetest,   set: setFRetest },
                ].map(({ key, label, state, set }) => (
                    <button key={key} type="button" onClick={() => set(!state)}
                            className={`flex-1 py-2.5 rounded-lg text-sm border-2 transition-colors font-medium ${
                                state
                                    ? 'bg-red-50 border-red-400 text-red-700'
                                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}>
                      {label}
                    </button>
                ))}
              </div>
              <div className={`mt-2 px-4 py-3 rounded-lg text-sm font-medium text-center ${
                  requiredMinutes
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-gray-50 border border-gray-200 text-gray-400'
              }`}>
                {requiredMinutes
                    ? `자습 시간: ${minutesToHM(requiredMinutes)} (F ${fCount}개)`
                    : 'F 항목을 선택하면 자습 시간이 자동 계산됩니다'}
              </div>
            </div>
        )}

        <div>
          <label className="label">방문 예정 날짜</label>
          {schedule && !selectableDates.some(d => d.date === date) && date && (
              <div className="mb-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                현재: {format(new Date(date + 'T00:00:00'), 'yyyy년 M월 d일 (eee)', { locale: ko })}
              </div>
          )}
          {selectableDates.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">날짜를 계산 중...</div>
          ) : (
              <div className="flex gap-1.5 flex-wrap">
                {selectableDates.map(({ date: d, dow, label, fullLabel }) => (
                    <button key={d} type="button"
                            onClick={() => setDate(d)}
                            title={fullLabel}
                            className={`flex-1 min-w-[52px] py-2 rounded-lg text-sm border transition-colors ${
                                date === d
                                    ? 'bg-primary-light border-primary text-primary font-medium'
                                    : dow === 0
                                        ? 'border-red-200 text-red-400 hover:bg-red-50'
                                        : dow === 6
                                            ? 'border-blue-200 text-blue-400 hover:bg-blue-50'
                                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}>
                      <div className="text-xs font-medium">{label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {d.slice(5).replace('-', '/')}
                      </div>
                    </button>
                ))}
              </div>
          )}
          {date && (
              <p className="text-xs text-gray-500 mt-1.5">
                선택: {format(new Date(date + 'T00:00:00'), 'yyyy년 M월 d일 (eee)', { locale: ko })}
              </p>
          )}
        </div>

        <div>
          <label className="label">방문 예정 시간</label>
          <div className="flex gap-2 items-center">
            <select className="input w-auto" value={timeH}
                    onChange={(e) => setTimeH(e.target.value)}>
              <option value="">시</option>
              {Array.from({ length: 13 }, (_, i) => String(i + 9).padStart(2, '0')).map((h) => (
                  <option key={h} value={h}>{h}시</option>
              ))}
            </select>
            <select className="input w-auto" value={timeM}
                    onChange={(e) => setTimeM(e.target.value)}
                    disabled={!timeH}>
              <option value="00">00분</option>
              <option value="30">30분</option>
            </select>
            {time && <span className="text-sm text-gray-600 font-medium">{time}</span>}
          </div>
        </div>

        <div>
          <label className="label">완료 기한</label>
          <input type="date" className="input" value={autoDeadline}
                 onChange={(e) => setAutoDeadline(e.target.value)} />
          <p className="text-xs text-blue-500 mt-1">
            기본값: 오늘 기준 화요반 +5일(일요일), 나머지 +6일
          </p>
        </div>

        <div>
          <label className="label">메모 (선택)</label>
          <input type="text" className="input" value={note}
                 placeholder="예: 3단원 시험"
                 onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="btn-primary w-full" onClick={submit} disabled={loading}>
          {loading ? '처리 중...' : schedule ? '수정' : '등록'}
        </button>
      </div>
  )
}
