// ========================================
// EMI CALCULATOR SERVICE
// services/EmiService.js
// ========================================

const { logError } = require('../utils/logError');

class EmiService {
    /**
     * Calculate EMI and related loan details
     * @param {Object} loanData - Loan calculation parameters
     * @returns {Object} Calculated EMI details
     */
    calculateEMI(loanData) {
        try {
            const { principal, interestRate, tenure, tenureType = 'years' } = loanData;

            // Validate inputs
            this.validateInputs(principal, interestRate, tenure, tenureType);

            // Convert tenure to months if needed
            const tenureInMonths = tenureType === 'years' ? tenure * 12 : tenure;

            // Convert annual interest rate to monthly rate
            const monthlyInterestRate = interestRate / 12 / 100;

            // Calculate EMI using formula: EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]
            let emi = 0;
            if (monthlyInterestRate === 0) {
                // If interest rate is 0, EMI is simply principal divided by tenure
                emi = principal / tenureInMonths;
            } else {
                const numerator = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths);
                const denominator = Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1;
                emi = numerator / denominator;
            }

            // Calculate totals
            const totalAmount = emi * tenureInMonths;
            const totalInterest = totalAmount - principal;

            // Generate payment schedule
            const paymentSchedule = this.generatePaymentSchedule(principal, emi, monthlyInterestRate, tenureInMonths);

            return {
                success: true,
                data: {
                    loanDetails: {
                        principal: Math.round(principal),
                        interestRate: interestRate,
                        tenure: tenure,
                        tenureType: tenureType,
                        tenureInMonths: tenureInMonths
                    },
                    calculatedValues: {
                        emi: Math.round(emi),
                        totalAmount: Math.round(totalAmount),
                        totalInterest: Math.round(totalInterest),
                        interestPercentage: ((totalInterest / principal) * 100).toFixed(2)
                    },
                    breakdown: {
                        monthlyEmi: Math.round(emi),
                        yearlyPayment: Math.round(emi * 12),
                        principalToInterestRatio: `${((principal / totalAmount) * 100).toFixed(1)}% : ${((totalInterest / totalAmount) * 100).toFixed(1)}%`
                    },
                    paymentSchedule: paymentSchedule.slice(0, 12), // First 12 months
                    summary: {
                        affordabilityCheck: this.getAffordabilityInsights(emi),
                        recommendation: this.getRecommendations(loanData, emi, totalInterest)
                    }
                },
                message: 'EMI calculated successfully'
            };

        } catch (error) {
            throw logError('calculateEMI', error);
        }
    }

    /**
     * Calculate loan amount based on EMI affordability
     * @param {Object} affordabilityData - EMI and other parameters
     * @returns {Object} Maximum loan amount details
     */
    calculateLoanAmount(affordabilityData) {
        try {
            const { emi, interestRate, tenure, tenureType = 'years' } = affordabilityData;

            // Validate inputs
            this.validateAffordabilityInputs(emi, interestRate, tenure, tenureType);

            const tenureInMonths = tenureType === 'years' ? tenure * 12 : tenure;
            const monthlyInterestRate = interestRate / 12 / 100;

            // Calculate principal using reverse EMI formula
            let principal = 0;
            if (monthlyInterestRate === 0) {
                principal = emi * tenureInMonths;
            } else {
                const denominator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths);
                const numerator = Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1;
                principal = (emi * numerator) / denominator;
            }

            const totalAmount = emi * tenureInMonths;
            const totalInterest = totalAmount - principal;

            return {
                success: true,
                data: {
                    affordabilityDetails: {
                        maxLoanAmount: Math.round(principal),
                        monthlyEmi: Math.round(emi),
                        totalAmount: Math.round(totalAmount),
                        totalInterest: Math.round(totalInterest),
                        tenure: tenure,
                        tenureType: tenureType,
                        interestRate: interestRate
                    },
                    insights: {
                        principalPercentage: ((principal / totalAmount) * 100).toFixed(1),
                        interestPercentage: ((totalInterest / totalAmount) * 100).toFixed(1),
                        monthlyIncomeRequired: Math.round(emi * 3), // Assuming EMI should be 30% of income
                        recommendation: this.getLoanAmountRecommendation(principal, emi)
                    }
                },
                message: 'Loan amount calculated successfully'
            };

        } catch (error) {
            throw logError('calculateLoanAmount', error);
        }
    }

    /**
     * Compare multiple loan options
     * @param {Array} loanOptions - Array of loan scenarios
     * @returns {Object} Comparison results
     */
    compareLoanOptions(loanOptions) {
        try {
            if (!Array.isArray(loanOptions) || loanOptions.length < 2) {
                throw new Error('At least 2 loan options required for comparison');
            }

            const comparisonResults = loanOptions.map((option, index) => {
                const result = this.calculateEMI(option);
                return {
                    optionId: index + 1,
                    optionName: option.name || `Option ${index + 1}`,
                    ...result.data
                };
            });

            // Find best options
            const lowestEmi = comparisonResults.reduce((min, current) => 
                current.calculatedValues.emi < min.calculatedValues.emi ? current : min
            );

            const lowestTotalInterest = comparisonResults.reduce((min, current) => 
                current.calculatedValues.totalInterest < min.calculatedValues.totalInterest ? current : min
            );

            return {
                success: true,
                data: {
                    comparison: comparisonResults,
                    bestOptions: {
                        lowestEmi: {
                            optionName: lowestEmi.optionName,
                            emi: lowestEmi.calculatedValues.emi,
                            totalInterest: lowestEmi.calculatedValues.totalInterest
                        },
                        lowestTotalInterest: {
                            optionName: lowestTotalInterest.optionName,
                            emi: lowestTotalInterest.calculatedValues.emi,
                            totalInterest: lowestTotalInterest.calculatedValues.totalInterest
                        }
                    },
                    recommendation: this.getComparisonRecommendation(comparisonResults)
                },
                message: 'Loan options compared successfully'
            };

        } catch (error) {
            throw logError('compareLoanOptions', error);
        }
    }

    /**
     * Validate EMI calculation inputs
     */
    validateInputs(principal, interestRate, tenure, tenureType) {
        if (!principal || principal <= 0) {
            throw new Error('Principal amount must be a positive number');
        }
        if (principal > 100000000) { // 10 crores max
            throw new Error('Principal amount cannot exceed ₹10,00,00,000');
        }
        if (interestRate < 0 || interestRate > 50) {
            throw new Error('Interest rate must be between 0% and 50%');
        }
        if (!tenure || tenure <= 0) {
            throw new Error('Tenure must be a positive number');
        }
        if (tenureType === 'years' && tenure > 50) {
            throw new Error('Tenure cannot exceed 50 years');
        }
        if (tenureType === 'months' && tenure > 600) {
            throw new Error('Tenure cannot exceed 600 months');
        }
        if (!['years', 'months'].includes(tenureType)) {
            throw new Error('Tenure type must be either "years" or "months"');
        }
    }

    /**
     * Validate affordability calculation inputs
     */
    validateAffordabilityInputs(emi, interestRate, tenure, tenureType) {
        if (!emi || emi <= 0) {
            throw new Error('EMI amount must be a positive number');
        }
        if (emi > 1000000) {
            throw new Error('EMI amount cannot exceed ₹10,00,000');
        }
        if (interestRate < 0 || interestRate > 50) {
            throw new Error('Interest rate must be between 0% and 50%');
        }
        if (!tenure || tenure <= 0) {
            throw new Error('Tenure must be a positive number');
        }
        if (!['years', 'months'].includes(tenureType)) {
            throw new Error('Tenure type must be either "years" or "months"');
        }
    }

    /**
     * Generate detailed payment schedule
     */
    generatePaymentSchedule(principal, emi, monthlyRate, tenureInMonths) {
        const schedule = [];
        let remainingPrincipal = principal;

        for (let month = 1; month <= Math.min(tenureInMonths, 60); month++) { // Max 60 months in response
            const interestPayment = remainingPrincipal * monthlyRate;
            const principalPayment = emi - interestPayment;
            remainingPrincipal -= principalPayment;

            schedule.push({
                month: month,
                emi: Math.round(emi),
                principalPayment: Math.round(principalPayment),
                interestPayment: Math.round(interestPayment),
                remainingPrincipal: Math.round(Math.max(0, remainingPrincipal))
            });

            if (remainingPrincipal <= 0) break;
        }

        return schedule;
    }

    /**
     * Get affordability insights
     */
    getAffordabilityInsights(emi) {
        return {
            recommendedMonthlyIncome: Math.round(emi * 3.33), // EMI should be max 30% of income
            emiAsPercentageOf50k: ((emi / 50000) * 100).toFixed(1),
            emiAsPercentageOf100k: ((emi / 100000) * 100).toFixed(1),
            category: emi < 10000 ? 'Low' : emi < 25000 ? 'Medium' : emi < 50000 ? 'High' : 'Very High'
        };
    }

    /**
     * Get recommendations based on loan details
     */
    getRecommendations(loanData, emi, totalInterest) {
        const recommendations = [];
        
        if (totalInterest > loanData.principal * 0.5) {
            recommendations.push('Consider reducing tenure to save on interest');
        }
        if (emi > 50000) {
            recommendations.push('High EMI - ensure this fits your budget');
        }
        if (loanData.interestRate > 15) {
            recommendations.push('Interest rate is high - consider shopping for better rates');
        }
        if (loanData.tenure > 20) {
            recommendations.push('Long tenure increases total interest cost');
        }

        return recommendations.length > 0 ? recommendations : ['Loan parameters look reasonable'];
    }

    /**
     * Get loan amount recommendations
     */
    getLoanAmountRecommendation(principal, emi) {
        if (emi > 50000) {
            return 'Consider reducing loan amount for better affordability';
        } else if (emi < 10000) {
            return 'You may qualify for a higher loan amount if needed';
        } else {
            return 'Loan amount appears to be within affordable range';
        }
    }

    /**
     * Get comparison recommendations
     */
    getComparisonRecommendation(results) {
        const recommendations = [];
        
        recommendations.push('Choose the option with lowest total interest for long-term savings');
        recommendations.push('Consider the option with lowest EMI if cash flow is a concern');
        
        return recommendations;
    }
}

module.exports = new EmiService();