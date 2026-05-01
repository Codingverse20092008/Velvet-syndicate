'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Bell, Shield, CreditCard, Truck, Save } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface ShippingSettings {
  freeShippingThreshold: number
  standardShippingFee: number
  deliveryEstimate: string
  enableCOD: boolean
  codVerificationRequired: boolean
  maxCODOrderValue: number
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'shipping'>('general')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<ShippingSettings>({
    freeShippingThreshold: 0,
    standardShippingFee: 20,
    deliveryEstimate: '7-8',
    enableCOD: true,
    codVerificationRequired: false,
    maxCODOrderValue: 50000,
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch('/admin/settings')
        if (res.ok) {
          const data = await res.json()
          if (data?.success && data?.data) {
            setSettings(prev => ({...prev, ...data.data}))
          }
        }
      } catch (err) {
        console.error('Failed to load settings', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'shipping', label: 'Shipping', icon: Truck },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Admin Settings</h1>
        <p className="text-velvet-muted text-sm mt-2">Configure store settings and preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'text-velvet-accent border-b-2 border-velvet-accent'
                : 'text-velvet-muted hover:text-velvet-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Store Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Store Name</label>
                <input
                  type="text"
                  defaultValue="Velvet Syndicate"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Contact Email</label>
                <input
                  type="email"
                  defaultValue="admin@velvetsyndicate.com"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Support Phone</label>
                <input
                  type="tel"
                  defaultValue="+91 98765 43210"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Currency & Pricing</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Currency</label>
                <select className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white">
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  defaultValue="18"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Email Notifications</h3>
            <div className="space-y-3">
              {[
                'New order received',
                'Order status updated',
                'Low stock alert',
                'New user registration',
                'Customer feedback received',
              ].map((item, idx) => (
                <label key={idx} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-white/30 bg-black text-velvet-accent" />
                  <span className="text-sm text-velvet-white">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Admin Access</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">New Password</label>
                <input
                  type="password"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-velvet-white">Enable 2FA</div>
                <div className="text-xs text-velvet-muted">Require verification code on login</div>
              </div>
              <button className="px-4 py-2 bg-white/10 text-velvet-white text-xs rounded-lg hover:bg-white/20 transition-colors">
                Setup 2FA
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shipping */}
      {activeTab === 'shipping' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Shipping Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Free Shipping Threshold</label>
                <input
                  type="number"
                  defaultValue="0"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
                <div className="text-xs text-velvet-muted mt-1">Set to 0 for always free shipping</div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Standard Shipping Fee (₹)</label>
                <input
                  type="number"
                  value={settings.standardShippingFee}
                  onChange={(e) => setSettings({...settings, standardShippingFee: Number(e.target.value)})}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Delivery Estimate (Days)</label>
                <input
                  type="text"
                  value={settings.deliveryEstimate}
                  onChange={(e) => setSettings({...settings, deliveryEstimate: e.target.value})}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">COD Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.enableCOD}
                  onChange={(e) => setSettings({...settings, enableCOD: e.target.checked})}
                  className="w-4 h-4 rounded border-white/30 bg-black text-velvet-accent" 
                />
                <span className="text-sm text-velvet-white">Enable Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.codVerificationRequired}
                  onChange={(e) => setSettings({...settings, codVerificationRequired: e.target.checked})}
                  className="w-4 h-4 rounded border-white/30 bg-black text-velvet-accent" 
                />
                <span className="text-sm text-velvet-white">COD verification call required</span>
              </label>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2 mt-4">Max COD Order Value</label>
                <input
                  type="number"
                  value={settings.maxCODOrderValue}
                  onChange={(e) => setSettings({...settings, maxCODOrderValue: Number(e.target.value)})}
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={async () => {
            setIsSaving(true)
            try {
              const res = await apiFetch('/admin/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
              })
              if (res.ok) {
                alert('Settings saved successfully!')
              } else {
                alert('Failed to save settings')
              }
            } catch (err) {
              alert('Error saving settings')
            } finally {
              setIsSaving(false)
            }
          }}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-velvet-accent text-black rounded-xl text-sm font-medium disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
