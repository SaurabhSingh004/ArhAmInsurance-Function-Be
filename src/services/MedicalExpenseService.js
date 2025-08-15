// services/MedicalExpenseService.js
const MedicalExpense = require('../models/medicalExpense');
const { logError } = require('../utils/logError');
const mongoose = require('mongoose');

class MedicalExpenseService {
    /**
     * Create a new medical expense
     * @param {Object} expenseData - Medical expense data
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Created medical expense
     */
    async createMedicalExpense(expenseData, userId) {
        try {
            // Validate required fields
            const requiredFields = ['title', 'amount', 'category'];
            for (const field of requiredFields) {
                if (!expenseData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate amount
            if (expenseData.amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Prepare expense data
            const medicalExpenseData = {
                userId,
                title: expenseData.title.trim(),
                description: expenseData.description?.trim() || '',
                amount: Number(expenseData.amount),
                currency: expenseData.currency || 'INR',
                expenseDate: expenseData.expenseDate ? new Date(expenseData.expenseDate) : new Date(),
                category: expenseData.category,
                paymentMethod: expenseData.paymentMethod || 'cash',
                provider: {
                    name: expenseData.provider?.name?.trim() || '',
                    type: expenseData.provider?.type || 'other',
                    location: expenseData.provider?.location?.trim() || '',
                    contactNumber: expenseData.provider?.contactNumber?.trim() || ''
                },
                notes: expenseData.notes?.trim() || ''
            };

            // Validate expense date
            if (isNaN(medicalExpenseData.expenseDate.getTime())) {
                throw new Error('Invalid expense date format');
            }

            // Create and save the medical expense
            const medicalExpense = new MedicalExpense(medicalExpenseData);
            await medicalExpense.save();

            console.log('Medical expense created with ID:', medicalExpense._id);
            return medicalExpense;

        } catch (error) {
            throw logError('createMedicalExpense', error, { userId });
        }
    }

    /**
     * Get all medical expenses for a user with filters and pagination
     * @param {string} userId - User ID
     * @param {Object} filters - Filter options
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Medical expenses with metadata
     */
    async getAllMedicalExpenses(userId, filters = {}, pagination = {}) {
        try {
            const { page = 1, limit = 10, sortBy = 'expenseDate', sortOrder = 'desc' } = pagination;
            const skip = (page - 1) * limit;

            // Build query
            const query = { userId };

            // Apply filters
            if (filters.category) {
                query.category = filters.category;
            }

            if (filters.paymentMethod) {
                query.paymentMethod = filters.paymentMethod;
            }

            if (filters.providerType) {
                query['provider.type'] = filters.providerType;
            }

            if (filters.startDate || filters.endDate) {
                query.expenseDate = {};
                if (filters.startDate) {
                    query.expenseDate.$gte = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    query.expenseDate.$lte = new Date(filters.endDate);
                }
            }

            if (filters.minAmount || filters.maxAmount) {
                query.amount = {};
                if (filters.minAmount) {
                    query.amount.$gte = Number(filters.minAmount);
                }
                if (filters.maxAmount) {
                    query.amount.$lte = Number(filters.maxAmount);
                }
            }

            if (filters.search) {
                query.$or = [
                    { title: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } },
                    { 'provider.name': { $regex: filters.search, $options: 'i' } },
                    { notes: { $regex: filters.search, $options: 'i' } }
                ];
            }

            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute queries
            const [expenses, totalCount] = await Promise.all([
                MedicalExpense.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),
                MedicalExpense.countDocuments(query)
            ]);

            // Calculate summary statistics
            const summaryStats = await this.calculateSummaryStats(userId, query);

            return {
                expenses,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    hasNext: page * limit < totalCount,
                    hasPrev: page > 1
                },
                summary: summaryStats,
                filters: filters
            };

        } catch (error) {
            throw logError('getAllMedicalExpenses', error, { userId });
        }
    }

    /**
     * Delete a medical expense
     * @param {string} expenseId - Medical expense ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Deletion success
     */
    async deleteMedicalExpense(expenseId, userId) {
        try {
            const expense = await MedicalExpense.findOneAndDelete({ _id: expenseId, userId });
            
            if (!expense) {
                throw new Error('Medical expense not found');
            }

            console.log('Medical expense deleted:', expenseId);
            return true;

        } catch (error) {
            throw logError('deleteMedicalExpense', error, { expenseId, userId });
        }
    }

