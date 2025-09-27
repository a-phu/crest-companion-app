// backend/src/routes/insights.ts
import { Router } from 'express';
import { supa } from '../supabase';
import { HUMAN_ID, AI_ID } from '../id';
import { openai } from '../OpenaiClient';

const router = Router();

/** sanity ping */
router.get('/__ping', (_req, res) => res.json({ ok: true, scope: 'insights' }));

/**
 * GET /api/insights
 * Analyzes recent conversation history to generate personalized wellness insights
 * Returns structured data for ObservationsModule, NextActionsModule, and RevealModule
 */
router.get('/', async (_req, res) => {
  try {
    // Get conversation history from last 30 days, prioritizing important messages
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages, error } = await supa
      .from('message')
      .select('*')
      .or(
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!messages || messages.length === 0) {
      // Return default insights if no conversation history, not working at the moment
      return res.json({
        observations: {
          sleep: "Start tracking your sleep patterns by sharing how you feel each morning.",
          nutrition: "Tell me about your meals and eating habits to get personalized nutrition insights.",
          mood: "Share your daily mood and energy levels to identify patterns.",
          cognition: "Discuss your focus, memory, and mental clarity to optimize cognitive performance."
        },
        nextActions: [
          {
            title: "Begin Your Wellness Journey",
            text: "Start by sharing your current sleep schedule and how you typically feel in the mornings."
          },
          {
            title: "Track Daily Patterns",
            text: "Tell me about your energy levels, mood, and any challenges you're facing each day."
          }
        ],
        reveal: "Welcome to your personalized wellness insights! As you share more about your daily experiences, sleep patterns, nutrition habits, and how you're feeling, I'll analyze these conversations to provide increasingly personalized observations and actionable recommendations. The more you engage, the more valuable these insights become."
      });
    }

    // Prepare conversation context for AI analysis
    const conversationContext = messages.map(msg => {
      const isUser = msg.sender_id === HUMAN_ID;
      const importance = msg.is_important ? ' [IMPORTANT]' : '';
      return `${isUser ? 'User' : 'Assistant'}${importance}: ${msg.content}`;
    }).join('\n\n');

    // Generate insights using OpenAI
    const systemPrompt = `You are a wellness coach analyzing conversation history to generate personalized insights. 
    
Based on the conversation, provide insights in this EXACT JSON format:

{
  "observations": {
    "sleep": "Brief observation about sleep patterns (1-2 sentences max)",
    "nutrition": "Brief observation about nutrition/eating habits (1-2 sentences max)", 
    "mood": "Brief observation about mood/emotional patterns (1-2 sentences max)",
    "cognition": "Brief observation about focus/mental clarity (1-2 sentences max)"
  },
  "nextActions": [
    {
      "title": "Specific actionable title",
      "text": "Clear, specific action they can take (1-2 sentences)"
    },
    {
      "title": "Another specific actionable title", 
      "text": "Another clear, specific action (1-2 sentences)"
    }
  ],
  "reveal": "A deeper insight about patterns you've identified across their wellness journey (2-3 sentences that reveal something meaningful about their habits, challenges, or progress)"
}

Guidelines:
- Only include observations for categories mentioned in conversations
- For missing categories, use encouraging prompts to start tracking
- Make next actions specific and immediately actionable
- The reveal should identify a meaningful pattern or connection
- Keep all text concise and personal
- Focus on what they've actually shared, not generic advice

Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this conversation history and generate personalized wellness insights:\n\n${conversationContext}` }
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? '{}';
    const insights = JSON.parse(raw);

    // Validate the response structure
    if (!insights.observations || !insights.nextActions || !insights.reveal) {
      throw new Error('Invalid insights response structure');
    }

    res.json(insights);

  } catch (e: any) {
    console.error('Insights generation error:', e);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      details: e.message || 'unknown error' 
    });
  }
});

export default router;