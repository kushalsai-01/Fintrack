import { Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import FormData from 'form-data';
import { transactionService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';
import { Category } from '../models/index.js';
import { Transaction } from '../models/index.js';
import { emitToUser } from '../utils/socket.js';
import { BadRequestError } from '../utils/errors.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8001';

/**
 * @route POST /api/transactions
 * @desc Create transaction
 */
export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.create({
    userId: req.user!._id,
    ...req.body,
  });

  emitToUser(req.user!._id.toString(), 'transaction:created', {
    transaction: typeof (transaction as any).toJSON === 'function' ? (transaction as any).toJSON() : transaction,
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
    category,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    tags,
    isRecurring,
    dateRange,
  } = req.query;

  // Support frontend query params:
  // - `category`: category name (frontend), convert to `categoryId`
  // - `dateRange`: today|week|month|year|custom (frontend), convert to start/end date
  let computedStartDate: Date | undefined;
  let computedEndDate: Date | undefined;

  if (typeof dateRange === 'string' && dateRange !== 'all') {
    const now = new Date();
    switch (dateRange) {
      case 'today': {
        computedStartDate = new Date(now);
        computedStartDate.setHours(0, 0, 0, 0);
        computedEndDate = new Date(now);
        computedEndDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        computedStartDate = start;
        computedEndDate = new Date(now);
        computedEndDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'month': {
        computedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        computedEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'year': {
        computedStartDate = new Date(now.getFullYear(), 0, 1);
        computedEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'custom': {
        // Expect explicit startDate/endDate query params for custom.
        computedStartDate = startDate ? new Date(startDate as string) : undefined;
        computedEndDate = endDate ? new Date(endDate as string) : undefined;
        break;
      }
    }
  }

  const effectiveCategoryId = (() => {
    const rawCategory = (typeof categoryId === 'string' && categoryId) || (typeof category === 'string' && category);
    if (!rawCategory) return undefined;

    // If it looks like an ObjectId, use it directly.
    if (mongoose.Types.ObjectId.isValid(rawCategory)) return rawCategory;

    // Otherwise, treat as category name and resolve to the user's category _id.
    return undefined;
  })();

  let resolvedCategoryId: string | undefined = effectiveCategoryId;
  if (resolvedCategoryId === undefined && typeof category === 'string' && category.trim().length > 0) {
    const catName = category.trim();
    const catType =
      typeof type === 'string' && (type === 'income' || type === 'expense') ? type : undefined;

    const found = await Category.findOne({
      userId: req.user!._id,
      name: { $regex: new RegExp(`^${catName}$`, 'i') },
      ...(catType ? { type: catType } : {}),
    }).select('_id');

    resolvedCategoryId = found ? found._id.toString() : undefined;
  }

  const result = await transactionService.getAll(
    {
      userId: req.user!._id,
      type: type as 'income' | 'expense' | undefined,
      categoryId: resolvedCategoryId,
      startDate: computedStartDate ?? (startDate ? new Date(startDate as string) : undefined),
      endDate: computedEndDate ?? (endDate ? new Date(endDate as string) : undefined),
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

/**
 * @route POST /api/transactions/bulk
 * @desc Bulk import transactions from CSV upload (multipart/form-data: file)
 */
export const bulkImportTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file || !file.buffer) {
    return res.status(422).json({
      success: false,
      error: { code: 'FILE_REQUIRED', message: 'CSV file is required' },
    });
  }

  const csvText = file.buffer.toString('utf-8');

  const parseCsv = (text: string): string[][] => {
    // Minimal CSV parser: supports quoted fields with commas/newlines.
    const rows: string[][] = [];
    let cur = '';
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
        continue;
      }

      if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && next === '\n') i++;
        if (cur.length > 0 || row.length > 0) row.push(cur.trim());
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) rows.push(row);
        row = [];
        cur = '';
        continue;
      }

      cur += ch;
    }

    if (cur.length > 0 || row.length > 0) {
      row.push(cur.trim());
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) rows.push(row);
    }

    return rows;
  };

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return res.status(422).json({
      success: false,
      error: { code: 'CSV_EMPTY', message: 'CSV must include a header and at least one row' },
    });
  }

  const headers = rows[0].map((h) => h.toLowerCase());
  const idx = (key: string) => headers.indexOf(key);

  const colDate = idx('date');
  const colDescription = idx('description');
  const colCategory = idx('category');
  const colType = idx('type');
  const colAmount = idx('amount');
  const colNotes = idx('notes');
  const colMerchant = idx('merchant');

  if (colDate < 0 || colDescription < 0 || colAmount < 0 || colType < 0) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'CSV_INVALID',
        message: 'Required columns: date, description, amount, type. Optional: category, notes, merchant.',
      },
    });
  }

  let createdCount = 0;
  const rowErrors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    try {
      const rawType = (r[colType] || '').toLowerCase();
      if (!['income', 'expense'].includes(rawType)) {
        throw new Error(`Invalid type "${r[colType]}" (must be income or expense)`);
      }

      const amount = Number(r[colAmount]);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Invalid amount "${r[colAmount]}"`);
      }

      const date = new Date(r[colDate]);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date "${r[colDate]}"`);
      }

      const description = (r[colDescription] || '').trim();
      if (!description) throw new Error('Missing description');

      const categoryName = colCategory >= 0 ? (r[colCategory] || '').trim() : '';

      let categoryId: string | undefined = undefined;
      if (categoryName) {
        const cat = await Category.findOne({
          userId: req.user!._id,
          name: { $regex: `^${categoryName}$`, $options: 'i' },
          isActive: true,
        });
        if (cat) categoryId = cat._id.toString();
      }

      const transaction = await transactionService.create({
        userId,
        categoryId,
        type: rawType as 'income' | 'expense',
        amount,
        description,
        date,
        merchant: colMerchant >= 0 ? (r[colMerchant] || '').trim() : undefined,
        notes: colNotes >= 0 ? (r[colNotes] || '').trim() : undefined,
      });

      // Keep track of created rows by category
      void transaction;
      createdCount++;
    } catch (e) {
      rowErrors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : 'Failed to import row',
      });
    }
  }

  res.status(201).json({
    success: true,
    data: { createdCount, rowErrors },
    message: 'CSV import completed',
  });
});

