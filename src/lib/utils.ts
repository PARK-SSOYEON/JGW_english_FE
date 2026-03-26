import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'yyyy.MM.dd (eee)', { locale: ko }) }
  catch { return dateStr }
}

export function formatTime(dtStr: string) {
  try {
    const date = new Date(dtStr)
    return format(date, 'HH:mm')
  } catch { return dtStr }
}

export function formatDateTime(dtStr: string) {
  try { return format(parseISO(dtStr), 'MM.dd HH:mm', { locale: ko }) }
  catch { return dtStr }
}

export function minutesToHM(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

export function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getWeekDates(start: string): string[] {
  const base = parseISO(start)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return format(d, 'yyyy-MM-dd')
  })
}

export const SCHOOL_OPTIONS = ['유신고', '창현고'] as const
export const GRADE_OPTIONS = [1, 2] as const
