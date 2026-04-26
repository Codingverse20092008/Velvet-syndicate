'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') || 
                             this.state.error?.message?.toLowerCase().includes('fetch')
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h1 className="font-heading text-3xl mb-4 uppercase tracking-widest">
            {isNetworkError ? 'Connection Interrupted' : 'An Unspoken Error'}
          </h1>
          <p className="text-velvet-muted mb-8 italic">
            {isNetworkError 
              ? 'The syndicate vault is momentarily unreachable. Please check your connection.'
              : 'The vault encountered a rare internal anomaly. Our artisans are informed.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 border border-white/20 text-[10px] tracking-[0.3em] uppercase hover:bg-white/5 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
