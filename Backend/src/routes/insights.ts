// backend/src/routes/insights.ts
import { Router } from 'express';
import { supa } from '../supabase';
import { HUMAN_ID, AI_ID } from '../id';
import { openai } from '../OpenaiClient';
import crypto from 'crypto';

const router = Router();

/** sanity ping */
router.get('/__ping', (_req, res) => res.json({ ok: true, scope: 'insights' }));

/**
 * GET /api/insights
 * Smart cached insights with real-time performance optimization
 * Implements Damien's requirements for responsive caching and synchronous updates
 * Analyzes last 7 days of conversations for focused, recent wellness insights
 */
router.get('/', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = 'default-user'; // Replace with real auth later

    // Step 1: Check if we can use cached insights
    const cacheCheck = await checkCacheValidity(userId);
    
    if (cacheCheck.shouldUseCache && cacheCheck.cachedInsight) {
      console.log(`✅ Cache hit: ${cacheCheck.reason}`);
      return res.json({
        ...cacheCheck.cachedInsight,
        _meta: {
          cached: true,
          reason: cacheCheck.reason,
          responseTime: Date.now() - startTime
        }
      });
    }

    console.log(`🔄 Cache miss: ${cacheCheck.reason} - Generating fresh insights...`);
    
    // Step 2: Generate fresh insights
    const insights = await generateFreshInsights(userId, startTime);
    
    res.json({
      ...insights,
      _meta: {
        cached: false,
        reason: cacheCheck.reason,
        responseTime: Date.now() - startTime
      }
    });

  } catch (error: any) {
    console.error('❌ Insights generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      details: error.message 
    });
  }
});

/**
 * GET /api/insights/history
 * Returns the last 3 cached insights for debugging and analysis
 */
