export interface ValidationError {
  questionNumber: number
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  packName: string
  description: string
  category: string
  difficulty: string
  reward?: Record<string, any>
  questionCount: number
  totalXp: number
  totalCoins: number
  previewQuestions: any[]
}

const SUPPORTED_TYPES = ['mcq', 'fill_blank', 'true_false', 'multi_select'] as const
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const

export function validateQuizPack(jsonData: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!jsonData || typeof jsonData !== 'object') {
    return {
      valid: false,
      errors: [{ questionNumber: 0, field: 'root', message: 'Invalid JSON: Root must be an object' }],
      packName: '',
      description: '',
      category: '',
      difficulty: '',
      questionCount: 0,
      totalXp: 0,
      totalCoins: 0,
      previewQuestions: [],
    }
  }

  if (!jsonData.packName || typeof jsonData.packName !== 'string' || jsonData.packName.trim() === '') {
    errors.push({ questionNumber: 0, field: 'packName', message: 'Missing or empty packName' })
  }

  if (!jsonData.category || typeof jsonData.category !== 'string' || jsonData.category.trim() === '') {
    errors.push({ questionNumber: 0, field: 'category', message: 'Missing or empty category' })
  }

  if (jsonData.difficulty && !VALID_DIFFICULTIES.includes(jsonData.difficulty)) {
    errors.push({ questionNumber: 0, field: 'difficulty', message: `Invalid difficulty: ${jsonData.difficulty}. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` })
  }

  if (!Array.isArray(jsonData.questions) || jsonData.questions.length === 0) {
    errors.push({ questionNumber: 0, field: 'questions', message: 'Missing or empty questions array' })
    return {
      valid: false,
      errors,
      packName: jsonData.packName || '',
      description: jsonData.description || '',
      category: jsonData.category || '',
      difficulty: jsonData.difficulty || 'mixed',
      questionCount: 0,
      totalXp: 0,
      totalCoins: 0,
      previewQuestions: [],
    }
  }

  const seenQuestions = new Set<string>()
  let totalXp = 0
  let totalCoins = 0

  jsonData.questions.forEach((q: any, index: number) => {
    const qNum = index + 1

    if (!q.type || !SUPPORTED_TYPES.includes(q.type)) {
      errors.push({ questionNumber: qNum, field: 'type', message: `Unsupported type: "${q.type || 'missing'}". Supported: ${SUPPORTED_TYPES.join(', ')}` })
    }

    if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
      errors.push({ questionNumber: qNum, field: 'question', message: 'Missing or empty question text' })
    }

    if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '') {
      errors.push({ questionNumber: qNum, field: 'correctAnswer', message: 'Missing correctAnswer' })
    }

    if (q.type === 'mcq' || q.type === 'multi_select') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push({ questionNumber: qNum, field: 'options', message: `MCQ/Multi-Select requires at least 2 options, got ${q.options?.length || 0}` })
      }
      if (q.type === 'mcq' && q.correctAnswer !== undefined && Array.isArray(q.options) && !q.options.includes(q.correctAnswer)) {
        errors.push({ questionNumber: qNum, field: 'correctAnswer', message: 'correctAnswer must be one of the provided options' })
      }
    }

    if (q.type === 'true_false') {
      const tf = String(q.correctAnswer).toLowerCase()
      if (tf !== 'true' && tf !== 'false') {
        errors.push({ questionNumber: qNum, field: 'correctAnswer', message: 'True/False correctAnswer must be "true" or "false"' })
      }
    }

    if (q.xp !== undefined && (typeof q.xp !== 'number' || q.xp < 0)) {
      errors.push({ questionNumber: qNum, field: 'xp', message: 'XP must be a non-negative number' })
    }
    if (q.coins !== undefined && (typeof q.coins !== 'number' || q.coins < 0)) {
      errors.push({ questionNumber: qNum, field: 'coins', message: 'Coins must be a non-negative number' })
    }

    if (q.question && typeof q.question === 'string') {
      const normalized = q.question.trim().toLowerCase()
      if (seenQuestions.has(normalized)) {
        errors.push({ questionNumber: qNum, field: 'question', message: 'Duplicate question' })
      }
      seenQuestions.add(normalized)
    }

    if (!q.question || q.question.trim() === '' || !q.correctAnswer) {
      errors.push({ questionNumber: qNum, field: 'question', message: 'Empty question or answer' })
    }

    totalXp += q.xp && typeof q.xp === 'number' ? q.xp : 10
    totalCoins += q.coins && typeof q.coins === 'number' ? q.coins : 0
  })

  const previewQuestions = jsonData.questions.slice(0, 10).map((q: any) => ({
    number: jsonData.questions.indexOf(q) + 1,
    type: q.type,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    xp: q.xp || 10,
    coins: q.coins || 0,
    explanation: q.explanation,
    difficulty: q.difficulty || 'medium',
  }))

  return {
    valid: errors.length === 0,
    errors,
    packName: jsonData.packName || '',
    description: jsonData.description || '',
    category: jsonData.category || '',
    difficulty: jsonData.difficulty || 'mixed',
    reward: jsonData.reward,
    questionCount: jsonData.questions.length,
    totalXp,
    totalCoins,
    previewQuestions,
  }
}
