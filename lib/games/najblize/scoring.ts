export const QUESTIONS_PER_ROUND = 5;
export const MAX_SCORE = 100 * QUESTIONS_PER_ROUND;

export type NajblizeQuestion = { question: string; unit: string };
export type NajblizeAnswer = { value: number; source_url: string };

/** Postotna pogreška; kod točnog odgovora 0, a ako je točan odgovor 0, razlika se računa apsolutno. */
export function percentError(guess: number, answer: number): number {
  if (answer === 0) return Math.abs(guess) * 100;
  return (Math.abs(guess - answer) / Math.abs(answer)) * 100;
}

/** max(0, 100 - postotna_pogreška), zaokruženo na cijeli broj. */
export function scoreGuess(guess: number, answer: number): number {
  return Math.round(Math.max(0, 100 - percentError(guess, answer)));
}

export function scoreRound(guesses: number[], answers: number[]): { scores: number[]; total: number } {
  const scores = answers.map((a, i) => scoreGuess(guesses[i], a));
  return { scores, total: scores.reduce((s, x) => s + x, 0) };
}

export function isValidGuesses(guesses: unknown): guesses is number[] {
  return (
    Array.isArray(guesses) &&
    guesses.length === QUESTIONS_PER_ROUND &&
    guesses.every((g) => typeof g === "number" && Number.isFinite(g) && Math.abs(g) < 1e15)
  );
}
