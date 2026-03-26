import { useState, useEffect } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import { StudyLog, Schedule, Class } from '../types'
import { formatTime, minutesToHM, todayStr } from '../lib/utils'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'

type MainTab = 'logs' | 'targets'
type LogViewMode = 'date' | 'all'
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'expired'

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending:     { label: '미시작', badge: 'badge-gray' },
  in_progress: { label: '진행중', badge: 'badge-amber' },
  completed:   { label: '완료',   badge: 'badge-green' },
  expired:     { label: '만료',   badge: 'badge-red' },
}

export default function StudyListPage() {
  const [tab, setTab] = useState<MainTab>('logs')
  const toast = useToast()
  const { isSuper } = useAuth()

  // ── 자습 기록 탭
  const [logViewMode, setLogViewMode] = useState<LogViewMode>('date')
  const [date, setDate] = useState(todayStr())
  const [logs, setLogs] = useState<StudyLog[]>([])
  const [allLogs, setAllLogs] = useState<StudyLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logSearch, setLogSearch] = useState('')

  // ── 자습 대상자 탭
  const [targets, setTargets] = useState<Schedule[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [filterClassId, setFilterClassId] = useState<number | 'all'>('all')
  const [hideExpired, setHideExpired] = useState(true)

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const { data } = await api.get('/study-logs', { params: { date } })
      setLogs(data)
    } catch {
      toast('불러오기 실패', 'error')
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchAllLogs = async () => {
    setLogsLoading(true)
    try {
      const { data } = await api.get('/study-logs')
      setAllLogs(data)
    } catch {
      toast('불러오기 실패', 'error')
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchTargets = async () => {
    setTargetsLoading(true)
    try {
      const { data } = await api.get('/schedules', { params: { type: 'study' } })
      setTargets(data)
    } catch {
      toast('불러오기 실패', 'error')
    } finally {
      setTargetsLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes')
      setClasses(data)
    } catch {}
  }

  const endStudy = async (logId: number) => {
    try {
      const { data } = await api.post(`/study-logs/${logId}/end`)
      if (data.schedule_completed) {
        toast(`자습 완료! (${minutesToHM(data.actual_minutes)}) ✅`, 'success')
      } else {
        toast(`자습 종료 (${minutesToHM(data.actual_minutes)})`, 'info')
      }
      fetchLogs()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류가 발생했습니다.', 'error')
    }
  }

  useEffect(() => {
    if (tab === 'logs') {
      if (logViewMode === 'date') fetchLogs()
      else fetchAllLogs()
    }
  }, [date, tab, logViewMode])

  useEffect(() => {
    if (tab === 'targets') {
      fetchTargets()
      fetchClasses()
    }
  }, [tab])

  const prevDay = () => setDate(format(addDays(parseISO(date), -1), 'yyyy-MM-dd'))
  const nextDay = () => setDate(format(addDays(parseISO(date),  1), 'yyyy-MM-dd'))

  const deleteLog = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await api.delete(`/study-logs/${id}`)
      toast('삭제 완료', 'success')
      logViewMode === 'date' ? fetchLogs() : fetchAllLogs()
    } catch {
      toast('삭제 실패', 'error')
    }
  }

  // 기록 탭 필터
  const activeLogs = logViewMode === 'date' ? logs : allLogs
  const filteredLogs = logSearch.trim()
      ? activeLogs.filter((l) => l.student_name?.includes(logSearch.trim()))
      : activeLogs
  const inProgress = filteredLogs.filter((l) => !l.end_time)
  const completedLogs = filteredLogs.filter((l) => l.end_time)

  // 대상자 탭 필터
  const filteredTargets = targets.filter((s) => {
    if (hideExpired) {
      // status가 expired이거나, 기한이 오늘보다 이전인 것 모두 가리기
      const today = todayStr()
      const deadlinePassed = s.deadline_date && s.deadline_date.slice(0, 10) < today
      if (s.status === 'expired' || deadlinePassed) return false
    }
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (filterClassId !== 'all') {
      const cls = classes.find(c => c.id === filterClassId)
      if (cls && !s.class_names?.includes(cls.name)) return false
    }
    return true
  })

  const counts = {
    total:       targets.length,
    pending:     targets.filter(s => s.status === 'pending').length,
    in_progress: targets.filter(s => s.status === 'in_progress').length,
    completed:   targets.filter(s => s.status === 'completed').length,
    expired:     targets.filter(s => s.status === 'expired').length,
  }

  return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            { key: 'logs',    label: '자습 기록' },
            { key: 'targets', label: '자습 대상자' },
          ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                          tab === key
                              ? 'bg-white shadow-sm font-medium text-gray-900'
                              : 'text-gray-500 hover:text-gray-700'
                      }`}>
                {label}
                {key === 'targets' && counts.expired > 0 && (
                    <span className="ml-1.5 badge-red">{counts.expired}</span>
                )}
              </button>
          ))}
        </div>

        {/* ── 자습 기록 탭 ── */}
        {tab === 'logs' && (
            <div>
              {/* 날짜 / 전체 전환 */}
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {/* 뷰 모드 토글 */}
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {([
                      { key: 'date', label: '날짜별' },
                      { key: 'all',  label: '전체 보기' },
                    ] as const).map(({ key, label }) => (
                        <button key={key} onClick={() => setLogViewMode(key)}
                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                    logViewMode === key
                                        ? 'bg-white shadow-sm font-medium text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                          {label}
                        </button>
                    ))}
                  </div>

                  {/* 날짜 네비 (날짜별 모드일 때만) */}
                  {logViewMode === 'date' && (
                      <>
                        <button className="btn-secondary btn-sm" onClick={prevDay}>‹ 전날</button>
                        <input type="date" className="input w-auto text-sm" value={date}
                               onChange={(e) => setDate(e.target.value)} />
                        <button className="btn-secondary btn-sm" onClick={nextDay}>다음날 ›</button>
                        {date !== todayStr() && (
                            <button className="btn-secondary btn-sm" onClick={() => setDate(todayStr())}>오늘</button>
                        )}
                        <span className="text-sm text-gray-400">
                    {format(parseISO(date), 'M월 d일 (eee)', { locale: ko })}
                  </span>
                      </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input className="input w-36 text-sm" placeholder="이름 검색"
                         value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                  <button className="btn-secondary btn-sm"
                          onClick={() => logViewMode === 'date' ? fetchLogs() : fetchAllLogs()}>
                    새로고침
                  </button>
                </div>
              </div>

              {/* 진행 중 (날짜별 모드에서만) */}
              {logViewMode === 'date' && date === todayStr() && inProgress.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                      진행 중 ({inProgress.length}명)
                    </h3>
                    <div className="space-y-2">
                      {inProgress.map((log) => (
                          <LogRow key={log.id} log={log}
                                  onEnd={endStudy}
                                  onDelete={isSuper ? deleteLog : undefined} />
                      ))}
                    </div>
                  </div>
              )}

              {/* 완료 / 전체 목록 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  {logViewMode === 'date'
                      ? `완료 (${completedLogs.length}건)`
                      : `전체 자습 기록 (${filteredLogs.length}건)`
                  }
                </h3>
                {logsLoading ? (
                    <div className="card p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="card p-10 text-center text-gray-400">
                      <p className="text-3xl mb-2">📖</p>
                      <p className="text-sm">
                        {logSearch ? `'${logSearch}' 검색 결과가 없습니다.` : '자습 기록이 없습니다.'}
                      </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                      {(logViewMode === 'date' ? completedLogs : filteredLogs).map((log) => (
                          <LogRow key={log.id} log={log}
                                  onDelete={isSuper ? deleteLog : undefined}
                                  showDate={logViewMode === 'all'} />
                      ))}
                    </div>
                )}
              </div>

              {/* 통계 */}
              {filteredLogs.length > 0 && (
                  <div className="mt-5 card p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: '총 인원',     value: `${filteredLogs.length}명`,   color: 'text-gray-800' },
                        { label: '진행 중',     value: `${inProgress.length}명`,     color: 'text-green-600' },
                        {
                          label: '총 자습 시간',
                          value: minutesToHM(completedLogs.reduce((a, l) => a + (l.actual_minutes || 0), 0)),
                          color: 'text-primary'
                        },
                      ].map(({ label, value, color }) => (
                          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className={`text-xl font-bold ${color}`}>{value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                          </div>
                      ))}
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* ── 자습 대상자 탭 ── */}
        {tab === 'targets' && (
            <div>
              {/* 통계 카드 - 클릭 필터 */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {([
                  { key: 'all',         label: '전체',  value: counts.total,        color: 'text-gray-800' },
                  { key: 'pending',     label: '미시작', value: counts.pending,      color: 'text-gray-500' },
                  { key: 'in_progress', label: '진행중', value: counts.in_progress,  color: 'text-amber-600' },
                  { key: 'completed',   label: '완료',   value: counts.completed,    color: 'text-green-600' },
                  { key: 'expired',     label: '만료',   value: counts.expired,      color: 'text-red-600' },
                ] as const).map(({ key, label, value, color }) => (
                    <button key={key} onClick={() => setStatusFilter(key)}
                            className={`card p-3 text-center transition-all ${
                                statusFilter === key ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                            }`}>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </button>
                ))}
              </div>

              {/* 반 필터 + 지난 내역 토글 + 새로고침 */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <select className="input w-auto text-sm"
                        value={filterClassId}
                        onChange={(e) => setFilterClassId(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                  <option value="all">전체 반</option>
                  {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={hideExpired}
                         onChange={(e) => setHideExpired(e.target.checked)}
                         className="rounded"/>
                  지난 내역 숨기기
                </label>

                <button className="btn-secondary btn-sm ml-auto" onClick={fetchTargets}>새로고침</button>
              </div>

              {/* 목록 */}
              {targetsLoading ? (
                  <div className="card p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
              ) : filteredTargets.length === 0 ? (
                  <div className="card p-10 text-center text-gray-400">
                    <p className="text-3xl mb-2">✅</p>
                    <p className="text-sm">해당 조건의 자습 대상자가 없습니다.</p>
                  </div>
              ) : (
                  <div className="card overflow-hidden">
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                      <span className="col-span-2">이름</span>
                      <span className="col-span-2">반</span>
                      <span className="col-span-1">학년</span>
                      <span className="col-span-2">필요시간</span>
                      <span className="col-span-2">남은시간</span>
                      <span className="col-span-2">기한</span>
                      <span className="col-span-1">상태</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filteredTargets.map((s) => {
                        const required  = s.required_minutes || 0
                        const done      = (s as any).done_minutes || 0
                        const remaining = Math.max(required - done, 0)
                        const meta      = STATUS_META[s.status] ?? { label: s.status, badge: 'badge-gray' }

                        return (
                            <div key={s.id}
                                 className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                                     s.status === 'completed' || s.status === 'expired' ? 'opacity-50' : ''
                                 }`}>
                              <span className="col-span-2 font-medium text-gray-900 text-sm">{s.student_name}</span>
                              <span className="col-span-2 text-xs text-gray-500 truncate">{s.class_names || '-'}</span>
                              <span className="col-span-1 text-xs text-gray-500">{s.grade}학년</span>
                              <span className="col-span-2 text-xs text-gray-700">{minutesToHM(required)}</span>
                              <span className="col-span-2 text-xs font-medium whitespace-nowrap">
                        {s.status === 'completed'
                            ? <span className="text-gray-400">-</span>
                            : s.status === 'expired'
                                ? <span className="text-red-400">{minutesToHM(remaining)}</span>
                                : remaining > 0
                                    ? <span className="text-amber-600">{minutesToHM(remaining)}</span>
                                    : <span className="text-gray-400">-</span>
                        }
                      </span>
                              <span className="col-span-2 text-xs text-gray-500 whitespace-nowrap">
                        {s.deadline_date
                            ? format(parseISO(s.deadline_date.slice(0, 10)), 'M/d (eee)', { locale: ko })
                            : '-'}
                      </span>
                              <span className="col-span-1">
                        <span className={meta.badge}>{meta.label}</span>
                      </span>
                            </div>
                        )
                      })}
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  )
}

