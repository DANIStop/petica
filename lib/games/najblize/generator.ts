import { QUESTIONS_PER_ROUND } from "./scoring";

export type RawQuestion = {
  question: string;
  unit: string;
  answer: number;
  source_url: string;
  difficulty: number;
};

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidRaw(q: unknown): q is RawQuestion {
  const r = q as RawQuestion;
  return (
    !!r &&
    typeof r.question === "string" &&
    r.question.trim().length > 5 &&
    typeof r.unit === "string" &&
    typeof r.answer === "number" &&
    Number.isFinite(r.answer) &&
    typeof r.source_url === "string" &&
    /^https?:\/\//.test(r.source_url) &&
    Number.isInteger(r.difficulty) &&
    r.difficulty >= 1 &&
    r.difficulty <= 5
  );
}

/** Odbacuje neispravna pitanja i duplikate (među postojećima i unutar serije). */
export function filterNew(batch: unknown[], existingNormalized: Set<string>): RawQuestion[] {
  const seen = new Set(existingNormalized);
  const out: RawQuestion[] = [];
  for (const q of batch) {
    if (!isValidRaw(q)) continue;
    const key = normalizeQuestion(q.question);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** Grupira pitanja u runde od 5; ostatak koji ne puni rundu se odbacuje. */
export function toRounds(questions: RawQuestion[]) {
  const rounds = [];
  for (let i = 0; i + QUESTIONS_PER_ROUND <= questions.length; i += QUESTIONS_PER_ROUND) {
    const chunk = questions.slice(i, i + QUESTIONS_PER_ROUND);
    rounds.push({
      payload: { questions: chunk.map((q) => ({ question: q.question, unit: q.unit })) },
      answer: { answers: chunk.map((q) => ({ value: q.answer, source_url: q.source_url })) },
      source_url: chunk[0].source_url,
      difficulty: Math.round(chunk.reduce((s, q) => s + q.difficulty, 0) / chunk.length),
    });
  }
  return rounds;
}
