import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/index.js';
import { asyncHandler } from '../middleware/index.js';
import { analyticsService } from '../services/index.js';
import { Goal } from '../models/index.js';
import { Debt } from '../models/index.js';
import { Investment } from '../models/index.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  // Optional context sent by the frontend (may be partial/stale)
  context: z
    .object({
      summary: z
        .object({
          income: z.number().optional(),
          expense: z.number().optional(),
          savingsRate: z.number().optional(),
          month: z.string().optional(),
        })
        .optional(),
      healthScore: z.any().optional(),
      goals: z.array(z.any()).optional(),
    })
    .optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })
    )
    .optional(),
});

function buildAssistantResponse(params: {
  message: string;
  userName?: string;
  dashboard?: Awaited<ReturnType<typeof analyticsService.getDashboardData>>;
  healthScore?: Awaited<ReturnType<typeof analyticsService.getFinancialHealth>>;
  topCategories?: Awaited<ReturnType<typeof analyticsService.getCategoryBreakdown>>;
  goalsCount?: number;
  debtCount?: number;
  investmentCount?: number;
}): string {
  const m = params.message.toLowerCase();
  const name = params.userName ?? 'there';

  const topCats = (params.topCategories ?? []).slice(0, 3);
  const catLine =
    topCats.length > 0
      ? `Top spending categories recently: ${topCats
          .map((c) => `${c.category} (${c.total ?? 0})`)
          .join(', ')}.`
      : '';

  const goalsLine =
    typeof params.goalsCount === 'number'
      ? `You currently have ${params.goalsCount} active goal(s).`
      : '';

  const debtLine =
    typeof params.debtCount === 'number'
      ? `You have ${params.debtCount} active debt account(s).`
      : '';

  const invLine =
    typeof params.investmentCount === 'number'
      ? `You have ${params.investmentCount} investment(s) tracked.`
      : '';

  if (m.includes('spend') || m.includes('cut back') || m.includes('reduce')) {
    return [
      `Hi ${name}! Let’s optimize your spending.`,
      catLine,
      goalsLine ? goalsLine : '',
      'Action: consider setting tighter budgets for the highest-spending category this month and review your top 5 transactions there.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (m.includes('save') || m.includes('savings') || m.includes('budget')) {
    const savingsRate = params.dashboard?.summary?.savingsRate;
    const savingsLine =
      typeof savingsRate === 'number'
        ? `Your current savings rate is about ${savingsRate.toFixed(1)}%.`
        : '';
    return [
      `Hi ${name}! Here’s a practical savings plan.`,
      savingsLine,
      goalsLine ? goalsLine : '',
      catLine,
      'Action: try allocating a fixed % of income to savings first, then enforce a weekly cap on discretionary categories.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (m.includes('goal') || m.includes('milestone')) {
    return [
      `Hi ${name}! Let’s focus on your goals.`,
      goalsLine ? goalsLine : '',
      params.healthScore
        ? `Your financial health score is ${Math.round(params.healthScore.score)} / 100.`
        : '',
      'Action: pick one goal to prioritize, and set a recurring contribution aligned with your cashflow.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (m.includes('debt') || m.includes('loan') || m.includes('credit')) {
    return [
      `Hi ${name}! Debt payoff plan time.`,
      debtLine ? debtLine : '',
      catLine,
      'Action: if you have multiple debts, use either the “avalanche” method (highest APR first) or “snowball” (smallest balance first), and automate at least the minimum payments.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  // Default
  const health =
    params.healthScore && typeof params.healthScore.score === 'number'
      ? `Your financial health score is ${Math.round(params.healthScore.score)} / 100.`
      : '';

  return [
    `Hi ${name}! I can help with spending, savings, goals, and debt.`,
    health,
    goalsLine ? goalsLine : '',
    invLine ? invLine : '',
    catLine,
    'Tell me what you want to improve (e.g., “reduce food spending” or “reach my emergency fund faster”).',
  ]
    .filter(Boolean)
    .join('\n');
}

router.use(authenticate);

router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid chat payload', details: parsed.error.issues },
      });
    }

    const { message, context } = parsed.data;
    const userId = req.user!._id;

    // Load fresh context for more accurate answers
    const [dashboard, health, goals, topCategories, debts, investments] = await Promise.all([
      analyticsService.getDashboardData(userId),
      analyticsService.getFinancialHealth(userId),
      Goal.find({ userId, status: 'active' }).select('_id'),
      analyticsService.getCategoryBreakdown(userId, 1),
      Debt.find({ userId, status: 'active' }).select('_id'),
      Investment.find({ userId, isActive: true }).select('_id'),
    ]);

    const response = buildAssistantResponse({
      message,
      userName: req.user?.email ?? context?.summary?.month ?? undefined,
      dashboard,
      healthScore: health,
      topCategories,
      goalsCount: goals.length,
      debtCount: debts.length,
      investmentCount: investments.length,
    });

    res.json({
      success: true,
      data: { response },
    });
  })
);

export default router;

