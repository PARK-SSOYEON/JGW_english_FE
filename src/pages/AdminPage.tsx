import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Admin, Class, Season } from '../types'
import { useToast } from '../components/common/Toast'
import { DOW_LABELS, SCHOOL_OPTIONS } from '../lib/utils'
import Modal from '../components/common/Modal'
import { useSeason } from '../hooks/useSeason'

const schoolType = (school?: string) => {
  if (school === 'middle') return '중학교'
  if (school === 'high')   return '고등학교'
  return '기타'
}

export default function AdminPage() {
  const [tab, setTab] = useState<'admins' | 'classes' | 'seasons'>('admins')
  const [admins,  setAdmins]  = useState<Admin[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const toast = useToast()
  const { season: activeSeason, setSeason } = useSeason()

  const [adminModal, setAdminModal] = useState<'new' | Admin | null>(null)
  const [adminName, setAdminName]   = useState('')
  const [adminCode, setAdminCode]   = useState('')
  const [adminRole, setAdminRole]   = useState<'admin' | 'super'>('admin')

  const [classModal,  setClassModal]  = useState(false)
  const [className,   setClassName]   = useState('')
  const [classGrade,  setClassGrade]  = useState<1 | 2 | 3>(1)
  const [classDow,    setClassDow]    = useState(2)

  const [seasonModal,     setSeasonModal]     = useState(false)
  const [seasonName,      setSeasonName]      = useState('')
  const [seasonStartDate, setSeasonStartDate] = useState('')
  const [seasonEndDate,   setSeasonEndDate]   = useState('')

  const [classSchoolType, setClassSchoolType] = useState<'middle' | 'high'>('high')


  const fetchAdmins  = async () => { try { const { data } = await api.get('/admins');  setAdmins(data)  } catch { toast('불러오기 실패', 'error') } }
  const fetchClasses = async () => { try { const { data } = await api.get('/classes', { params: { season_id: activeSeason?.id } }); setClasses(data) } catch { toast('불러오기 실패', 'error') } }
  const fetchSeasons = async () => { try { const { data } = await api.get('/seasons'); setSeasons(data) } catch { toast('불러오기 실패', 'error') } }

  useEffect(() => { fetchAdmins(); fetchClasses(); fetchSeasons() }, [activeSeason?.id])

  const openAdminEdit = (a: Admin) => { setAdminModal(a); setAdminName(a.name); setAdminCode(''); setAdminRole(a.role) }
  const openAdminNew  = () => { setAdminModal('new'); setAdminName(''); setAdminCode(''); setAdminRole('admin') }

  const saveAdmin = async () => {
    if (!adminName.trim()) return toast('이름을 입력해주세요.', 'error')
    try {
      if (adminModal === 'new') {
        if (!adminCode.trim()) return toast('코드를 입력해주세요.', 'error')
        await api.post('/admins', { name: adminName, code: adminCode, role: adminRole })
        toast('관리자 등록 완료', 'success')
      } else {
        const body: any = { name: adminName, role: adminRole }
        if (adminCode.trim()) body.code = adminCode
        await api.patch(`/admins/${(adminModal as Admin).id}`, body)
        toast('수정 완료', 'success')
      }
      setAdminModal(null)
      fetchAdmins()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류 발생', 'error')
    }
  }

  const deactivateAdmin = async (a: Admin) => {
    if (!confirm(`${a.name} 관리자를 비활성화하시겠습니까?`)) return
    try {
      await api.delete(`/admins/${a.id}`)
      toast('비활성화 완료', 'success')
      fetchAdmins()
    } catch { toast('오류 발생', 'error') }
  }

  const saveClass = async () => {
    if (!className.trim()) return toast('반 이름을 입력해주세요.', 'error')
    try {
      // saveClass에서 school 파라미터로 전달
      await api.post('/classes', {
        name: className,
        school: classSchoolType,
        grade: classGrade,
        day_of_week: classDow,
        season_id: activeSeason?.id
      })
      toast('반 등록 완료', 'success')
      setClassModal(false)
      setClassName('')
      fetchClasses()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류 발생', 'error')
    }
  }

  const deleteClass = async (c: Class) => {
    if (!confirm(`${c.name} 반을 삭제하시겠습니까?`)) return
    try {
      await api.delete(`/classes/${c.id}`)
      toast('삭제 완료', 'success')
      fetchClasses()
    } catch { toast('오류 발생', 'error') }
  }

  const saveSeason = async () => {
    if (!seasonName.trim() || !seasonStartDate || !seasonEndDate)
      return toast('모든 항목을 입력해주세요.', 'error')
    try {
      await api.post('/seasons', { name: seasonName, start_date: seasonStartDate, end_date: seasonEndDate })
      toast('시즌 등록 완료', 'success')
      setSeasonModal(false)
      setSeasonName('')
      setSeasonStartDate('')
      setSeasonEndDate('')
      fetchSeasons()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류 발생', 'error')
    }
  }

  const activateSeason = async (s: Season) => {
    if (!confirm(`'${s.name}' 시즌을 활성화하시겠습니까?`)) return
    try {
      await api.patch(`/seasons/${s.id}/activate`)
      toast('시즌 활성화 완료', 'success')
      setSeason(s)
      fetchSeasons()
    } catch { toast('오류 발생', 'error') }
  }

  const deleteSeason = async (s: Season) => {
    if (!confirm(`'${s.name}' 시즌을 삭제하시겠습니까?`)) return
    try {
      await api.delete(`/seasons/${s.id}`)
      toast('삭제 완료', 'success')
      fetchSeasons()
    } catch { toast('오류 발생', 'error') }
  }

  // 학교급 + 학년으로 그룹핑
  const groupedClasses = classes.reduce<Record<string, Class[]>>((acc, c) => {
    const key = `${schoolType(c.school)}-${c.grade ?? 0}`
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const sortedClassKeys = Object.keys(groupedClasses).sort((a, b) => {
    const [schoolA, gradeA] = a.split('-')
    const [schoolB, gradeB] = b.split('-')
    if (schoolA !== schoolB) return schoolA === '중학교' ? -1 : 1
    return Number(gradeA) - Number(gradeB)
  })

  return (
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">관리자 설정</h2>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            ['admins',  '관리자 관리'],
            ['classes', '반 관리'],
            ['seasons', '시즌 관리'],
          ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                          tab === key ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                {label}
              </button>
          ))}
        </div>

        {/* 관리자 탭 */}
        {tab === 'admins' && (
            <div>
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={openAdminNew}>+ 관리자 등록</button>
              </div>
              <div className="space-y-2">
                {admins.map((a) => (
                    <div key={a.id} className="card px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{a.name}</span>
                        <span className={`ml-2 ${a.role === 'super' ? 'badge-purple' : 'badge-blue'}`}>
                    {a.role === 'super' ? '슈퍼' : '일반'}
                  </span>
                        {!a.is_active && <span className="badge-gray ml-1">비활성</span>}
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary btn-sm" onClick={() => openAdminEdit(a)}>수정</button>
                        <button className="btn-danger btn-sm" onClick={() => deactivateAdmin(a)}>비활성화</button>
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* 반 탭 */}
        {tab === 'classes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  현재 시즌: <span className="font-medium text-gray-700">{activeSeason?.name || '-'}</span>
                </p>
                <button className="btn-primary" onClick={() => setClassModal(true)}>+ 반 등록</button>
              </div>

              {/* ✅ 학교명 하드코딩 제거 → 학교급 + 학년 그룹핑 */}
              <div className="space-y-6">
                {sortedClassKeys.length === 0 ? (
                    <div className="card p-6 text-center text-sm text-gray-400">등록된 반이 없습니다.</div>
                ) : (
                    sortedClassKeys.map((key) => {
                      const [type, grade] = key.split('-')
                      return (
                          <div key={key}>
                            <h3 className="text-sm font-semibold text-gray-500 mb-2">
                              {type} {grade}학년
                            </h3>
                            <div className="space-y-2">
                              {groupedClasses[key].map((c) => (
                                  <div key={c.id} className="card px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900">{c.name}</span>
                                      <span className="text-xs text-gray-400">{DOW_LABELS[c.day_of_week]}요일</span>
                                    </div>
                                    <button className="btn-danger btn-sm" onClick={() => deleteClass(c)}>삭제</button>
                                  </div>
                              ))}
                            </div>
                          </div>
                      )
                    })
                )}
              </div>
            </div>
        )}

        {/* 시즌 탭 */}
        {tab === 'seasons' && (
            <div>
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={() => setSeasonModal(true)}>+ 시즌 등록</button>
              </div>
              <div className="space-y-2">
                {seasons.map((s) => (
                    <div key={s.id} className="card px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{s.name}</span>
                          {!!s.is_active && <span className="badge-green">활성</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.start_date?.slice(0, 10)} ~ {s.end_date?.slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!s.is_active && (
                            <button className="btn-secondary btn-sm" onClick={() => activateSeason(s)}>활성화</button>
                        )}
                        <button className="btn-danger btn-sm" onClick={() => deleteSeason(s)}>삭제</button>
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* 관리자 등록/수정 모달 */}
        {adminModal && (
            <Modal
                title={adminModal === 'new' ? '관리자 등록' : `${(adminModal as Admin).name} 수정`}
                onClose={() => setAdminModal(null)} size="sm">
              <div className="space-y-4">
                <div>
                  <label className="label">이름</label>
                  <input className="input" value={adminName}
                         onChange={(e) => setAdminName(e.target.value)} placeholder="관리자 이름" />
                </div>
                <div>
                  <label className="label">
                    로그인 코드 {adminModal !== 'new' && <span className="text-gray-400">(변경 시에만 입력)</span>}
                  </label>
                  <input className="input" type="password" value={adminCode}
                         onChange={(e) => setAdminCode(e.target.value)}
                         placeholder={adminModal === 'new' ? '코드 입력' : '변경할 코드 입력'} />
                </div>
                <div>
                  <label className="label">권한</label>
                  <div className="flex gap-2">
                    {(['admin', 'super'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => setAdminRole(r)}
                                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                                    adminRole === r
                                        ? 'bg-primary-light border-primary text-primary font-medium'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}>
                          {r === 'super' ? '슈퍼 관리자' : '일반 관리자'}
                        </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button className="btn-secondary" onClick={() => setAdminModal(null)}>취소</button>
                  <button className="btn-primary" onClick={saveAdmin}>저장</button>
                </div>
              </div>
            </Modal>
        )}

        {/* 반 등록 모달 */}
        {classModal && (
            <Modal title="반 등록" onClose={() => setClassModal(false)} size="sm">
              <div className="space-y-4">
                <div>
                  <label className="label">반 이름</label>
                  <input className="input" value={className}
                         onChange={(e) => setClassName(e.target.value)} placeholder="예: 고2 화요반" />
                </div>
                <div>
                  <label className="label">학교급</label>
                  <div className="flex gap-2">
                    {(['high', 'middle'] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setClassSchoolType(s)}
                                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                                    classSchoolType === s
                                        ? 'bg-primary-light border-primary text-primary font-medium'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}>
                          {s === 'high' ? '고등학교' : '중학교'}
                        </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">학년</label>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map((g) => (
                        <button key={g} type="button" onClick={() => setClassGrade(g)}
                                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                                    classGrade === g
                                        ? 'bg-primary-light border-primary text-primary font-medium'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}>
                          {g}학년
                        </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">수업 요일</label>
                  <div className="flex gap-1.5">
                    {DOW_LABELS.filter((_, i) => i !== 1).map((d, idx) => {
                      const actualDow = [0, 2, 3, 4, 5, 6][idx]
                      return (
                          <button key={actualDow} type="button" onClick={() => setClassDow(actualDow)}
                                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                                      classDow === actualDow
                                          ? 'bg-primary-light border-primary text-primary font-medium'
                                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                  }`}>
                            {d}
                          </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">월요일은 휴무입니다.</p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button className="btn-secondary" onClick={() => setClassModal(false)}>취소</button>
                  <button className="btn-primary" onClick={saveClass}>등록</button>
                </div>
              </div>
            </Modal>
        )}

        {/* 시즌 등록 모달 */}
        {seasonModal && (
            <Modal title="시즌 등록" onClose={() => setSeasonModal(false)} size="sm">
              <div className="space-y-4">
                <div>
                  <label className="label">시즌 이름</label>
                  <input className="input" value={seasonName}
                         onChange={(e) => setSeasonName(e.target.value)}
                         placeholder="예: 2026년 여름방학" />
                </div>
                <div>
                  <label className="label">시작일</label>
                  <input type="date" className="input" value={seasonStartDate}
                         onChange={(e) => setSeasonStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">종료일</label>
                  <input type="date" className="input" value={seasonEndDate}
                         onChange={(e) => setSeasonEndDate(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button className="btn-secondary" onClick={() => setSeasonModal(false)}>취소</button>
                  <button className="btn-primary" onClick={saveSeason}>등록</button>
                </div>
              </div>
            </Modal>
        )}
      </div>
  )
}
