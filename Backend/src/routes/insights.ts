// backend/src/routes/insights.ts
import { Router, Request, Response } from 'express';
import { supa } from '../supabase';
import { HUMAN_ID, AI_ID } from '../id';
import { openai } from '../OpenaiClient';

// Content sourced from "Crest Companion Knowledge base.docx" for RAG context
const crestInsightsKnowledgeBase = `
EXPERT KNOWLEDGE BASE
The following information provides the context and knowledge for how the Crest companion app provides meaningful, evidence-based guidance for its users, across three core pillars: Mind, Body and Biology, as well as a performance coach to provide personalised guidance across all three pillars.

MIND
Resilience - Focus - Belonging
The Mind pillar connects psychology, neuroscience, and behavioural science. It regulates emotions and habits, builds identity and resilience, and integrates purpose, belonging, and focus for optimal cognitive performance.
Core Functions
Emotional regulation and resilience
Focus, decision-making, and goal mastery
Mind-body synchronisation through breath and self-awareness
Identity alignment and social connection
Expertise
Cognitive Behavioural Therapy (CBT): APA Guidelines - evidence-based cognitive reappraisal https://www.apa.org/ptsd-guideline/patients-and-families/cognitive-behavioral
Habit Formation: Cue-reward mechanisms, ScienceDirect (2021) https://www.sciencedirect.com/science/article/pii/S2352250X21000550
Mindfulness & Stress Reduction: JAMA Meta-Analysis (2014) https://jamanetwork.com/journals/jama/fullarticle/1809754
Self-Determination Theory: Deci & Ryan - motivation and wellbeing framework https://selfdeterminationtheory.org/theory/
Neuroplasticity: Synaptic growth and learning, Neuron (Kandel, 2001) https://doi.org/10.1016/S0896-6273(01)00343-1
Stress & Prefrontal Control: Chronic stress effects on cognition, Nat Rev Neurosci (Arnsten, 2009) https://www.nature.com/articles/nrn2648
Oxytocin & Belonging: Social bonding and HRV regulation, Biol Psychiatry (Feldman, 2017) https://doi.org/10.1016/j.biopsych.2016.10.014

BODY
Readiness - Recovery - Growth
The Body pillar applies world-class sports science and recovery research. It optimises training, readiness, and sleep by balancing intensity with recovery, guiding somatic readiness, and shaping restorative sleep conditions that drive daily performance.
Core Functions
Training load and adaptation
Recovery and inflammation control
Somatic readiness (HRV, soreness, fatigue)
Sleep architecture and circadian rhythm
Environmental and thermal recovery
Expertise
Exercise Load & Progression: NSCA Position Statement - resistance training standards https://www.nsca.com/education/articles/nsca-coach/position-statement-on-resistance-training/
Acute:Chronic Workload Ratio, Br J Sports Med (Gabbett, 2016) https://bjsm.bmj.com/content/50/17/1030
Autonomic Recovery: HRV Task Force Standards, Eur Heart J (1996) https://academic.oup.com/eurheartj/article/17/3/354/464541
Cold Exposure & Neurochemical Reset: Elevates dopamine + norepinephrine, Cell Rep Med (2021) https://doi.org/10.1016/j.xcrm.2021.100418
Breathwork & Vagal Regulation: CO2-O2 balance and parasympathetic activation, Med Hypotheses (2015) https://doi.org/10.1016/j.mehy.2015.03.020
Sauna & Heat Therapy: Cardiovascular and hormonal recovery, JAMA Intern Med (2018) https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2673443
Exercise-Induced BDNF: Neural growth and mood regulation, Neurosci Biobehav Rev (2015) https://doi.org/10.1016/j.neubiorev.2015.03.018
Sleep & Recovery: AASM Clinical Practice Guidelines https://aasm.org/clinical-resources/practice-standards/practice-guidelines/
Circadian rhythm & recovery, Nature Rev Neurosci (2011) https://www.nature.com/articles/nn.3300

BIOLOGY
Fuel - Chemistry - Biomarkers
The Biology pillar integrates nutrition, chemistry, and clinical insights. It manages energy, gut-mood connection, cravings, and recovery, while tracking biomarkers, neurochemistry, and wearable data to deliver precision insights that fuel sustainable performance.
Core Functions
Energy and metabolic regulation
Gut-mood and inflammation balance
Craving and nutrient timing control
Neurochemical rhythm and recovery
Medication, supplement, and biomarker integration
Expertise
Metabolic Nutrition: PREDIMED Trial - Mediterranean diet and longevity, NEJM (Estruch et al., 2018) https://www.nejm.org/doi/full/10.1056/NEJMoa1800389
Chrononutrition: Meal timing and circadian alignment, BMJ (2020) https://www.bmj.com/content/369/bmj.m2572
Gut-Brain Axis: Microbiome and mood regulation, Nat Rev Gastroenterol Hepatol (Cryan & Dinan, 2012) https://doi.org/10.1038/nrgastro.2012.156
Stress Biology: Allostatic load and systemic overload, PNAS (McEwen, 2001) https://www.pnas.org/doi/10.1073/pnas.98.22.12337
Hormone & Neurochemistry: Cortisol circadian control, Nature Rev Neurosci (Foster, 2011) https://www.nature.com/articles/nn.3300
Dopamine signalling and motivation, Neuron (Schultz, 2016) https://doi.org/10.1016/j.neuron.2016.04.019
Serotonin and mood stability, J Psychiatry Neurosci (Young, 2007) https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2077351/
Clinical Biomarkers: HRV as recovery metric, Front Public Health (Shaffer & Ginsberg, 2017) https://www.frontiersin.org/articles/10.3389/fpubh.2017.00258/full
Medical Integration: NIH MedlinePlus - blood panels, biomarkers, and lab tests https://medlineplus.gov/lab-tests/
RxNorm - medication normalisation and classification https://www.nlm.nih.gov/research/umls/rxnorm/

PERFORMANCE ASSISTANT
Total Insight - Unified Reasoning
The Performance Assistant fuses data from all domains - Mind, Body and Biology - to interpret the system state, prioritise recovery or growth, and deliver one clear action.
Core Science
Allostasis & adaptation - Sterling & Eyer, 1988
Hormonal and behavioural homeostasis - McEwen & Wingfield, Horm Behav, 2010 https://doi.org/10.1016/j.yhbeh.2010.06.019
Human performance optimisation - National Academies Report (2020) https://nap.nationalacademies.org/catalog/25520/optimizing-human-performance
Behavioural insights - World Health Organization https://www.who.int/health-topics/behavioural-insights
`;