// LogRow 컴포넌트 수정
function LogRow({ log, onDelete, onEnd, showDate }: {
  log: StudyLog
  onDelete?: (id: number) => void
  onEnd?: (id: number) => void
  showDate?: boolean
}) {
  const isActive = !log.end_time
  return (
      <div className={`card px-4 py-3 flex items-center justify-between ${isActive ? 'border-green-200' : ''}`}>
        <div className="flex items-center gap-3">
          {isActive && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
          <div>
            <span className="font-medium text-gray-900">{log.student_name}</span>
            <span className="text-xs text-gray-400 ml-2">
            {showDate && (
                <span className="mr-1">{log.start_time.slice(0, 10)}</span>
            )}
              {formatTime(log.start_time)} ~ {log.end_time ? formatTime(log.end_time) : '진행 중'}
          </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {log.actual_minutes != null && (
              <span className="badge-green">{minutesToHM(log.actual_minutes)}</span>
          )}
          {log.required_minutes != null && (
              <span className="badge-gray">목표 {minutesToHM(log.required_minutes)}</span>
          )}
          {/* 진행 중일 때 종료 버튼 */}
          {isActive && onEnd && (
              <button className="btn-danger btn-sm"
                      onClick={() => onEnd(log.id)}>
                자습 종료
              </button>
          )}
          {onDelete && !isActive && (
              <button className="text-xs text-red-400 hover:text-red-600"
                      onClick={() => onDelete(log.id)}>삭제</button>
          )}
        </div>
      </div>
  )
}