router.get('/history', async (_req, res) => {
  try {
    const userId = 'default-user';
    
    const { data: insights, error } = await supa
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(3);
    
    if (error) throw error;
    
    res.json({
      count: insights?.length || 0,
      insights: insights || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check if cached insights are still valid
 */
async function checkCacheValidity(userId: string) {
  try {
    // Get most recent cached insight
    const { data: latestInsight } = await supa
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_cached', true)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestInsight) {
      return { shouldUseCache: false, reason: 'No cached insights found' };
    }

    // Check cache age (max 4 hours)
    const cacheAge = Date.now() - new Date(latestInsight.generated_at).getTime();
    const maxCacheAge = 4 * 60 * 60 * 1000; // 4 hours
    
    if (cacheAge > maxCacheAge) {
      return { 
        shouldUseCache: false, 
        reason: `Cache expired (${Math.round(cacheAge / (60 * 60 * 1000))} hours old)` 
      };
    }

    // Get current conversation metrics for LAST 7 DAYS
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: currentMessages } = await supa
      .from('message')
      .select('*', { count: 'exact', head: true })
      .or(`and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: currentImportant } = await supa
      .from('message')
      .select('*', { count: 'exact', head: true })
      .or(`and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`)
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('is_important', true);

    // Check for significant changes
    const messageDiff = (currentMessages || 0) - (latestInsight.message_count_at_generation || 0);
    const importantDiff = (currentImportant || 0) - (latestInsight.important_message_count || 0);

    // Cache invalidation thresholds (adjusted for 7-day window - lower thresholds)
    if (messageDiff >= 3 || importantDiff >= 1) {
      return { 
        shouldUseCache: false, 
        reason: `Significant changes detected: +${messageDiff} messages, +${importantDiff} important` 
      };
    }

    // Cache is valid!
    return { 
      shouldUseCache: true, 
      reason: `Fresh cache (${Math.round(cacheAge / (60 * 1000))} minutes old)`,
      cachedInsight: latestInsight.insights_data 
    };

  } catch (error) {
    console.error('Cache validity check failed:', error);
    return { shouldUseCache: false, reason: 'Cache check error' };
  }
}

/**
 * Generate fresh insights and store with caching metadata
 * Now analyzes LAST 7 DAYS instead of 30 days for more recent, focused insights
 */
async function generateFreshInsights(userId: string, startTime: number) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: messages, error } = await supa
    .from('message')
    .select('*')
    .or(`and(sender_id.eq.${HUMAN_ID},receiver_id.eq.${AI_ID}),and(sender_id.eq.${AI_ID},receiver_id.eq.${HUMAN_ID})`)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  let insights;
  let tokensUsed = 0;

  if (!messages || messages.length === 0) {
    insights = getDefaultInsights();
  } else {
    // Generate AI insights
    const conversationContext = messages.map(msg => {
      const isUser = msg.sender_id === HUMAN_ID;
      const importance = msg.is_important ? ' [IMPORTANT]' : '';
      return `${isUser ? 'User' : 'Assistant'}${importance}: ${msg.content}`;
    }).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 800,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: `Analyze this conversation history and generate personalized wellness insights:\n\n${conversationContext}` }
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? '{}';
    insights = JSON.parse(raw);
    tokensUsed = completion.usage?.total_tokens || 0;

    // Validate structure
    if (!insights.observations || !insights.nextActions || !insights.reveal) {
      throw new Error('Invalid insights response structure');
    }
  }

  // Store with caching metadata
  await storeInsightsWithCache(userId, insights, messages || [], startTime, tokensUsed);
  
  return insights;
}

/**
 * Store insights with smart caching metadata
 */
async function storeInsightsWithCache(userId: string, insights: any, messages: any[], startTime: number, tokensUsed: number) {
  try {
    const generationTime = Date.now() - startTime;
    const messageCount = messages.length;
    const importantCount = messages.filter(m => m.is_important).length;
    
    // Create conversation hash for change detection
    const conversationContent = messages
      .map(m => `${m.content}${m.is_important ? '[IMP]' : ''}`)
      .join('|');
    const conversationHash = crypto.createHash('md5').update(conversationContent).digest('hex');

    // Mark any existing cache as stale
    await supa.from('insights')
      .update({ is_cached: false })
      .eq('user_id', userId);

    // Insert new cached insight
    const { error: insertError } = await supa.from('insights').insert({
      user_id: userId,
      insights_data: insights,
      message_count_at_generation: messageCount,
      important_message_count: importantCount,
      conversation_hash: conversationHash,
      is_cached: true,
      generation_time_ms: generationTime,
      ai_tokens_used: tokensUsed,
      generated_at: new Date().toISOString()
    });

    if (insertError) throw insertError;

    // Cleanup: keep only last 3 insights
    await cleanupOldInsights(userId);
    
    console.log(`💾 Stored cached insights: ${messageCount} messages, ${generationTime}ms, ${tokensUsed} tokens`);

  } catch (error) {
    console.error('❌ Storage error:', error);
    // Don't throw - insights generation succeeded
  }
}

/**
 * Keep only the last 3 insights per user
 */
async function cleanupOldInsights(userId: string) {
  try {
    const { data: allInsights } = await supa
      .from('insights')
      .select('id')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });

    if (allInsights && allInsights.length > 3) {
      const toDelete = allInsights.slice(3);
      const idsToDelete = toDelete.map(insight => insight.id);
      
      await supa.from('insights').delete().in('id', idsToDelete);
      console.log(`🗑️ Cleaned up ${idsToDelete.length} old insights`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

function getDefaultInsights() {
  return {
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
    reveal: "Welcome to your comprehensive wellness insights! I analyze 8 key areas of your wellbeing: Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, and Sleep. Based on your recent conversations from the past week, I'll provide personalized observations and actionable recommendations tailored to your current wellness patterns."
  };
}

function getSystemPrompt() {
  return `You are a wellness coach analyzing conversation history to generate personalized insights. 
    
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
- Only include observations for categories mentioned in conversations
- For missing categories, use encouraging prompts to start tracking
- Make next actions specific and immediately actionable
- The reveal should identify a meaningful pattern or connection
- Keep all text concise and personal
- Focus on what they've actually shared, not generic advice

Return ONLY valid JSON.`;
}

export default router;