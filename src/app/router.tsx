import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { MainLayout } from '@/layouts/MainLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { KPIPage } from '@/pages/KPIPage'
import { MeetingsPage } from '@/pages/MeetingsPage'
import { MeetingDetailPage } from '@/pages/MeetingDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { TaskHistoryPage } from '@/pages/TaskHistoryPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/history" element={<TaskHistoryPage />} />
          <Route path="kpi" element={<KPIPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="meetings/:meetingId" element={<MeetingDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
