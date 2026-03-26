import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Admin, Class } from '../types'
import { useToast } from '../components/common/Toast'
import { DOW_LABELS, SCHOOL_OPTIONS } from '../lib/utils'
import Modal from '../components/common/Modal'

export default function AdminPage() {
  const [tab, setTab] = useState<'admins' | 'classes'>('admins')
  const [admins, setAdmins] = useState<Admin[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const toast = useToast()

  // 관리자 폼
  const [adminModal, setAdminModal] = useState<'new' | Admin | null>(null)
  const [adminName, setAdminName] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [adminRole, setAdminRole] = useState<'admin' | 'super'>('admin')

  // 반 폼
  const [classModal, setClassModal] = useState(false)
  const [className, setClassName] = useState('')
  const [classSchool, setClassSchool] = useState<'유신고' | '창현고'>('유신고')
  const [classGrade, setClassGrade] = useState<1 | 2>(1)
  const [classDow, setClassDow] = useState(1)

  const fetchAdmins = async () => {
    try { const { data } = await api.get('/admins'); setAdmins(data) }
    catch { toast('불러오기 실패', 'error') }
  }
  const fetchClasses = async () => {
    try { const { data } = await api.get('/classes'); setClasses(data) }
    catch { toast('불러오기 실패', 'error') }
  }

  useEffect(() => { fetchAdmins(); fetchClasses() }, [])

  const openAdminEdit = (a: Admin) => {
    setAdminModal(a)
    setAdminName(a.name)
    setAdminCode('')
    setAdminRole(a.role)
  }

  const openAdminNew = () => {
    setAdminModal('new')
    setAdminName('')
    setAdminCode('')
    setAdminRole('admin')
  }

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
      await api.post('/classes', { name: className, school: classSchool, grade: classGrade, day_of_week: classDow })
      toast('반 등록 완료', 'success')
      setClassModal(false)
      setClassName('')
      fetchClasses()
    } catch (e: any) {
      toast(e.response?.data?.error || '오류 발생', 'error')
    }
  }

  const deleteClass = async (c: Class) => {
    if (!confirm(`${c.name} 반을 삭제하시겠습니까?\n소속 학생들의 반 배정이 해제됩니다.`)) return
    try {
      await api.delete(`/classes/${c.id}`)
      toast('삭제 완료', 'success')
      fetchClasses()
    } catch { toast('오류 발생', 'error') }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">관리자 설정</h2>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([['admins', '관리자 관리'], ['classes', '반 관리']] as const).map(([key, label]) => (
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
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => setClassModal(true)}>+ 반 등록</button>
          </div>
          {(['유신고', '창현고'] as const).map((school) => (
            <div key={school} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{school}</h3>
              <div className="space-y-2">
                {classes.filter((c) => c.school === school).map((c) => (
                  <div key={c.id} className="card px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="badge-blue">{c.grade}학년</span>
                      <span className="text-xs text-gray-400">{DOW_LABELS[c.day_of_week]}요일</span>
                    </div>
                    <button className="btn-danger btn-sm" onClick={() => deleteClass(c)}>삭제</button>
                  </div>
                ))}
                {classes.filter((c) => c.school === school).length === 0 && (
                  <div className="card p-4 text-center text-sm text-gray-400">반이 없습니다.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 관리자 등록/수정 모달 */}
      {adminModal && (
        <Modal
          title={adminModal === 'new' ? '관리자 등록' : `${(adminModal as Admin).name} 수정`}
          onClose={() => setAdminModal(null)}
          size="sm"
        >
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
                onChange={(e) => setClassName(e.target.value)} placeholder="예: 유신고 1학년 월요반" />
            </div>
            <div>
              <label className="label">학교</label>
              <div className="flex gap-2">
                {SCHOOL_OPTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setClassSchool(s)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      classSchool === s
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
                {([1, 2] as const).map((g) => (
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
                {DOW_LABELS.map((d, i) => (
                  <button key={i} type="button" onClick={() => setClassDow(i)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      classDow === i
                        ? 'bg-primary-light border-primary text-primary font-medium'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button className="btn-secondary" onClick={() => setClassModal(false)}>취소</button>
              <button className="btn-primary" onClick={saveClass}>등록</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
