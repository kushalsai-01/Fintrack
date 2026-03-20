/**
 * Insights Routes - AI-powered financial insights
 */
import { Router } from 'express';
import { asyncHandler } from '../middleware/index.js';
import { authenticate } from '../middleware/index.js';
import { Request, Response } from 'express';
import { analyticsService } from '../services/index.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { Notification } from '../models/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/insights
 * @desc Get AI-powered financial insights
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get user's financial data
    const dashboard = await analyticsService.getDashboardData(req.user!._id);

    // Call ML service for insights
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';
    
    try {
      // ML expects boolean switches; it currently ignores extra fields.
      const mlResponse = await axios.post(
        `${mlServiceUrl}/insights/generate`,
        {
          user_id: req.user!._id.toString(),
          include_spending: true,
          include_savings: true,
          include_goals: true,
          include_predictions: true,
        },
        { timeout: 5000 }
      );

      type MLInsight = {
        id: string;
        type: string; // spending, savings, goal, prediction, alert
        title: string;
        description: string;
        impact: string; // positive, negative, neutral
        priority: number; // 1-5
        actionable: boolean;
        action_text?: string | null;
        data?: Record<string, unknown>;
      };

      type MLInsightsResponse = {
        success: boolean;
        user_id: string;
        generated_at: string;
        insights: MLInsight[];
        summary?: Record<string, unknown>;
      };

      const mlData = mlResponse.data as MLInsightsResponse;
      const generatedAt = mlData.generated_at ? new Date(mlData.generated_at).toISOString() : new Date().toISOString();

      type FrontendInsightType =
        | 'saving'
        | 'spending'
        | 'budget'
        | 'goal'
        | 'anomaly'
        | 'opportunity'
        | 'achievement';

      type FrontendPriority = 'high' | 'medium' | 'low';

      type FrontendInsight = {
        id: string;
        type: FrontendInsightType;
        priority: FrontendPriority;
        title: string;
        description: string;
        impact?: number;
        impactType?: 'positive' | 'negative';
        category?: string;
        actionLabel?: string;
        actionUrl?: string;
        createdAt: string;
        saved?: boolean;
        helpful?: boolean | null;
      };

      const mapPriority = (p: number): FrontendPriority => {
        if (p >= 4) return 'high';
        if (p >= 3) return 'medium';
        return 'low';
      };

      const mapType = (t: string): FrontendInsightType => {
        switch (t) {
          case 'spending':
            return 'spending';
          case 'savings':
            return 'saving';
          case 'goal':
            return 'goal';
          case 'prediction':
            return 'opportunity';
          case 'alert':
            return 'anomaly';
          default:
            return 'opportunity';
        }
      };

      const mapImpactType = (impact: string): FrontendInsight['impactType'] => {
        if (impact === 'positive') return 'positive';
        if (impact === 'negative') return 'negative';
        return undefined;
      };

      const extractImpactNumber = (insight: MLInsight): number | undefined => {
        // Heuristic extraction from ML's `data` payload.
        const data = insight.data;
        if (!data) return undefined;

        const candidates = [
          data.potential_savings,
          data.predicted_increase,
          data.monthly_cost,
          data.increase_percent,
          data.total_subscriptions,
          data.savings_rate,
        ];

        for (const v of candidates) {
          if (typeof v === 'number' && Number.isFinite(v)) return v;
        }
        return undefined;
      };

      const mappedInsights: FrontendInsight[] = (mlData.insights || []).map((insight) => {
        const type = mapType(insight.type);
        return {
          id: insight.id,
          type,
          priority: mapPriority(insight.priority),
          title: insight.title,
          description: insight.description,
          impact: extractImpactNumber(insight),
          impactType: mapImpactType(insight.impact),
          category:
            typeof insight.data?.category === 'string'
              ? insight.data.category
              : undefined,
          actionLabel: insight.action_text || undefined,
          actionUrl: undefined,
          createdAt: generatedAt,
          saved: false,
          helpful: null,
        };
      });

      // Merge saved/helpful state from stored insight notifications.
      const insightIds = mappedInsights.map((i) => i.id);
      const savedNotifications = await Notification.find({
        userId: req.user!._id,
        type: 'insight',
        'metadata.insightId': { $in: insightIds },
      }).sort({ createdAt: -1 });

      const savedById = new Map<
        string,
        { saved: boolean; helpful: boolean | null }
      >();

      for (const n of savedNotifications) {
        const meta = n.metadata as
          | { insightId?: string; kind?: 'save' | 'feedback'; helpful?: boolean }
          | undefined;
        const id = meta?.insightId;
        if (!id) continue;

        const existing = savedById.get(id);
        if (!existing) {
          savedById.set(id, { saved: meta?.kind === 'save', helpful: null });
        }

        const current = savedById.get(id)!;
        if (meta?.kind === 'save') current.saved = true;
        if (meta?.kind === 'feedback' && typeof meta.helpful === 'boolean') {
          current.helpful = meta.helpful;
          current.saved = true;
        }
        savedById.set(id, current);
      }

      const finalInsights = mappedInsights.map((i) => {
        const saved = savedById.get(i.id);
        return {
          ...i,
          saved: saved?.saved ?? false,
          helpful: saved?.helpful ?? null,
        };
      });

      const potentialSavings = mappedInsights
        .filter((i) => i.type === 'saving' || i.type === 'opportunity')
        .reduce((sum, i) => sum + (i.impact ?? 0), 0);

      res.json({
        success: true,
        data: {
            insights: finalInsights,
          stats: {
              totalInsights: finalInsights.length,
              savingsOpportunities: finalInsights.filter((i) => i.type === 'saving' || i.type === 'opportunity').length,
            potentialSavings,
            achievementsUnlocked: 0,
            alertsResolved: 0,
          },
        },
      });
    } catch (mlError) {
      logger.warn('ML insights generation failed, using fallback:', mlError);

      const totalExpenses = dashboard.summary.totalExpenses;
      const savingsRate = dashboard.summary.savingsRate;

      const nowIso = new Date().toISOString();
      const fallbackInsights: Array<{
        id: string;
        type: 'spending' | 'saving';
        priority: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        impact?: number;
        impactType?: 'positive' | 'negative';
        createdAt: string;
      }> = [
        {
          id: 'fallback_spending_1',
          type: 'spending',
          priority: savingsRate < 20 ? 'high' : 'medium',
          title: 'Spending Summary',
          description: `You spent ${totalExpenses.toFixed(2)} this month. Review your top categories to stay on track.`,
          createdAt: nowIso,
          impactType: 'negative',
        },
        {
          id: 'fallback_saving_1',
          type: 'saving',
          priority: savingsRate < 20 ? 'high' : 'medium',
          title: 'Savings Rate',
          description:
            savingsRate < 20
              ? `Your savings rate is ${savingsRate.toFixed(1)}%. Consider increasing your savings this month.`
              : `Great job! Your savings rate is ${savingsRate.toFixed(1)}%.`,
          createdAt: nowIso,
          impactType: 'positive',
          impact: Math.max(0, (savingsRate / 100) * totalExpenses),
        },
      ];

      res.json({
        success: true,
        data: {
          insights: fallbackInsights.map((i) => ({
            ...i,
            category: undefined,
            actionLabel: undefined,
            actionUrl: undefined,
            saved: false,
            helpful: null,
          })),
          stats: {
            totalInsights: fallbackInsights.length,
            savingsOpportunities: fallbackInsights.filter((i) => i.type === 'saving').length,
            potentialSavings: fallbackInsights
              .filter((i) => typeof i.impact === 'number')
              .reduce((sum, i) => sum + (i.impact ?? 0), 0),
            achievementsUnlocked: 0,
            alertsResolved: 0,
          },
        },
      });
    }
  } catch (error) {
    logger.error('Insights generation error:', error);
    throw error;
  }
}));

