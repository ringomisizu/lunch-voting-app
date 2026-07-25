import { verifySessionCookie } from '@/lib/session'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'
export const metadata = { title: '管理画面' }

export default async function AdminPage() {
  const isAuthenticated = await verifySessionCookie('admin')

  if (!isAuthenticated) {
    return <AdminLoginForm />
  }

  return <AdminDashboard />
}
