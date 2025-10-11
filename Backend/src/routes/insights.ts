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
    // Get conversation history from last 30 days, only important messages
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages, error } = await supa
      .from('message')
      .select('*')
      .or(
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
        `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .eq('is_important', true)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!messages || messages.length === 0) {
      // Return default insights if no conversation history
      return res.json({
        observations: {
          cognition: "Share your focus, memory, and mental clarity to optimize cognitive performance.",
          identity: "Tell me about your personal goals and values to understand your identity and purpose.",
          mind: "Discuss your mental health, stress levels, and emotional wellbeing patterns.",
          clinical: "Share any health concerns, symptoms, or medical observations for clinical insights.",
          nutrition: "Tell me about your meals and eating habits to get personalized nutrition insights.",
          training: "Describe your exercise routines and physical activity to optimize your training.",
          body: "Share how your body feels, energy levels, and physical sensations throughout the day.",
          sleep: "Start tracking your sleep patterns by sharing how you feel each morning."
        },
        nextActions: [
          {
            title: "Start Your Holistic Assessment",
            text: "Begin by sharing your current sleep schedule, energy levels, and how you typically feel throughout the day."
          },
          {
            title: "Define Your Goals",
            text: "Tell me about your health goals, values, and what areas of wellness you'd like to focus on improving."
          }
        ],
        reveal: "Welcome to your comprehensive wellness insights! I analyze 8 key areas of your wellbeing: Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, and Sleep. As you share more about your experiences across these dimensions, I'll provide increasingly personalized observations and actionable recommendations tailored to your unique wellness journey."
      });
    }

    // Prepare conversation context for AI analysis
    const conversationContext = messages.map(msg => {
      const isUser = msg.sender_id === HUMAN_ID;
      const importance = msg.is_important ? ' [IMPORTANT]' : '';
      return `${isUser ? 'User' : 'Assistant'}${importance}: ${msg.content}`;
    }).join('\n\n');

    // Generate insights using OpenAI
    const systemPrompt = `You are a motivational wellness coach analyzing conversation history to generate personalized insights. Write in 2nd person (using "you", "your") with an encouraging, motivational tone.
    
Based on the conversation, provide insights in this EXACT JSON format:

{
  "observations": {
    "cognition": "Motivational observation about your focus/mental clarity using 2nd person (1-2 sentences max)",
    "identity": "Encouraging observation about your personal goals/values/purpose using 2nd person (1-2 sentences max)",
    "mind": "Supportive observation about your mental health/stress/emotional patterns using 2nd person (1-2 sentences max)",
    "clinical": "Caring observation about your health concerns/symptoms/medical patterns using 2nd person (1-2 sentences max)",
    "nutrition": "Positive observation about your nutrition/eating habits using 2nd person (1-2 sentences max)",
    "training": "Energizing observation about your exercise/physical activity patterns using 2nd person (1-2 sentences max)",
    "body": "Affirming observation about your physical sensations/energy/body awareness using 2nd person (1-2 sentences max)",
    "sleep": "Encouraging observation about your sleep patterns using 2nd person (1-2 sentences max)"
  },
  "nextActions": [
    {
      "title": "Motivational actionable title",
      "text": "Clear, motivational action you can take using 2nd person (1-2 sentences)"
    },
    {
      "title": "Another motivational actionable title", 
      "text": "Another clear, encouraging action using 2nd person (1-2 sentences)"
    }
  ],
  "reveal": "A deeper, motivational insight about patterns in your wellness journey using 2nd person (2-3 sentences that reveal something meaningful about your habits, challenges, or progress while encouraging you)"
}

Guidelines:
- Use 2nd person throughout ("you", "your", "you've", "you're")
- Write with a motivational, encouraging, supportive tone
- Only include observations for categories mentioned in conversations
- For missing categories, use motivational prompts to inspire tracking
- Make next actions specific, immediately actionable, and encouraging
- The reveal should identify meaningful patterns while being uplifting
- Keep all text concise, personal, and motivational
- Focus on their actual progress and potential, not generic advice

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