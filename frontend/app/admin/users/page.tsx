'use client'

import { useEffect } from 'react'
import { format } from 'date-fns'
import { useAdminStore } from '@/store/adminStore'

export default function AdminUsersPage() {
  const { users, isLoading, error, fetchUsers } = useAdminStore()

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Users</h1>
        <p className="text-velvet-muted text-sm mt-2">Read-only customer overview with order volume.</p>
      </div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-2">Total Orders</div>
          <div className="col-span-2">Joined</div>
        </div>
        <div className="divide-y divide-white/5">
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-12 px-5 py-4 items-center text-sm">
              <div className="col-span-3 text-velvet-white">{user.name}</div>
              <div className="col-span-3 text-velvet-muted">{user.email}</div>
              <div className="col-span-2 text-velvet-muted">{user.phone || '-'}</div>
              <div className="col-span-2 text-velvet-white">{user.totalOrders}</div>
              <div className="col-span-2 text-velvet-muted">{format(new Date(user.createdAt), 'PP')}</div>
            </div>
          ))}
          {!isLoading && users.length === 0 && (
            <div className="px-6 py-10 text-center text-velvet-muted">No users found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
