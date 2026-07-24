import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui'

export default function Messages() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500 text-sm mt-1">Conversations with employers</p>
      </div>
      <EmptyState
        icon={MessageSquare}
        title="No messages yet"
        description="When an employer contacts you about an application, your conversations will show up here"
      />
    </div>
  )
}
