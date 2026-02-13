import { Request, Response } from 'express';
import { budgetService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/budgets
 * @desc Create budget
 */
export const createBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { budget },
    message: 'Budget created successfully',
  });
});

/**
 * @route GET /api/budgets
 * @desc Get all budgets
 */
export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  const { includeInactive } = req.query;

  const budgets = await budgetService.getAll(
    req.user!._id,
    includeInactive === 'true'
  );

  res.json({
    success: true,
    data: { budgets },
  });
});

/**
 * @route GET /api/budgets/active
 * @desc Get active budgets
 */
export const getActiveBudgets = asyncHandler(async (req: Request, res: Response) => {
  const budgets = await budgetService.getActive(req.user!._id);

  res.json({
    success: true,
    data: { budgets },
  });
});

/**
 * @route GET /api/budgets/summary
 * @desc Get budget summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await budgetService.getSummary(req.user!._id);

  res.json({
    success: true,
    data: { summary },
  });
});

/**
 * @route GET /api/budgets/:id
 * @desc Get budget by ID
 */
export const getBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.getById(req.params.id, req.user!._id);

  res.json({
    success: true,
    data: { budget },
  });
});

/**
 * @route PUT /api/budgets/:id
 * @desc Update budget
 */
export const updateBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { budget },
    message: 'Budget updated successfully',
  });
});

/**
 * @route DELETE /api/budgets/:id
 * @desc Delete budget
 */
export const deleteBudget = asyncHandler(async (req: Request, res: Response) => {
  await budgetService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Budget deleted successfully',
  });
});
