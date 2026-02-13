import { Request, Response } from 'express';
import { billService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/bills
 * @desc Create bill
 */
export const createBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { bill },
    message: 'Bill created successfully',
  });
});

/**
 * @route GET /api/bills
 * @desc Get all bills
 */
export const getBills = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  const bills = await billService.getAll(
    req.user!._id,
    status as 'upcoming' | 'overdue' | 'paid' | undefined
  );

  res.json({
    success: true,
    data: { bills },
  });
});

/**
 * @route GET /api/bills/upcoming
 * @desc Get upcoming bills
 */
export const getUpcoming = asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.query;

  const bills = await billService.getUpcoming(req.user!._id, Number(days));

  res.json({
    success: true,
    data: { bills },
  });
});

/**
 * @route GET /api/bills/summary
 * @desc Get bills summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await billService.getSummary(req.user!._id);

  res.json({
    success: true,
    data: { summary },
  });
});

/**
 * @route GET /api/bills/:id
 * @desc Get bill by ID
 */
export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.getById(req.params.id, req.user!._id);

  res.json({
    success: true,
    data: { bill },
  });
});

/**
 * @route PUT /api/bills/:id
 * @desc Update bill
 */
export const updateBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { bill },
    message: 'Bill updated successfully',
  });
});

/**
 * @route POST /api/bills/:id/pay
 * @desc Pay bill
 */
export const payBill = asyncHandler(async (req: Request, res: Response) => {
  const { paidAmount, paidDate, paymentMethod, notes } = req.body;

  const bill = await billService.payBill({
    billId: req.params.id,
    userId: req.user!._id,
    paidAmount,
    paidDate: paidDate ? new Date(paidDate) : undefined,
    paymentMethod,
    notes,
  });

  res.json({
    success: true,
    data: { bill },
    message: 'Bill marked as paid',
  });
});

/**
 * @route DELETE /api/bills/:id
 * @desc Delete bill
 */
export const deleteBill = asyncHandler(async (req: Request, res: Response) => {
  await billService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Bill deleted successfully',
  });
});
