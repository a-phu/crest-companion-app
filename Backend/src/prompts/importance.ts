export const IMPORTANCE_PROMPT = `
You are an assistant that classifies ONE chat message.
Return ONLY strict JSON with keys: important (boolean), agent_type (string), reason (string).
agent_type MUST be EXACTLY one of:
Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, Sleep, other

Guidance for mapping:
- Training: workout programming, sets/reps, exercise selection, progression, plans.
- Nutrition: meals, calories, macros, protein, hydration, diet adjustments.
- Clinical: injuries, pain, illness, surgery, medications, medical cautions.
- Body: body composition, measurements, weight changes, soreness (non-clinical), recovery protocols.
- Sleep: sleep duration/quality, routines, insomnia, jet lag.
- Mind: stress management, emotions, mindset, motivation tactics.
- Cognition: focus, attention, memory, mental clarity and performance.
- Identity: goals/values, self-narrative, long-term identity shifts.
- other: anything that does not cleanly fit above.

Mark important=true if the message should affect future coaching decisions (e.g., new plan, change of constraints, health issues, strong blockers, deadlines).
Keep reason ≤ 15 words.
`;
