import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/common/Toast'
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


function ProtectedRoutes() {
  const { auth } = useAuth()
  if (!auth.token) return <Navigate to="/login" replace />

  return (
      <Layout>
        <Routes>
          <Route path="/"           element={<SearchPage />} />
          <Route path="/calendar"   element={<CalendarPage />} />
          <Route path="/study-list" element={<StudyListPage />} />
          <Route path="/classes"    element={<ClassesPage />} />
          <Route path="/warned"     element={<WarnedPage />} />
          <Route path="/manage"     element={<ManagePage />} />
          <Route path="/notifications" element={<NotificationPage />} />

            {/* 슈퍼 관리자 전용 */}
          <Route path="/attendance"  element={<AttendancePage />} />
          <Route path="/admin"       element={<AdminPage />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
  )
}

export default function App() {
  return (
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginRouteWrapper />} />
              <Route path="/*"     element={<ProtectedRoutes />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
  )
}

function LoginRouteWrapper() {
  const { auth } = useAuth()
  if (auth.token) return <Navigate to="/" replace />
  return <LoginPage />
}
