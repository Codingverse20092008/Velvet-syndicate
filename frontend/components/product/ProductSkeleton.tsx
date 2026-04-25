'use client'

import React from 'react'

export function ProductSkeleton() {
  return (
    <div className="space-y-6">
      <div className="aspect-[4/5] w-full bg-neutral-900 animate-pulse rounded-sm" />
      <div className="space-y-2">
        <div className="h-4 w-2/3 bg-neutral-900 animate-pulse rounded-sm" />
        <div className="h-3 w-1/4 bg-neutral-900 animate-pulse rounded-sm" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  )
}
