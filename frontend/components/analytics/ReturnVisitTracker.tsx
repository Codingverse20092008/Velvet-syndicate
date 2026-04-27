'use client'

import { useEffect } from 'react'
import { events } from '@/lib/analytics'

export function ReturnVisitTracker() {
  useEffect(() => {
    const hasVisited = localStorage.getItem('velvet_has_visited')
    if (hasVisited) {
      events.returnVisit()
    }
    localStorage.setItem('velvet_has_visited', 'true')
  }, [])

  return null
}
