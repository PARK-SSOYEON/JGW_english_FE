import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useSeason } from '../../hooks/useSeason'

const NAV = [
    { to: '/',              label: '학생 조회',   icon: '🔍' },
    { to: '/calendar',      label: '주간 캘린더', icon: '📅' },
    { to: '/study-list',    label: '자습 현황',   icon: '📖' },
    { to: '/retest',        label: '재시험 현황', icon: '📝' },
    { to: '/weekly',        label: '주차별 현황', icon: '📋' },
    { to: '/classes',       label: '반별 조회',   icon: '🏫' },
    { to: '/warned',        label: '경고 대상자', icon: '⚠️' },
    { to: '/manage',        label: '학생 관리',   icon: '✏️' },
    { to: '/notifications', label: '알림',        icon: '🔔' },
]

const SUPER_NAV = [
    { to: '/attendance', label: '등원 기록',   icon: '📋' },
    { to: '/admin',      label: '관리자 설정', icon: '⚙️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
    const { auth, logout, isSuper } = useAuth()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const { season, seasons, setSeason } = useSeason()

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const { data } = await api.get('/notifications')
                setUnreadCount(data.length)
            } catch {}
        }
        fetchCount()
        const interval = setInterval(fetchCount, 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const handleLogout = () => { logout(); navigate('/login') }

    const NavItem = ({ to, label, icon }: { to: string; label: string; icon: string }) => (
        <NavLink to={to} end={to === '/'}
                 onClick={() => setMobileOpen(false)}
                 className={({ isActive }) =>
                     `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                         isActive
                             ? 'bg-primary-light text-primary font-medium'
                             : 'text-gray-600 hover:bg-gray-50'
                     }`
                 }>
            <span className="text-base">{icon}</span>
            <span>{label}</span>
            {to === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto badge-red text-[10px] px-1.5 py-0.5">{unreadCount}</span>
            )}
        </NavLink>
    )

    return (
        <div className="flex h-screen bg-gray-50">
            {/* 모바일 오버레이 */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                     onClick={() => setMobileOpen(false)} />
            )}

            {/* 사이드바 */}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-56 bg-white border-r border-gray-200 flex flex-col shrink-0
        transform transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-gray-100">
                    <h1 className="font-bold text-gray-900 text-base leading-tight">정기원영어학원</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {auth.name} · {auth.role === 'super' ? '슈퍼' : '일반'} 관리자
                    </p>
                </div>

                {/* 시즌 선택 */}
                <div className="px-3 py-2 border-b border-gray-100">
                    <select
                        className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                        value={season?.id || ''}
                        onChange={(e) => {
                            const selected = seasons.find(s => s.id === Number(e.target.value))
                            if (selected) setSeason(selected)
                        }}>
                        {seasons.length === 0 && <option value="">시즌 없음</option>}
                        {seasons.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name}{s.is_active ? ' ✓' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <nav className="flex-1 py-3 overflow-y-auto">
                    {NAV.map((item) => <NavItem key={item.to} {...item} />)}
                    {isSuper && (
                        <>
                            <div className="mx-4 my-2 border-t border-gray-100" />
                            {SUPER_NAV.map((item) => <NavItem key={item.to} {...item} />)}
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
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* 모바일 상단 헤더 */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
                    <button onClick={() => setMobileOpen(true)}
                            className="text-gray-600 text-xl">☰</button>
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-gray-900 text-sm">학원 관리</h1>
                        {season && (
                            <span className="text-[10px] text-gray-400">{season.name}</span>
                        )}
                    </div>
                    <NavLink to="/notifications" className="relative text-xl">
                        🔔
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
                        )}
                    </NavLink>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
