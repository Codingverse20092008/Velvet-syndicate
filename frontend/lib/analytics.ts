export const trackEvent = (name: string, properties?: Record<string, any>) => {
  // In a real app, this would send to Segment, PostHog, or GA4
  console.log(`[Analytics] ${name}`, properties)
  
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, properties)
  }
}
