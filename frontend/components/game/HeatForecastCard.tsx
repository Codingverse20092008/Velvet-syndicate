'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, HelpCircle, CheckCircle, BarChart3, CloudSun } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

interface HeatForecastCardProps {
  currentTemp: number
}

export function HeatForecastCard({ currentTemp }: HeatForecastCardProps) {
  const { 
    todayForecast, 
    todayForecastDate, 
    forecastHistory, 
    submitForecast, 
    evaluateForecasts 
  } = useGameStore()
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const hasPredictedToday = todayForecastDate === todayStr

  // Automatically evaluate past predictions on load when temperature is loaded
  useEffect(() => {
    if (currentTemp > 0) {
      const evalResult = evaluateForecasts(currentTemp)
      if (evalResult && evalResult.evaluatedCount > 0) {
        setFeedbackMsg(`Evaluated ${evalResult.evaluatedCount} previous prediction(s). Earned +${evalResult.totalXpEarned} XP!`)
        setTimeout(() => setFeedbackMsg(null), 5000)
      }
    }
  }, [currentTemp, evaluateForecasts])

  const handlePredict = () => {
    if (!selectedOption || hasPredictedToday) return
    const success = submitForecast(selectedOption)
    if (success) {
      setFeedbackMsg('Prediction saved! Come back tomorrow to see if you got it right.')
      setTimeout(() => setFeedbackMsg(null), 5000)
    }
  }

  // Calculate accuracy
  const evaluatedList = forecastHistory.filter(h => h.evaluated)
  const correctCount = evaluatedList.filter(h => h.rewardXp === 50).length
  const accuracyPct = evaluatedList.length > 0 
    ? Math.round((correctCount / evaluatedList.length) * 100) 
    : 0

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-6 relative overflow-hidden">
      
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Daily Prediction Game</p>
        <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white flex items-center gap-2">
          <CloudSun className="w-6 h-6 text-orange-400" />
          Heat Forecast Challenge
        </h3>
        <p className="mt-1 text-sm text-velvet-muted">
          Predict tomorrow's temperature tier. Earn up to +50 XP for a correct tier prediction.
        </p>
      </div>

      {feedbackMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 text-center"
        >
          {feedbackMsg}
        </motion.div>
      )}

      {/* Main interaction card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        
        {hasPredictedToday ? (
          <div className="text-center space-y-3 py-4">
            <span className="text-4xl">🔮</span>
            <h4 className="font-semibold text-velvet-white">Prediction Locked In!</h4>
            <p className="text-xs text-velvet-muted max-w-[280px] mx-auto">
              You predicted <span className="text-orange-400 font-bold">{todayForecast}</span> for tomorrow. 
              We will evaluate it based on tomorrow's temperature check.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-velvet-muted uppercase tracking-wider">Select tomorrow's predicted tier:</p>
            <div className="grid grid-cols-2 gap-2">
              {['35°C', '38°C', '41°C', '44°C+'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelectedOption(opt)}
                  className={`p-3 rounded-xl border text-xs font-semibold uppercase transition-all tracking-wider ${
                    selectedOption === opt
                      ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                      : 'border-white/10 bg-black/20 hover:border-white/30 text-velvet-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={handlePredict}
              disabled={!selectedOption}
              className="w-full py-3.5 rounded-full font-heading text-[10px] uppercase tracking-widest bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:pointer-events-none text-black font-bold transition-all"
            >
              Lock In Prediction
            </button>
          </div>
        )}

      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-[9px] uppercase tracking-[0.24em] text-velvet-muted">Accuracy</p>
          <p className="mt-1 text-xl font-bold text-orange-400">{accuracyPct}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-[9px] uppercase tracking-[0.24em] text-velvet-muted">Total Play</p>
          <p className="mt-1 text-xl font-bold text-velvet-white">{forecastHistory.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-[9px] uppercase tracking-[0.24em] text-velvet-muted">Success</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{correctCount} days</p>
        </div>
      </div>

      {/* History Log */}
      <div className="space-y-3">
        <h4 className="font-heading text-xs uppercase tracking-widest text-velvet-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-velvet-muted" />
          Prediction History
        </h4>
        
        {forecastHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-velvet-muted">
            No forecast submissions yet. Make your first guess!
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden divide-y divide-white/5 max-h-40 overflow-y-auto custom-scrollbar">
            {forecastHistory.map((log, index) => (
              <div key={index} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-medium text-velvet-white">Predicted {log.prediction}</p>
                  <p className="text-[9px] text-velvet-muted">{log.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-velvet-white">
                    {log.evaluated ? `Actual: ${log.actualTemp}°C` : 'Pending'}
                  </p>
                  {log.evaluated && (
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${
                      log.rewardXp === 50 ? 'text-emerald-400' : log.rewardXp === 20 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      +{log.rewardXp} XP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