/**
 * @route POST /api/insights/:id/save
 * @desc Save an insight for the user
 */
router.post(
  '/:id/save',
  asyncHandler(async (req: Request, res: Response) => {
    const insightId = req.params.id;

    if (!insightId || insightId.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_INSIGHT_ID', message: 'Invalid insight id' },
      });
    }

    const existing = await Notification.findOne({
      userId: req.user!._id,
      type: 'insight',
      'metadata.insightId': insightId,
      'metadata.kind': 'save',
    });

    if (!existing) {
      await Notification.create({
        userId: req.user!._id,
        type: 'insight',
        title: 'Insight saved',
        message: `Saved insight: ${insightId}`,
        metadata: { insightId, kind: 'save' },
        read: false,
        archived: false,
      });
    }

    res.json({ success: true, data: { saved: true } });
  })
);

/**
 * @route POST /api/insights/:id/feedback
 * @desc Record feedback for an insight
 */
router.post(
  '/:id/feedback',
  asyncHandler(async (req: Request, res: Response) => {
    const insightId = req.params.id;
    const { helpful } = req.body as { helpful?: boolean };

    if (!insightId || insightId.trim().length === 0 || typeof helpful !== 'boolean') {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Provide valid { helpful: boolean }.' },
      });
    }

    await Notification.create({
      userId: req.user!._id,
      type: 'insight',
      title: 'Insight feedback',
      message: `Feedback for ${insightId}: ${helpful ? 'helpful' : 'not helpful'}`,
      metadata: { insightId, kind: 'feedback', helpful },
      read: false,
      archived: false,
    });

    res.json({ success: true, data: { helpful } });
  })
);

export default router;
