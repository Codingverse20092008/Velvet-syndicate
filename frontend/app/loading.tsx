export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] transition-opacity">
      {/* Top minimal loading bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent animate-pulse" />
      
      {/* Subtle small dark spinner */}
      <div className="p-3 rounded-full bg-[#121212]/90 border border-white/10 shadow-2xl flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#C5A059] animate-spin" />
      </div>
    </div>
  )
}
