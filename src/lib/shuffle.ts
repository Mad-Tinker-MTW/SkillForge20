// Fisher-Yates shuffle — returns a new shuffled array, never mutates
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pick n random items from array without repeats
export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

// Shuffle the options of a multiple choice question
// keeping track of which option is the correct answer
export function shuffleOptions(
  options: string[],
  correctAnswer: string
): { options: string[]; answer: string } {
  const shuffled = shuffle(options)
  return { options: shuffled, answer: correctAnswer }
}

// Flatten all questions from a CompetencyTest into a single array
export function flattenQuestions(test: import('../types').CompetencyTest) {
  return test.sections.flatMap(s => s.questions)
}

// Get n random questions from a test with shuffled MC options
export function getRandomQuestions(
  test: import('../types').CompetencyTest,
  n: number
): import('../types').CompetencyQuestion[] {
  const all = flattenQuestions(test)
  const picked = sample(all, Math.min(n, all.length))
  return picked.map(q => {
    if (q.options && q.options.length > 1) {
      const { options } = shuffleOptions(q.options, q.answer)
      return { ...q, options }
    }
    return { ...q }
  })
}
