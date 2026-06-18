'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

interface QuizQuestion {
  id: string
  type: 'mcq' | 'fill_blank' | 'true_false' | 'multi_select'
  question: string
  options?: string[]
  correctAnswer: string
  xp?: number
  coins?: number
  explanation?: string
  difficulty?: string
  category?: string
}

interface QuizRendererProps {
  question: QuizQuestion
  onAnswer: (questionId: string, answer: string, isCorrect: boolean) => void
  showResult?: boolean
  disabled?: boolean
}

export function QuizRenderer({ question, onAnswer, showResult: externalShowResult, disabled }: QuizRendererProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [textAnswer, setTextAnswer] = useState<string>('')
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const showResult = externalShowResult !== undefined ? externalShowResult : submitted

  const checkMCQ = (answer: string): boolean => {
    return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
  }

  const checkTrueFalse = (answer: string): boolean => {
    return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
  }

  const checkFillBlank = (answer: string): boolean => {
    const accepted = question.options || [question.correctAnswer]
    return accepted.some(a => a.trim().toLowerCase() === answer.trim().toLowerCase())
  }

  const checkMultiSelect = (selected: string[]): boolean => {
    const correct = question.correctAnswer.split(',').map(a => a.trim().toLowerCase()).sort()
    const user = selected.map(a => a.trim().toLowerCase()).sort()
    return JSON.stringify(user) === JSON.stringify(correct)
  }

  const handleSubmit = () => {
    let correct = false
    let answer = ''

    if (question.type === 'mcq') {
      answer = selectedAnswer
      correct = checkMCQ(selectedAnswer)
    } else if (question.type === 'true_false') {
      answer = selectedAnswer
      correct = checkTrueFalse(selectedAnswer)
    } else if (question.type === 'fill_blank') {
      answer = textAnswer
      correct = checkFillBlank(textAnswer)
    } else if (question.type === 'multi_select') {
      answer = multiSelected.join(',')
      correct = checkMultiSelect(multiSelected)
    }

    setIsCorrect(correct)
    setSubmitted(true)
    onAnswer(question.id, answer, correct)
  }

  const canSubmit = () => {
    if (question.type === 'fill_blank') return textAnswer.trim().length > 0
    if (question.type === 'multi_select') return multiSelected.length > 0
    return selectedAnswer.length > 0
  }

  const toggleMulti = (option: string) => {
    setMultiSelected(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] uppercase tracking-widest text-velvet-muted">
          {question.type === 'mcq' && 'Multiple Choice'}
          {question.type === 'fill_blank' && 'Fill in the Blank'}
          {question.type === 'true_false' && 'True / False'}
          {question.type === 'multi_select' && 'Multi Select'}
        </span>
        {question.difficulty && (
          <span className={`text-[9px] uppercase tracking-wider ${
            question.difficulty === 'easy' ? 'text-emerald-400' :
            question.difficulty === 'hard' ? 'text-red-400' : 'text-amber-400'
          }`}>
            {question.difficulty}
          </span>
        )}
      </div>

      {/* Question Text */}
      <p className="text-base text-velvet-white leading-relaxed">{question.question}</p>

      {/* MCQ */}
      {question.type === 'mcq' && question.options && (
        <div className="space-y-3">
          {question.options.map((opt, i) => {
            const isSelected = selectedAnswer === opt
            const isCorrectOption = showResult && opt.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            const isWrongOption = showResult && isSelected && !isCorrectOption

            return (
              <button
                key={i}
                onClick={() => !disabled && !submitted && setSelectedAnswer(opt)}
                disabled={disabled || submitted}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected && !showResult ? 'border-orange-500/50 bg-orange-500/10' :
                  isCorrectOption && showResult ? 'border-emerald-500/50 bg-emerald-500/10' :
                  isWrongOption && showResult ? 'border-red-500/50 bg-red-500/10' :
                  'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-orange-500 text-black' : 'border-white/20 text-velvet-muted'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm text-velvet-white">{opt}</span>
                  {isCorrectOption && showResult && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                  {isWrongOption && showResult && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* True / False */}
      {question.type === 'true_false' && (
        <div className="grid grid-cols-2 gap-4">
          {['true', 'false'].map(val => {
            const isSelected = selectedAnswer === val
            const isCorrectOption = showResult && val === question.correctAnswer.toLowerCase()
            const isWrongOption = showResult && isSelected && !isCorrectOption

            return (
              <button
                key={val}
                onClick={() => !disabled && !submitted && setSelectedAnswer(val)}
                disabled={disabled || submitted}
                className={`p-6 rounded-xl border text-center transition-all ${
                  isSelected && !showResult ? 'border-orange-500/50 bg-orange-500/10' :
                  isCorrectOption && showResult ? 'border-emerald-500/50 bg-emerald-500/10' :
                  isWrongOption && showResult ? 'border-red-500/50 bg-red-500/10' :
                  'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className="text-lg font-bold text-velvet-white uppercase tracking-wide">
                  {val === 'true' ? 'True' : 'False'}
                </p>
                {isCorrectOption && showResult && <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mt-2" />}
                {isWrongOption && showResult && <XCircle className="w-5 h-5 text-red-400 mx-auto mt-2" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Fill in the Blank */}
      {question.type === 'fill_blank' && (
        <div className="space-y-3">
          <input
            type="text"
            value={textAnswer}
            onChange={e => setTextAnswer(e.target.value)}
            disabled={disabled || submitted}
            placeholder="Type your answer..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-velvet-white placeholder:text-velvet-muted/50 focus:outline-none focus:border-orange-500/50 transition-all"
          />
          {showResult && (
            <div className={`flex items-center gap-2 text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`}
            </div>
          )}
        </div>
      )}

      {/* Multi Select */}
      {question.type === 'multi_select' && question.options && (
        <div className="space-y-3">
          <p className="text-xs text-velvet-muted">Select all that apply:</p>
          {question.options.map((opt, i) => {
            const isSelected = multiSelected.includes(opt)
            const isCorrectOption = showResult && question.correctAnswer.split(',').map(a => a.trim().toLowerCase()).includes(opt.trim().toLowerCase())
            const isWrongOption = showResult && isSelected && !isCorrectOption

            return (
              <button
                key={i}
                onClick={() => !disabled && !submitted && toggleMulti(opt)}
                disabled={disabled || submitted}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected && !showResult ? 'border-orange-500/50 bg-orange-500/10' :
                  isCorrectOption && showResult ? 'border-emerald-500/50 bg-emerald-500/10' :
                  isWrongOption && showResult ? 'border-red-500/50 bg-red-500/10' :
                  'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-white/20'
                  }`}>
                    {isSelected && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-velvet-white">{opt}</span>
                  {isCorrectOption && showResult && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                  {isWrongOption && showResult && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Submit Button */}
      {!submitted && !disabled && (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className={`w-full py-4 rounded-full text-[10px] uppercase tracking-[0.24em] font-bold transition-all ${
            canSubmit()
              ? 'bg-velvet-white text-velvet-black hover:bg-white/90'
              : 'bg-white/5 text-velvet-muted cursor-not-allowed'
          }`}
        >
          Submit Answer
        </button>
      )}

      {/* Result & Explanation */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className={`flex items-center gap-2 p-4 rounded-xl ${
              isCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>

            {question.explanation && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-300">{question.explanation}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
