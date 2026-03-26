import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/',           label: '학생 조회',     icon: '🔍' },
  { to: '/calendar',   label: '주간 캘린더',   icon: '📅' },
  { to: '/study-list', label: '자습 현황',     icon: '📖' },
  { to: '/classes',    label: '반별 조회',     icon: '🏫' },
  { to: '/warned',     label: '경고 대상자',   icon: '⚠️' },
  { to: '/manage',     label: '관리',     icon: '✏️' },
]

const SUPER_NAV = [
  { to: '/attendance', label: '등원 기록',   icon: '📋' },
  { to: '/admin',      label: '관리자 설정', icon: '⚙️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { auth, logout, isSuper } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
      <div className="flex h-screen bg-gray-50">
        {/* 사이드바 */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-gray-100">
            <h1 className="font-bold text-gray-900 text-base leading-tight">학원 관리</h1>
            <p className="text-xs text-gray-400 mt-0.5">{auth.name} · {auth.role === 'super' ? '슈퍼' : '일반'} 관리자</p>
          </div>
          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} end={to === '/'}
                         className={({ isActive }) =>
                             `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                 isActive
                                     ? 'bg-primary-light text-primary font-medium'
                                     : 'text-gray-600 hover:bg-gray-50'
                             }`
                         }
                >
                  <span className="text-base">{icon}</span>{label}
                </NavLink>
            ))}
            {isSuper && (
                <>
                  <div className="mx-4 my-2 border-t border-gray-100" />
                  {SUPER_NAV.map(({ to, label, icon }) => (
                      <NavLink key={to} to={to}
                               className={({ isActive }) =>
                                   `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                       isActive
                                           ? 'bg-primary-light text-primary font-medium'
                                           : 'text-gray-600 hover:bg-gray-50'
                                   }`
                               }
                      >
                        <span className="text-base">{icon}</span>{label}
                      </NavLink>
                  ))}
                </>
            )}
          </nav>
          <div className="p-3 border-t border-gray-100">
            <button onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              로그아웃
            </button>
          </div>
        </aside>

        {/* 메인 */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
  )
}