/**
 * @route GET /api/transactions/export
 * @desc Export filtered transactions as CSV
 */
export const exportTransactionsCsv = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();

  // Reuse existing filter logic from getTransactions
  const {
    type,
    category,
    categoryId,
    dateRange,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    tags,
    isRecurring,
    sortBy = 'date',
    sortOrder = 'desc',
  } = req.query;

  let computedStartDate: Date | undefined;
  let computedEndDate: Date | undefined;

  if (typeof dateRange === 'string' && dateRange !== 'all') {
    const now = new Date();
    switch (dateRange) {
      case 'today': {
        computedStartDate = new Date(now);
        computedStartDate.setHours(0, 0, 0, 0);
        computedEndDate = new Date(now);
        computedEndDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        computedStartDate = start;
        computedEndDate = new Date(now);
        computedEndDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'month': {
        computedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        computedEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'year': {
        computedStartDate = new Date(now.getFullYear(), 0, 1);
        computedEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'custom': {
        computedStartDate = startDate ? new Date(startDate as string) : undefined;
        computedEndDate = endDate ? new Date(endDate as string) : undefined;
        break;
      }
    }
  }

  const resolveCategoryId = async (): Promise<string | undefined> => {
    const rawCategory = (typeof categoryId === 'string' && categoryId) || (typeof category === 'string' && category);
    if (!rawCategory) return undefined;

    if (mongoose.Types.ObjectId.isValid(rawCategory)) return rawCategory;

    if (typeof category === 'string' && category.trim().length > 0) {
      const found = await Category.findOne({
        userId: req.user!._id,
        name: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
      }).select('_id');
      return found ? found._id.toString() : undefined;
    }

    return undefined;
  };

  const resolvedCategoryId = await resolveCategoryId();

  const result = await transactionService.getAll(
    {
      userId,
      type: type as 'income' | 'expense' | undefined,
      categoryId: resolvedCategoryId,
      startDate: computedStartDate ?? (startDate ? new Date(startDate as string) : undefined),
      endDate: computedEndDate ?? (endDate ? new Date(endDate as string) : undefined),
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      search: search as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      isRecurring: isRecurring !== undefined ? isRecurring === 'true' : undefined,
    },
    { page: 1, limit: 5000, sortBy: sortBy as string, sortOrder: sortOrder as 'asc' | 'desc' }
  );

  const escapeCsv = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = ['date', 'description', 'category', 'type', 'amount', 'notes'];
  const lines = result.transactions.map((t) => [
    t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
    t.description,
    t.category ?? '',
    t.type,
    t.amount,
    t.notes ?? '',
  ]);

  const csv = [header.join(','), ...lines.map((row) => row.map(escapeCsv).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=transactions.csv`);
  res.status(200).send(csv);
});

/**
 * @route POST /api/transactions/transfer
 * @desc Create a transfer between two accounts (creates out + in legs)
 */
export const createTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { amount, description, date, fromAccountId, toAccountId, notes } = req.body;

  if (!amount || !description || !date) {
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'amount, description, and date are required' },
    });
  }

  if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'From and to accounts must be different' },
    });
  }

  const result = await transactionService.createTransfer(
    req.user!._id,
    Number(amount),
    String(description),
    new Date(date),
    fromAccountId,
    toAccountId,
    notes
  );

  res.status(201).json({
    success: true,
    data: result,
    message: 'Transfer created successfully',
  });
});

/**
 * @route POST /api/transactions/ocr
 * @desc Proxy receipt image to ML OCR service, return extracted fields
 */
export const ocrReceipt = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file || !file.buffer) {
    throw new BadRequestError('No image file uploaded');
  }

  const form = new FormData();
  form.append('file', file.buffer, {
    filename: file.originalname || 'receipt.jpg',
    contentType: file.mimetype,
  });

  const mlResponse = await axios.post(`${ML_SERVICE_URL}/ocr/scan-receipt`, form, {
    headers: form.getHeaders(),
    timeout: 30_000,
  });

  res.json({
    success: true,
    data: mlResponse.data,
  });
});
