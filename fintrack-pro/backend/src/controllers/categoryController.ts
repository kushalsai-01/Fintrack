import { Request, Response } from 'express';
import { categoryService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route POST /api/categories
 * @desc Create category
 */
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.create({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: { category },
    message: 'Category created successfully',
  });
});

/**
 * @route GET /api/categories
 * @desc Get all categories
 */
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { withStats } = req.query;

  let categories;
  if (withStats === 'true') {
    categories = await categoryService.getAllWithStats(req.user!._id);
  } else {
    categories = await categoryService.getAll(req.user!._id);
  }

  res.json({
    success: true,
    data: { categories },
  });
});

/**
 * @route GET /api/categories/:id
 * @desc Get category by ID
 */
export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getById(req.params.id, req.user!._id);

  res.json({
    success: true,
    data: { category },
  });
});

/**
 * @route PUT /api/categories/:id
 * @desc Update category
 */
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.update({
    id: req.params.id,
    userId: req.user!._id,
    ...req.body,
  });

  res.json({
    success: true,
    data: { category },
    message: 'Category updated successfully',
  });
});

/**
 * @route DELETE /api/categories/:id
 * @desc Delete category
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

/**
 * @route GET /api/categories/breakdown
 * @desc Get category breakdown
 */
export const getBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const { type = 'expense', startDate, endDate } = req.query;

  const now = new Date();
  const start = startDate
    ? new Date(startDate as string)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate
    ? new Date(endDate as string)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const breakdown = await categoryService.getBreakdown(
    req.user!._id,
    type as 'income' | 'expense',
    start,
    end
  );

  res.json({
    success: true,
    data: { breakdown },
  });
});
