import { Request, Response } from 'express';
import { goalService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/goals
 * @desc Create goal
 */
export const createGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await goalService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { goal },
    message: 'Goal created successfully',
  });
});

/**
 * @route GET /api/goals
 * @desc Get all goals
 */
export const getGoals = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  const goals = await goalService.getAll(
    req.user!._id,
    status as 'active' | 'completed' | 'paused' | 'cancelled' | undefined
  );

  res.json({
    success: true,
    data: { goals },
  });
});

/**
 * @route GET /api/goals/summary
 * @desc Get goals summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await goalService.getSummary(req.user!._id);

  res.json({
    success: true,
    data: { summary },
  });
});

/**
 * @route GET /api/goals/:id
 * @desc Get goal by ID
 */
export const getGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await goalService.getById(req.params.id, req.user!._id);

  res.json({
    success: true,
    data: { goal },
  });
});

/**
 * @route PUT /api/goals/:id
 * @desc Update goal
 */
export const updateGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await goalService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { goal },
    message: 'Goal updated successfully',
  });
});

/**
 * @route POST /api/goals/:id/contribute
 * @desc Add contribution to goal
 */
export const addContribution = asyncHandler(async (req: Request, res: Response) => {
  const { amount, note } = req.body;

  const goal = await goalService.addContribution({
    goalId: req.params.id,
    userId: req.user!._id,
    amount,
    note,
  });

  res.json({
    success: true,
    data: { goal },
    message: 'Contribution added successfully',
  });
});

/**
 * @route POST /api/goals/:id/withdraw
 * @desc Withdraw from goal
 */
export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const { amount, note } = req.body;

  const goal = await goalService.withdraw({
    goalId: req.params.id,
    userId: req.user!._id,
    amount,
    note,
  });

  res.json({
    success: true,
    data: { goal },
    message: 'Withdrawal successful',
  });
});

/**
 * @route DELETE /api/goals/:id
 * @desc Delete goal
 */
export const deleteGoal = asyncHandler(async (req: Request, res: Response) => {
  await goalService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Goal deleted successfully',
  });
});
