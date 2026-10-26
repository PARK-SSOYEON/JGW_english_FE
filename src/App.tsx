import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import {AuthProvider, useAuth} from './hooks/useAuth'
import {ToastProvider} from './components/common/Toast'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import SearchPage from './pages/SearchPage'
import CalendarPage from './pages/CalendarPage'
import StudyListPage from './pages/StudyListPage'
import ClassesPage from './pages/ClassesPage'
import WarnedPage from './pages/WarnedPage'
import ManagePage from './pages/ManagePage'
import AttendancePage from './pages/Attendancepage.tsx'
import AdminPage from './pages/AdminPage.tsx'
import NotificationPage from './pages/NotificationPage'
import RetestPage from './pages/RetestPage'
import WeeklyPage from './pages/WeeklyPage'
import {SeasonProvider} from './hooks/useSeason'


function ProtectedRoutes() {
    const {auth, isSuper} = useAuth()

    if (!auth.token) return <Navigate to="/login" replace/>

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<CalendarPage/>}/>
                <Route path="/calendar" element={<Navigate to="/" replace/>}/>
                {/* 학생 조회: 슈퍼 관리자만 */}
                <Route path="/search" element={isSuper ? <SearchPage/> : <Navigate to="/" replace/>}/>
                {/* 현황 페이지: 슈퍼 관리자만 */}
                <Route path="/study-list" element={isSuper ? <StudyListPage/> : <Navigate to="/" replace/>}/>
                <Route path="/retest" element={isSuper ? <RetestPage/> : <Navigate to="/" replace/>}/>
                <Route path="/weekly" element={<WeeklyPage/>}/>
                <Route path="/classes" element={<ClassesPage/>}/>
                <Route path="/warned" element={<WarnedPage/>}/>
                <Route path="/manage" element={<ManagePage/>}/>
                <Route path="/notifications" element={<NotificationPage/>}/>

                {/* 슈퍼 관리자 전용 */}
                <Route path="/attendance" element={<AttendancePage/>}/>
                <Route path="/admin" element={<AdminPage/>}/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </Layout>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SeasonProvider>
                    <ToastProvider>
                        <Routes>
                            <Route path="/login" element={<LoginRouteWrapper/>}/>
                            <Route path="/*" element={<ProtectedRoutes/>}/>
                        </Routes>
                    </ToastProvider>
                </SeasonProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}

function LoginRouteWrapper() {
    const {auth} = useAuth()
    if (auth.token) return <Navigate to="/" replace/>
    return <LoginPage/>
}
