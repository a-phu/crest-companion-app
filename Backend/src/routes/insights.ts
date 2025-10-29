// backend/src/routes/insights.ts
import { Router, Request, Response } from "express";
import { supa } from "../supabase";
import { HUMAN_ID, AI_ID } from "../../../defaultIds";
import { openai } from "../OpenaiClient";
import { INSIGHTS_SYSTEM_PROMPT } from "../prompts/prompt";

const router = Router();

/** sanity ping */
router.get("/__ping", (_req, res) => res.json({ ok: true, scope: "insights" }));

/**
 * GET /api/insights
 * Returns the latest stored insights from the database
 */
router.get("/", async (_req, res) => {
  try {
    console.log("Fetching latest insights for user:", HUMAN_ID);

    // Get the latest insights from database
    const { data: latestInsights, error } = await supa
      .from("insights")
      .select("*")
      .eq("user_id", HUMAN_ID)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.log("No insights found in database:", error.message);

      // return res.json([]);
      // Return default insights if none exist
      return res.json({
        insights: {
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
              text: "Begin by sharing your current sleep schedule, energy levels, and how you feel throughout the day.",
            },
            {
              title: "Define Your Goals",
              text: "Tell me about your health goals, values, and what areas of wellness you'd like to focus on improving.",
            },
          ],
          reveal:
            "Welcome to your comprehensive wellness insights! I analyze 8 key areas of your wellbeing: Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, and Sleep. As you share more about your experiences across these dimensions, I'll provide increasingly personalized observations and actionable recommendations tailored to your unique wellness journey.",
        },
        source: "default",
        message:
          "No insights found in database. Use POST /api/insights/generate to create new insights.",
      });
    }

    console.log(
      `Found insights with ID: ${latestInsights.id}, generated at: ${latestInsights.generated_at}`
    );

    res.json({
      insights: latestInsights.insights_data,
      source: "database",
      id: latestInsights.id,
      generated_at: latestInsights.generated_at,
      message_count: latestInsights.message_count_at_generation,
      generation_time_ms: latestInsights.generation_time_ms,
      ai_tokens_used: latestInsights.ai_tokens_used,
    });
  } catch (e: any) {
    console.error("Error fetching insights:", e);
    res.status(500).json({
      error: "Failed to fetch insights from database",
      details: e.message,
    });
  }
});

// Helper function to generate insights (used by both manual calls and automatic triggers)
async function generateInsights() {
  const startTime = Date.now();

  try {
    // Get conversation history from last 30 days, only important messages
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages, error } = await supa
      .from("message")
      .select("*")
      .or(
        `and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),` +
          `and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`
      )
      .eq("is_important", true)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // If no important messages, return null
    if (!messages || messages.length === 0) {
      return null;
    }

    // Create conversation context for AI analysis
    const conversationContext = messages
      .map((msg) => {
        const isUser = msg.sender_id === HUMAN_ID;
        return `${isUser ? "User" : "Assistant"}: ${msg.content}`;
      })
      .join("\n\n");

    const systemPrompt = INSIGHTS_SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 500,
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

    const generationTime = Date.now() - startTime;
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Create conversation hash for tracking
    const conversationHash = require("crypto")
      .createHash("sha256")
      .update(messages.map((m) => m.message_id + m.content).join(""))
      .digest("hex");

    // Store new insights in database
    const { data: savedInsights, error: insertError } = await supa
      .from("insights")
      .insert({
        user_id: HUMAN_ID,
        insights_data: insights,
        message_count_at_generation: messages.length,
        important_message_count: messages.length,
        conversation_hash: conversationHash,
        generation_time_ms: generationTime,
        ai_tokens_used: tokensUsed,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing insights:", insertError);
    } else {
      console.log(
        "Insights generated and stored successfully with ID:",
        savedInsights?.id
      );
    }

    return {
      insights,
      generated: true,
      generationTime,
      tokensUsed,
      saved_id: savedInsights?.id,
    };
  } catch (e: any) {
    console.error("Error generating insights:", e);
    throw e;
  }
}

/**
 * POST /api/insights/generate
 * Manually trigger insights generation (for background/automatic calls)
 */
router.post("/generate", async (_req: Request, res: Response) => {
  try {
    console.log("Manual insights generation triggered");
    const result = await generateInsights();

    if (!result) {
      return res.json({
        message: "No important messages found, insights not generated",
        generated: false,
      });
    }

    res.json({
      message: "Insights generated and stored successfully",
      ...result,
    });
  } catch (e: any) {
    res.status(500).json({
      error: "Failed to generate insights",
      details: e.message,
    });
  }
});

export default router;
