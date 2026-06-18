const LAUNCH_DATE_STR =
  process.env.NEXT_PUBLIC_VELVET_VAULT_LAUNCH_DATE ||
  process.env.VELVET_VAULT_LAUNCH_DATE ||
  '2026-06-20T12:00:00+05:30'

const _LAUNCH_DATE = new Date(LAUNCH_DATE_STR)

export const TIMEZONE = 'Asia/Kolkata'

export function getLaunchDate(): Date {
  return _LAUNCH_DATE
}

export function isVaultLive(): boolean {
  const now = new Date()
  return now >= _LAUNCH_DATE
}

export function getRemainingTime(): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date()
  const diff = _LAUNCH_DATE.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds }
}

export function canAccessVault(user: { role?: string } | null): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return isVaultLive()
}

export function getLaunchDateString(): string {
  return _LAUNCH_DATE.toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function getLaunchDateISO(): string {
  return _LAUNCH_DATE.toISOString()
}