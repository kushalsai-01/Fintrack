import { Request, Response } from 'express';
import { investmentService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/investments
 * @desc Create investment
 */
export const createInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await investmentService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { investment },
    message: 'Investment created successfully',
  });
});

/**
 * @route GET /api/investments
 * @desc Get all investments
 */
export const getInvestments = asyncHandler(async (req: Request, res: Response) => {
  const { includeInactive } = req.query;

  const investments = await investmentService.getAll(
    req.user!._id,
    includeInactive === 'true'
  );

  res.json({
    success: true,
    data: { investments },
  });
});

/**
 * @route GET /api/investments/portfolio
 * @desc Get portfolio summary
 */
export const getPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const portfolio = await investmentService.getPortfolioSummary(req.user!._id);

  res.json({
    success: true,
    data: { portfolio },
  });
});

/**
 * @route GET /api/investments/:id
 * @desc Get investment by ID
 */
export const getInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await investmentService.getById(req.params.id, req.user!._id);

  res.json({
    success: true,
    data: { investment },
  });
});

/**
 * @route GET /api/investments/:id/history
 * @desc Get investment price history
 */
export const getPriceHistory = asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.query;

  const history = await investmentService.getPriceHistory(
    req.params.id,
    req.user!._id,
    Number(days)
  );

  res.json({
    success: true,
    data: { history },
  });
});

/**
 * @route PUT /api/investments/:id
 * @desc Update investment
 */
export const updateInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await investmentService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { investment },
    message: 'Investment updated successfully',
  });
});

/**
 * @route POST /api/investments/:id/buy
 * @desc Buy more shares
 */
export const buyShares = asyncHandler(async (req: Request, res: Response) => {
  const { shares, pricePerShare, date } = req.body;

  const investment = await investmentService.addShares({
    investmentId: req.params.id,
    userId: req.user!._id,
    shares,
    pricePerShare,
    date: date ? new Date(date) : undefined,
  });

  res.json({
    success: true,
    data: { investment },
    message: 'Shares purchased successfully',
  });
});

/**
 * @route POST /api/investments/:id/sell
 * @desc Sell shares
 */
export const sellShares = asyncHandler(async (req: Request, res: Response) => {
  const { shares, salePrice } = req.body;

  const investment = await investmentService.sellShares(
    req.params.id,
    req.user!._id,
    shares,
    salePrice
  );

  res.json({
    success: true,
    data: { investment },
    message: 'Shares sold successfully',
  });
});

/**
 * @route DELETE /api/investments/:id
 * @desc Delete investment
 */
export const deleteInvestment = asyncHandler(async (req: Request, res: Response) => {
  await investmentService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Investment deleted successfully',
  });
});
