import { Request, Response } from 'express';
import { transactionService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/transactions
 * @desc Create transaction
 */
export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { transaction },
    message: 'Transaction created successfully',
  });
});

/**
 * @route GET /api/transactions
 * @desc Get all transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'date',
    sortOrder = 'desc',
    type,
    categoryId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    tags,
    isRecurring,
  } = req.query;

  const result = await transactionService.getAll(
    {
      userId: req.user!._id,
      type: type as 'income' | 'expense' | undefined,
      categoryId: categoryId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      search: search as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      isRecurring: isRecurring !== undefined ? isRecurring === 'true' : undefined,
    },
    {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    }
  );

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @route GET /api/transactions/:id
 * @desc Get transaction by ID
 */
export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.getById(
    req.params.id,
    req.user!._id
  );

  res.json({
    success: true,
    data: { transaction },
  });
});

/**
 * @route PUT /api/transactions/:id
 * @desc Update transaction
 */
export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { transaction },
    message: 'Transaction updated successfully',
  });
});

/**
 * @route DELETE /api/transactions/:id
 * @desc Delete transaction
 */
export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  await transactionService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Transaction deleted successfully',
  });
});

/**
 * @route GET /api/transactions/summary
 * @desc Get transaction summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const now = new Date();
  const start = startDate
    ? new Date(startDate as string)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate
    ? new Date(endDate as string)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const summary = await transactionService.getSummary(req.user!._id, start, end);

  res.json({
    success: true,
    data: { summary },
  });
});