const router = Router();

function buildSystemPrompt(): string {
  return `You are a motivational wellness coach analyzing conversation history to generate personalized insights. Write in 2nd person (using "you", "your") with an encouraging, motivational tone.

Use the following Crest Companion expert knowledge base as factual context when grounding insights. Align observations and actions with the Mind, Body, Biology pillars and the performance assistant while prioritizing what the user actually shared:

${crestInsightsKnowledgeBase}

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
- Tie insights back to the most relevant elements of the Crest knowledge base when it provides helpful framing
- Only include observations for categories mentioned in conversations
- For missing categories, use motivational prompts to inspire tracking
- Make next actions specific, immediately actionable, and encouraging
- The reveal should identify meaningful patterns while being uplifting
- Keep all text concise, personal, and motivational
- Focus on their actual progress and potential, not generic advice

Return ONLY valid JSON.`;
}

/** sanity ping */
router.get("/__ping", (_req, res) => res.json({ ok: true, scope: "insights" }));

/**
 * GET /api/insights
 * Returns the latest stored insights from the database
 */
router.get("/", async (_req, res) => {
  try {
    console.log('Fetching latest insights for user:', HUMAN_ID);

    // Get the latest insights from database
    const { data: latestInsights, error } = await supa
      .from('insights')
      .select('*')
      .eq('user_id', HUMAN_ID)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.log('No insights found in database:', error.message);
      
      // Return default insights if none exist
      return res.json({
        insights: {
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
              text: "Begin by sharing your current sleep schedule, energy levels, and how you feel throughout the day."
            },
            {
              title: "Define Your Goals",
              text: "Tell me about your health goals, values, and what areas of wellness you'd like to focus on improving."
            }
          ],
          reveal: "Welcome to your comprehensive wellness insights! I analyze 8 key areas of your wellbeing: Cognition, Identity, Mind, Clinical, Nutrition, Training, Body, and Sleep. As you share more about your experiences across these dimensions, I'll provide increasingly personalized observations and actionable recommendations tailored to your unique wellness journey."
        },
        source: "default",
        message: "No insights found in database. Use POST /api/insights/generate to create new insights."
      });
    }

    console.log(`Found insights with ID: ${latestInsights.id}, generated at: ${latestInsights.generated_at}`);

    res.json({
      insights: latestInsights.insights_data,
      source: "database",
      id: latestInsights.id,
      generated_at: latestInsights.generated_at,
      message_count: latestInsights.message_count_at_generation,
      generation_time_ms: latestInsights.generation_time_ms,
      ai_tokens_used: latestInsights.ai_tokens_used
    });

  } catch (e: any) {
    console.error('Error fetching insights:', e);
    res.status(500).json({
      error: 'Failed to fetch insights from database',
      details: e.message
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
    const conversationContext = messages.map(msg => {
      const isUser = msg.sender_id === HUMAN_ID;
      return `${isUser ? 'User' : 'Assistant'}: ${msg.content}`;
    }).join('\n\n');

    const systemPrompt = buildSystemPrompt();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

    const generationTime = Date.now() - startTime;
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Create conversation hash for tracking
    const conversationHash = require('crypto')
      .createHash('sha256')
      .update(messages.map(m => m.message_id + m.content).join(''))
      .digest('hex');

    // Store new insights in database
    const { data: savedInsights, error: insertError } = await supa
      .from('insights')
      .insert({
        user_id: HUMAN_ID,
        insights_data: insights,
        message_count_at_generation: messages.length,
        important_message_count: messages.length,
        conversation_hash: conversationHash,
        generation_time_ms: generationTime,
        ai_tokens_used: tokensUsed
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing insights:', insertError);
    } else {
      console.log('Insights generated and stored successfully with ID:', savedInsights?.id);
    }

    return {
      insights,
      generated: true,
      generationTime,
      tokensUsed,
      saved_id: savedInsights?.id
    };

  } catch (e: any) {
    console.error('Error generating insights:', e);
    throw e;
  }
}

/**
 * POST /api/insights/generate
 * Manually trigger insights generation (for background/automatic calls)
 */
router.post('/generate', async (_req: Request, res: Response) => {
  try {
    console.log('Manual insights generation triggered');
    const result = await generateInsights();
    
    if (!result) {
      return res.json({
        message: 'No important messages found, insights not generated',
        generated: false
      });
    }

    res.json({
      message: 'Insights generated and stored successfully',
      ...result
    });

  } catch (e: any) {
    res.status(500).json({
      error: 'Failed to generate insights',
      details: e.message
    });
  }
});

export default router;
