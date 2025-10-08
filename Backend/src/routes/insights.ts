// backend/src/routes/insights.ts
import { Router } from "express";
import { supa } from "../supabase";
import { HUMAN_ID, AI_ID } from "../id";
import { openai } from "../OpenaiClient";

const router = Router();

/** sanity ping */
router.get("/__ping", (_req, res) => res.json({ ok: true, scope: "insights" }));

// TODO: do I need to add in my id to this request too?
/**
 * GET /api/insights
 * Analyzes recent conversation history to generate personalized wellness insights
 * Returns structured data for ObservationsModule, NextActionsModule, and RevealModule
 */
router.get("/", async (_req, res) => {
  try {
    // Get conversation history from last 30 days, prioritizing important messages
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages, error } = await supa
      .from("message")
      .select("*")
      .or(
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
          `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!messages || messages.length === 0) {
      // Return default insights if no conversation history
      return res.json({
        observations: {
          cognition:
            "Share your focus, memory, and mental clarity to optimize cognitive performance.",
          identity:
            "Tell me about your personal goals and values to understand your identity and purpose.",
          mind: "Discuss your mental health, stress levels, and emotional wellbeing patterns.",
          clinical:
            "Share any health concerns, symptoms, or medical observations for clinical insights.",
          nutrition:
            "Tell me about your meals and eating habits to get personalized nutrition insights.",
          training:
            "Describe your exercise routines and physical activity to optimize your training.",
          body: "Share how your body feels, energy levels, and physical sensations throughout the day.",
          sleep:
            "Start tracking your sleep patterns by sharing how you feel each morning.",
        },
        nextActions: [
          {
            title: "Start Your Holistic Assessment",
            text: "Begin by sharing your current sleep schedule, energy levels, and how you typically feel throughout the day.",
          },
          {
            title: "Define Your Goals",
            text: "Tell me about your health goals, values, and what areas of wellness you'd like to focus on improving.",
          },
        ],
        reveal:
          "Welcome to your comprehensive wellness insights! I analyze 8 key areas of your wellbeing: Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, and Sleep. As you share more about your experiences across these dimensions, I'll provide increasingly personalized observations and actionable recommendations tailored to your unique wellness journey.",
      });
    }

    // Prepare conversation context for AI analysis
    const conversationContext = messages
      .map((msg) => {
        const isUser = msg.sender_id === HUMAN_ID;
        const importance = msg.is_important ? " [IMPORTANT]" : "";
        return `${isUser ? "User" : "Assistant"}${importance}: ${msg.content}`;
      })
      .join("\n\n");

    // TODO: ai should talk in second person to the user
    // Generate insights using OpenAI
    const systemPrompt = `You are a wellness coach analyzing conversation history to generate personalized insights. 
    
Based on the conversation, provide insights in this EXACT JSON format:

{
  "observations": {
    "cognition": "Brief observation about focus/mental clarity (1-2 sentences max)",
    "identity": "Brief observation about personal goals/values/purpose (1-2 sentences max)",
    "mind": "Brief observation about mental health/stress/emotional patterns (1-2 sentences max)",
    "clinical": "Brief observation about health concerns/symptoms/medical patterns (1-2 sentences max)",
    "nutrition": "Brief observation about nutrition/eating habits (1-2 sentences max)",
    "training": "Brief observation about exercise/physical activity patterns (1-2 sentences max)",
    "body": "Brief observation about physical sensations/energy/body awareness (1-2 sentences max)",
    "sleep": "Brief observation about sleep patterns (1-2 sentences max)"
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
- Always return ALL categories, even if the conversation did not mention them
- For categories not mentioned, write a short, encouraging default message to start tracking (e.g. "No health concerns shared yet — consider noting any symptoms for future insights.")
- Make next actions specific and immediately actionable
- The reveal should identify a meaningful pattern or connection
- Keep all text concise and personal

Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this conversation history and generate personalized wellness insights:\n\n${conversationContext}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const insights = JSON.parse(raw);

    // Validate the response structure
    if (!insights.observations || !insights.nextActions || !insights.reveal) {
      throw new Error("Invalid insights response structure");
    }

    res.json(insights);
  } catch (e: any) {
    console.error("Insights generation error:", e);
    res.status(500).json({
      error: "Failed to generate insights",
      details: e.message || "unknown error",
    });
  }
});

export default router;
