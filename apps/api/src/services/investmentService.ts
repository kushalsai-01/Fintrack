import mongoose from 'mongoose';
import { Investment, IInvestment } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheDelPattern, cacheGet, cacheSet } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CreateInvestmentInput {
  userId: string;
  name: string;
  type: 'stock' | 'etf' | 'mutual_fund' | 'crypto' | 'bond' | 'real_estate' | 'other';
  symbol?: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: Date;
  notes?: string;
}

interface UpdateInvestmentInput {
  id: string;
  userId: string;
  name?: string;
  shares?: number;
  currentPrice?: number;
  notes?: string;
  isActive?: boolean;
}

interface AddSharesInput {
  investmentId: string;
  userId: string;
  shares: number;
  pricePerShare: number;
  date?: Date;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  byType: {
    type: string;
    value: number;
    percentage: number;
    gainLoss: number;
  }[];
  topPerformers: {
    id: string;
    name: string;
    gainLossPercent: number;
  }[];
  worstPerformers: {
    id: string;
    name: string;
    gainLossPercent: number;
  }[];
}

export class InvestmentService {
  // Create investment
  async create(input: CreateInvestmentInput): Promise<IInvestment> {
    const investment = new Investment({
      ...input,
      priceHistory: [
        {
          date: new Date(),
          price: input.currentPrice,
        },
      ],
    });

    await investment.save();

    await cacheDelPattern(`investments:${input.userId}:*`);

    logger.info(`Investment created: ${investment.name}`);

    return investment;
  }

  // Get investment by ID
  async getById(investmentId: string, userId: string): Promise<IInvestment> {
    const investment = await Investment.findOne({
      _id: investmentId,
      userId,
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    return investment;
  }

  // Get all investments for user
  async getAll(userId: string, includeInactive = false): Promise<IInvestment[]> {
    const query: Record<string, unknown> = { userId };

    if (!includeInactive) {
      query.isActive = true;
    }

    const investments = await Investment.find(query).sort({ purchaseDate: -1 });

    return investments;
  }

  // Update investment
  async update(input: UpdateInvestmentInput): Promise<IInvestment> {
    const { id, userId, ...updateData } = input;

    const investment = await Investment.findOne({ _id: id, userId });
    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    // If price changed, add to price history
    if (updateData.currentPrice && updateData.currentPrice !== investment.currentPrice) {
      investment.priceHistory.push({
        date: new Date(),
        price: updateData.currentPrice,
      });
    }

    Object.assign(investment, updateData);
    await investment.save();

    await cacheDelPattern(`investments:${userId}:*`);

    return investment;
  }

  // Add shares to existing investment
  async addShares(input: AddSharesInput): Promise<IInvestment> {
    const { investmentId, userId, shares, pricePerShare, date } = input;

    if (shares <= 0) {
      throw new BadRequestError('Shares must be positive');
    }

    const investment = await Investment.findOne({ _id: investmentId, userId });
    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    // Calculate new average purchase price
    const totalCurrentCost = investment.shares * investment.purchasePrice;
    const newCost = shares * pricePerShare;
    const newTotalShares = investment.shares + shares;

    investment.purchasePrice = (totalCurrentCost + newCost) / newTotalShares;
    investment.shares = newTotalShares;

    await investment.save();

    await cacheDelPattern(`investments:${userId}:*`);

    logger.info(`Added ${shares} shares to investment ${investmentId}`);

    return investment;
  }

  // Sell shares
  async sellShares(
    investmentId: string,
    userId: string,
    shares: number,
    salePrice: number
  ): Promise<IInvestment> {
    const investment = await Investment.findOne({ _id: investmentId, userId });
    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    if (shares > investment.shares) {
      throw new BadRequestError('Cannot sell more shares than owned');
    }

    investment.shares -= shares;

    if (investment.shares === 0) {
      investment.isActive = false;
    }

    await investment.save();

    await cacheDelPattern(`investments:${userId}:*`);

    logger.info(`Sold ${shares} shares from investment ${investmentId}`);

    return investment;
  }

  // Delete investment
  async delete(investmentId: string, userId: string): Promise<void> {
    const investment = await Investment.findOne({ _id: investmentId, userId });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    await investment.deleteOne();

    await cacheDelPattern(`investments:${userId}:*`);

    logger.info(`Investment deleted: ${investmentId}`);
  }

  // Get portfolio summary
  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const cacheKey = `investments:${userId}:portfolio`;
    
    const cached = await cacheGet<PortfolioSummary>(cacheKey);
    if (cached) return cached;

    const investments = await this.getAll(userId);

    if (investments.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        byType: [],
        topPerformers: [],
        worstPerformers: [],
      };
    }

    // Calculate totals
    let totalValue = 0;
    let totalCost = 0;

    const byTypeMap = new Map<string, { value: number; cost: number }>();

    const performanceData: { id: string; name: string; gainLossPercent: number }[] = [];

    for (const inv of investments) {
      const value = inv.shares * inv.currentPrice;
      const cost = inv.shares * inv.purchasePrice;
      const gainLossPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;

      totalValue += value;
      totalCost += cost;

      // Group by type
      const typeData = byTypeMap.get(inv.type) || { value: 0, cost: 0 };
      typeData.value += value;
      typeData.cost += cost;
      byTypeMap.set(inv.type, typeData);

      performanceData.push({
        id: inv._id.toString(),
        name: inv.name,
        gainLossPercent,
      });
    }

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Format by type
    const byType = Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
      gainLoss: data.value - data.cost,
    }));

    // Sort for top/worst performers
    const sorted = [...performanceData].sort((a, b) => b.gainLossPercent - a.gainLossPercent);
    const topPerformers = sorted.slice(0, 3);
    const worstPerformers = sorted.slice(-3).reverse();

    const summary: PortfolioSummary = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      byType,
      topPerformers,
      worstPerformers,
    };

    await cacheSet(cacheKey, summary, 300);

    return summary;
  }

  // Update prices (for cron job - would normally call external API)
  async updatePrices(): Promise<void> {
    // This would normally fetch real-time prices from an API
    // For now, we'll just log that it would run
    logger.info('Investment price update job would run here');

    // In production, you would:
    // 1. Get all unique symbols
    // 2. Fetch prices from API (Alpha Vantage, Yahoo Finance, etc.)
    // 3. Update all investments with those symbols
  }

  // Get price history for charting
  async getPriceHistory(
    investmentId: string,
    userId: string,
    days = 30
  ): Promise<{ date: Date; price: number }[]> {
    const investment = await this.getById(investmentId, userId);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return investment.priceHistory.filter((p) => new Date(p.date) >= cutoffDate);
  }
}

export const investmentService = new InvestmentService();
