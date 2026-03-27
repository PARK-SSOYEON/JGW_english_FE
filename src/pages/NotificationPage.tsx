import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '../lib/api'
import { useToast } from '../components/common/Toast'

interface Notification {
    id: number
    type: 'expired' | 'no_show'
    student_id: number
    student_name: string
    school: string
    grade: number
    schedule_id: number | null
    message: string
    is_read: boolean
    created_at: string
}

export default function NotificationPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    const fetch = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/notifications')
            setNotifications(data)
        } catch {
            toast('불러오기 실패', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetch() }, [])

    const deleteOne = async (id: number) => {
        try {
            await api.delete(`/notifications/${id}`)
            setNotifications(prev => prev.filter(n => n.id !== id))
        } catch {
            toast('삭제 실패', 'error')
        }
    }

    const deleteAll = async () => {
        if (!confirm('모든 알림을 삭제하시겠습니까?')) return
        try {
            await api.delete('/notifications')
            setNotifications([])
            toast('전체 삭제 완료', 'success')
        } catch {
            toast('삭제 실패', 'error')
        }
    }

    // 날짜별 그룹핑
    const grouped = notifications.reduce((acc, n) => {
        const date = n.created_at.slice(0, 10)
        if (!acc[date]) acc[date] = []
        acc[date].push(n)
        return acc
    }, {} as Record<string, Notification[]>)

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

    const TYPE_META = {
        expired: { label: '기한 초과', badge: 'badge-red' },
        no_show: { label: '미등원',    badge: 'badge-amber' },
    }

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">알림</h2>
                    <p className="text-sm text-gray-500 mt-0.5">총 {notifications.length}건</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={fetch}>새로고침</button>
                    {notifications.length > 0 && (
                        <button className="btn-danger btn-sm" onClick={deleteAll}>전체 삭제</button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="card p-8 text-center text-gray-400">불러오는 중...</div>
            ) : notifications.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                    <p className="text-4xl mb-3">🔔</p>
                    <p className="text-sm">알림이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sortedDates.map(date => (
                        <div key={date}>
                            {/* 날짜 헤더 */}
                            <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  {format(parseISO(date), 'yyyy.MM.dd (eee)', { locale: ko })}
                </span>
                                <span className="badge-gray">{grouped[date].length}건</span>
                            </div>

                            {/* 알림 목록 */}
                            <div className="space-y-2">
                                {grouped[date].map(n => {
                                    const meta = TYPE_META[n.type]
                                    return (
                                        <div key={n.id}
                                             className="card px-4 py-3 flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <span className={`${meta.badge} shrink-0 mt-0.5`}>{meta.label}</span>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-800 break-words">{n.message}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {n.created_at.slice(11, 16)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteOne(n.id)}
                                                className="text-gray-300 hover:text-gray-500 shrink-0 text-lg leading-none">
                                                ×
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
