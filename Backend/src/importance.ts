// backend/src/lib/importance.ts
import { openai } from './OpenaiClient';

export type ImportanceResult = { important: boolean; reason?: string };

export async function classifyImportance(content: string): Promise<ImportanceResult> {
  const input = (content ?? '').slice(0, 2000);
  const sys =
    'You are a classifier for coaching chats. Output only JSON.\n' +
    'An incoming message is important iff it will change future coaching decisions:\n' +
    '1) Plan creation/updates\n' +
    '2) Circumstance changes (schedule/time/location, travel, equipment)\n' +
    '3) Health changes (injury, acute pain, illness, surgery, pregnancy, meds)\n' +
    '4) Deadlines/events\n' +
    '5) Adherence blockers\n' +
    '6) Urgent/time-sensitive needs\n' +
    'Return: {"important": boolean, "reason": string} (reason ≤ 15 words). Output JSON only.';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 80,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: input }
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    const important = !!parsed?.important;
    const reason =
      typeof parsed?.reason === 'string' ? String(parsed.reason).slice(0, 120) : undefined;

    return { important, reason };
  } catch {
    const t = input.toLowerCase();
    const important =
      /\b(plan|program|schedule|routine)\b.*\b(update|change|revise|new)\b/.test(t) ||
      /\b(travel|flight|hotel|moving|schedule|shift|gym|equipment)\b/.test(t) ||
      /\b(injury|pain|sprain|fracture|surgery|ill|covid|pregnan|medicat|seizure|epilep|stroke|heart attack|fainted|emergency|er|a&e)\b/.test(t) ||
      /\b(race|meet|competition|deadline|exam|event)\b/.test(t) ||
      /\b(missed|skipped|burn(ed)? out|can'?t complete|blocked)\b/.test(t) ||
      /\b(urgent|asap|today|tomorrow|need.*now)\b/.test(t);

    return { important, reason: 'fallback' };
  }
}

// Export default too so either `import { classifyImportance }` or `import classifyImportance` works
export default classifyImportance;
