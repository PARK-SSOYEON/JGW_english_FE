export interface Student {
  id: number
  name: string
  school: '유신고' | '창현고'
  grade: 1 | 2
  is_warned: boolean
  is_active: boolean
  class_names?: string
  class_days?: string
  created_at: string
}

export interface StudentDetail extends Student {
  hasClassToday: boolean
  studySchedules: Schedule[]
  retestSchedules: Schedule[]
  activeStudyLog: StudyLog | null
}

export interface Class {
  id: number
  name: string
  school: '유신고' | '창현고'
  grade: 1 | 2
  day_of_week: number
  created_at: string
}

export interface Schedule {
  id: number
  student_id: number
  student_name?: string
  school?: string
  grade?: number
  class_names?: string
  type: 'study' | 'retest'
  scheduled_date: string
  scheduled_time?: string | null   // ← 추가
  f_homework: boolean
  f_retest: boolean
  required_minutes: number | null
  done_minutes?: number
  deadline_date: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  is_completed: boolean
  completed_at: string | null
  note: string | null
  created_at: string
}

export interface StudyLog {
  id: number
  student_id: number
  student_name?: string
  schedule_id: number | null
  log_date: string
  start_time: string
  end_time: string | null
  actual_minutes: number | null
  required_minutes?: number | null
  created_at: string
}

export interface FRecord {
  id: number
  student_id: number
  student_name?: string
  type: 'homework' | 'retest'
  class_date: string
  note: string | null
  created_at: string
}

export interface AttendanceLog {
  id: number
  student_id: number
  student_name?: string
  school?: string
  grade?: number
  log_date: string
  purpose: 'study' | 'retest' | 'general'
  note: string | null
  created_at: string
}

export interface Admin {
  id: number
  name: string
  role: 'admin' | 'super'
  is_active: boolean
  created_at: string
}

export type AdminRole = 'admin' | 'super'
