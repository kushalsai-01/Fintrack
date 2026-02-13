import { Request, Response } from 'express';
import { debtService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/debts
 * @desc Create debt
 */
export const createDebt = asyncHandler(async (req: Request, res: Response) => {
  const debt = await debtService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { debt },
    message: 'Debt created successfully',
  });
});

/**
 * @route GET /api/debts
 * @desc Get all debts
 */
export const getDebts = asyncHandler(async (req: Request, res: Response) => {
  const { includeInactive } = req.query;

  const debts = await debtService.getAll(req.user!._id, includeInactive === 'true');

  res.json({
    success: true,
    data: { debts },
  });
});

/**
 * @route GET /api/debts/summary
 * @desc Get debt summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await debtService.getSummary(req.user!._id);

  res.json({
    success: true,
    data: { summary },
  });
});

/**
 * @route GET /api/debts/payoff-plan
 * @desc Get debt payoff plan
 */
export const getPayoffPlan = asyncHandler(async (req: Request, res: Response) => {
  const { strategy = 'avalanche', extraPayment = 0 } = req.query;

  const plan = await debtService.getPayoffPlan(
    req.user!._id,
    strategy as 'avalanche' | 'snowball',
    Number(extraPayment)
  );

  res.json({
    success: true,
    data: { plan },
  });
});

/**
 * @route GET /api/debts/:id
 * @desc Get debt by ID
 */
export const getDebt = asyncHandler(async (req: Request, res: Response) => {
  const debt = await debtService.getById(req.params.id, req.user!._id);

  res.json({
    success: true,
    data: { debt },
  });
});

/**
 * @route PUT /api/debts/:id
 * @desc Update debt
 */
export const updateDebt = asyncHandler(async (req: Request, res: Response) => {
  const debt = await debtService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { debt },
    message: 'Debt updated successfully',
  });
});

/**
 * @route POST /api/debts/:id/payment
 * @desc Make debt payment
 */
export const makePayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, date, note } = req.body;

  const debt = await debtService.makePayment({
    debtId: req.params.id,
    userId: req.user!._id,
    amount,
    date: date ? new Date(date) : undefined,
    note,
  });

  res.json({
    success: true,
    data: { debt },
    message: 'Payment recorded successfully',
  });
});

/**
 * @route DELETE /api/debts/:id
 * @desc Delete debt
 */
export const deleteDebt = asyncHandler(async (req: Request, res: Response) => {
  await debtService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Debt deleted successfully',
  });
});