    /**
     * Get medical expense by ID
     * @param {string} expenseId - Medical expense ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Medical expense
     */
    async getMedicalExpenseById(expenseId, userId) {
        try {
            const expense = await MedicalExpense.findOne({ 
                _id: expenseId, 
                userId 
            });
            
            if (!expense) {
                throw new Error('Medical expense not found');
            }

            return expense;

        } catch (error) {
            throw logError('getMedicalExpenseById', error, { expenseId, userId });
        }
    }

    /**
     * Update medical expense
     * @param {string} expenseId - Medical expense ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated medical expense
     */
    async updateMedicalExpense(expenseId, updateData, userId) {
        try {
            const expense = await MedicalExpense.findOne({ 
                _id: expenseId, 
                userId 
            });
            
            if (!expense) {
                throw new Error('Medical expense not found');
            }

            // Update allowed fields (only fields that exist in the model)
            const allowedFields = [
                'title', 'description', 'amount', 'currency', 'expenseDate', 
                'category', 'paymentMethod', 'provider', 'notes'
            ];

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    expense[key] = updateData[key];
                }
            });

            await expense.save();
            return expense;

        } catch (error) {
            throw logError('updateMedicalExpense', error, { expenseId, userId });
        }
    }

    /**
     * Get expense reports (daily, monthly, yearly)
     * @param {string} userId - User ID
     * @param {string} reportType - Report type: 'daily', 'monthly', 'yearly'
     * @param {Object} options - Report options
     * @returns {Promise<Object>} Expense report
     */
    async getExpenseReports(userId, reportType, options = {}) {
        try {
            const { year = new Date().getFullYear(), month, currency = 'INR' } = options;

            let matchStage = {
                userId: new mongoose.Types.ObjectId(userId)
            };

            let groupStage, sortStage, dateFormat;

            switch (reportType) {
                case 'daily':
                    // Daily report for a specific month
                    if (!month) {
                        throw new Error('Month is required for daily report');
                    }
                    const startDate = new Date(year, month - 1, 1);
                    const endDate = new Date(year, month, 0, 23, 59, 59);
                    
                    matchStage.expenseDate = { $gte: startDate, $lte: endDate };
                    dateFormat = '%Y-%m-%d';
                    groupStage = {
                        _id: {
                            date: { $dateToString: { format: dateFormat, date: '$expenseDate' } },
                            category: '$category'
                        },
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    };
                    sortStage = { '_id.date': 1, '_id.category': 1 };
                    break;

                case 'monthly':
                    // Monthly report for a specific year
                    const yearStart = new Date(year, 0, 1);
                    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
                    
                    matchStage.expenseDate = { $gte: yearStart, $lte: yearEnd };
                    dateFormat = '%Y-%m';
                    groupStage = {
                        _id: {
                            month: { $dateToString: { format: dateFormat, date: '$expenseDate' } },
                            category: '$category'
                        },
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    };
                    sortStage = { '_id.month': 1, '_id.category': 1 };
                    break;

                case 'yearly':
                    // Yearly report for multiple years
                    dateFormat = '%Y';
                    groupStage = {
                        _id: {
                            year: { $dateToString: { format: dateFormat, date: '$expenseDate' } },
                            category: '$category'
                        },
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    };
                    sortStage = { '_id.year': 1, '_id.category': 1 };
                    break;

                default:
                    throw new Error('Invalid report type. Must be daily, monthly, or yearly');
            }

            // Execute aggregation
            const [reportData, totalStats] = await Promise.all([
                MedicalExpense.aggregate([
                    { $match: matchStage },
                    { $group: groupStage },
                    { $sort: sortStage }
                ]),
                MedicalExpense.aggregate([
                    { $match: matchStage },
                    {
                        $group: {
                            _id: null,
                            totalExpenses: { $sum: '$amount' },
                            totalCount: { $sum: 1 },
                            avgExpense: { $avg: '$amount' },
                            maxExpense: { $max: '$amount' },
                            minExpense: { $min: '$amount' }
                        }
                    }
                ])
            ]);

            // Get category-wise summary
            const categoryStats = await MedicalExpense.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$category',
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]);

            // Get provider-wise summary
            const providerStats = await MedicalExpense.aggregate([
                { $match: matchStage },
                { $match: { 'provider.name': { $ne: '' } } },
                {
                    $group: {
                        _id: '$provider.name',
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                },
                { $sort: { totalAmount: -1 } },
                { $limit: 10 }
            ]);

            // Format response
            const formattedReport = this.formatReportData(reportData, reportType);
            const summary = totalStats[0] || {
                totalExpenses: 0,
                totalCount: 0,
                avgExpense: 0,
                maxExpense: 0,
                minExpense: 0
            };

            return {
                reportType,
                period: { year, month },
                currency,
                summary: {
                    ...summary,
                    totalExpenses: Math.round(summary.totalExpenses),
                    avgExpense: Math.round(summary.avgExpense),
                    maxExpense: Math.round(summary.maxExpense),
                    minExpense: Math.round(summary.minExpense)
                },
                categoryBreakdown: categoryStats.map(cat => ({
                    category: cat._id,
                    totalAmount: Math.round(cat.totalAmount),
                    count: cat.count,
                    avgAmount: Math.round(cat.avgAmount),
                    percentage: summary.totalExpenses > 0 ? ((cat.totalAmount / summary.totalExpenses) * 100).toFixed(1) : '0.0'
                })),
                topProviders: providerStats.map(provider => ({
                    name: provider._id,
                    totalAmount: Math.round(provider.totalAmount),
                    count: provider.count,
                    avgAmount: Math.round(provider.avgAmount)
                })),
                detailedReport: formattedReport,
                insights: this.generateInsights(categoryStats, providerStats, summary, reportType)
            };

        } catch (error) {
            throw logError('getExpenseReports', error, { userId, reportType });
        }
    }

    /**
     * Calculate summary statistics
     */
    async calculateSummaryStats(userId, query) {
        try {
            const stats = await MedicalExpense.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' },
                        maxAmount: { $max: '$amount' },
                        minAmount: { $min: '$amount' }
                    }
                }
            ]);

            return stats[0] || {
                totalAmount: 0,
                count: 0,
                avgAmount: 0,
                maxAmount: 0,
                minAmount: 0
            };
        } catch (error) {
            return {
                totalAmount: 0,
                count: 0,
                avgAmount: 0,
                maxAmount: 0,
                minAmount: 0
            };
        }
    }

    /**
     * Format report data based on report type
     */
    formatReportData(reportData, reportType) {
        const formatted = {};
        
        reportData.forEach(item => {
            const key = reportType === 'daily' ? item._id.date : 
                       reportType === 'monthly' ? item._id.month : item._id.year;
            
            if (!formatted[key]) {
                formatted[key] = {
                    period: key,
                    totalAmount: 0,
                    totalCount: 0,
                    categories: {}
                };
            }
            
            formatted[key].totalAmount += item.totalAmount;
            formatted[key].totalCount += item.count;
            formatted[key].categories[item._id.category] = {
                amount: Math.round(item.totalAmount),
                count: item.count,
                avgAmount: Math.round(item.avgAmount)
            };
        });

        return Object.values(formatted).sort((a, b) => a.period.localeCompare(b.period));
    }

    /**
     * Generate insights from report data
     */
    generateInsights(categoryStats, providerStats, summary, reportType) {
        const insights = [];
        
        if (categoryStats.length > 0) {
            const topCategory = categoryStats[0];
            insights.push(`Highest spending category: ${topCategory._id} (₹${Math.round(topCategory.totalAmount)})`);
            
            if (topCategory.totalAmount > summary.totalExpenses * 0.5) {
                insights.push(`${topCategory._id} accounts for more than 50% of total expenses`);
            }
        }

        if (providerStats.length > 0) {
            const topProvider = providerStats[0];
            insights.push(`Most used provider: ${topProvider._id} (₹${Math.round(topProvider.totalAmount)})`);
        }

        if (summary.avgExpense > 5000) {
            insights.push('Average expense is relatively high - consider reviewing spending patterns');
        }

        if (reportType === 'monthly' && summary.totalExpenses > 50000) {
            insights.push('Monthly medical expenses exceed ₹50,000 - ensure adequate healthcare budget');
        }

        return insights.length > 0 ? insights : ['No specific insights available for this period'];
    }
}

module.exports = new MedicalExpenseService();   