// backend/src/routes/chat.ts

import { Router } from 'express';
import { supa } from '../supabase';          // Server-side Supabase client (uses service role key)
import { openai } from '../OpenaiClient';    // OpenAI client (uses OPENAI_API_KEY)
import { HUMAN_ID, AI_ID } from '../id';     // Fixed UUIDs for your demo human + AI
import { classifyImportance } from '../importance'; // Importance classification helper
const router = Router();

/**
 * Lightweight ping to confirm that this router is mounted under /api/chat.
 * Use in Postman: GET http://localhost:8080/api/chat/__ping
 */
router.get('/__ping', (_req, res) => res.json({ ok: true, scope: 'chat' }));

/**
 * POST /api/chat
 * Body: { "text": string }
 *
 * Flow:
 *  1) Validate input.
 *  2) Insert the user's message into DB (human → AI).
 *  3) Kick off importance classification for the user message (in parallel - have added async to prevent blockers).
 *  4) Load recent conversation to build context for the model.
 *  5) Call OpenAI to get the assistant reply.
 *  6) Classify importance for the AI reply (in parallel with finalizing user importance).
 *  7) Update the user row's is_important if needed.
 *  8) Insert the AI reply with its own is_important flag.
 *  9) Return the reply (and a small meta payload for debugging/testing).
 */
router.post('/', async (req, res) => {
  try {
    // --- 1) Validate input ---------------------------------------------------
    // Normalize to string and trim whitespace. Empty input is a 400 (client) error.
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });

    // --- 2) Persist the USER message ----------------------------------------
    // We insert first so the message exists in the DB even if the model call fails.
    // SELECT ... .single() returns the inserted row; here we only need the message_id.
    const u = await supa
      .from('message')
      .insert({ sender_id: HUMAN_ID, receiver_id: AI_ID, content: text })
      .select('message_id')
      .single();
    if (u.error) throw u.error; // handle FK, RLS, or other DB errors early

    // --- 3) Start importance classification for the USER message ------------
    // We kick this off in parallel so it runs while we prepare context/call OpenAI.
    // The try/catch wrapper ensures classification never breaks the chat flow.
    const userImpP = (async () => {
      try {
        return await classifyImportance(text);
      } catch {
        return { important: false as const };
      }
    })();

    // --- 4) Build short context for the model --------------------------------
    // We fetch the last N turns (both directions) oldest→newest, so the model
    // sees a coherent conversation history. Keep this small to control token usage.
    const recent = await supa
      .from('message')
      .select('sender_id, content')
      .or(
        // Conversation is exactly Human <-> AI (your two fixed UUIDs)
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .order('created_at', { ascending: true })
      .limit(20);
    if (recent.error) throw recent.error;

    // Convert DB rows into OpenAI "chat" message format.
    // - role: 'user' for human messages; 'assistant' for AI messages.
    // - Prepend a concise system prompt to steer tone & length.
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a concise, kind fitness & wellbeing companion. Keep replies short and practical.'
      },
      ...(recent.data ?? []).map(r => ({
        role: r.sender_id === HUMAN_ID ? ('user' as const) : ('assistant' as const),
        content: r.content
      }))
    ];

    // --- 5) Call OpenAI for the assistant reply ------------------------------
    // Use a compact model + small max_tokens to keep responses tight for MVP.
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,   // lower = more deterministic
      max_tokens: 300,    // short, practical replies
      messages
    });

    // Defensive: if the API returns no content, use a friendly fallback.
    const reply = resp.choices?.[0]?.message?.content?.trim() || 'Sorry, I had trouble replying.';

    // --- 6) Classify the AI reply importance (in parallel with userImp) -----
    // Running both in Promise.all resolves userImpP and AI classification together.
    const [userImp, aiImp] = await Promise.all([
      userImpP,
      (async () => {
        try {
          return await classifyImportance(reply);
        } catch {
          return { important: false as const };
        }
      })()
    ]);

    // --- 7) Update USER row with is_important if needed ----------------------
    // We update only if the classifier returned true. This is a separate write
    // so that even if classification fails, the user message was still saved.
    if (userImp.important) {
      await supa
        .from('message')
        .update({ is_important: true })
        .eq('message_id', u.data!.message_id);
    }

    // --- 8) Persist the AI reply with its own is_important -------------------
    // Insert the assistant response, committing the AI-side importance flag.
    const a = await supa
      .from('message')
      .insert({
        sender_id: AI_ID,
        receiver_id: HUMAN_ID,
        content: reply,
        is_important: !!aiImp.important
      })
      .select('message_id')
      .single();
    if (a.error) throw a.error;

    // --- 9) Return the reply (plus meta flags for easy testing in Postman) ---
    res.json({
      reply,
      meta: {
        userImportant: !!userImp.important,
        aiImportant: !!aiImp.important
      }
    });
  } catch (e: any) {
    // All unexpected errors end up here — return 500 with a clear message.
    // Common cases: Supabase connection/permission issue, malformed env, OpenAI errors not caught above.
    res.status(500).json({ error: e.message || 'unknown error' });
  }
});

export default router;
