import { Investment, InvestmentStatus } from '../types';

/**
 * Authoritative function to calculate outstanding principal for an investment.
 *
 * Formula:
 *   originalInvestmentAmount - totalReturnedPrincipal
 *
 * Features:
 *   - Uses originalPrincipal (or fallback investmentAmount)
 *   - Deducts returnedPrincipal
 *   - Protects against negative values using Math.max(0, ...)
 *   - Profit and loss are kept strictly separate and do NOT reduce the principal balance.
 *
 * @param investment Investment object or partial investment data
 * @returns Outstanding principal amount (always >= 0)
 */
export function calculateInvestmentOutstanding(
  investment: Partial<Investment> | null | undefined
): number {
  if (!investment) return 0;
  const original = investment.originalPrincipal ?? investment.investmentAmount ?? 0;
  const returned = investment.returnedPrincipal ?? 0;
  return Math.max(0, original - returned);
}

/**
 * Authoritative function to resolve the current investment status based on the defined workflow:
 * DRAFT -> PENDING_APPROVAL -> APPROVED -> ACTIVE -> PARTIAL_RETURN -> COMPLETED
 *
 * Status Transition Logic:
 * 1. Pre-execution / Administrative states are preserved:
 *    - DRAFT
 *    - PENDING_APPROVAL / PROPOSED
 *    - APPROVED
 *    - REJECTED
 *    - CANCELLED
 * 2. Post-execution states are determined strictly by outstanding principal:
 *    - outstandingPrincipal === 0 (or <= 0) => COMPLETED
 *    - returnedPrincipal > 0 and outstandingPrincipal > 0 => PARTIAL_RETURN
 *    - returnedPrincipal === 0 and outstandingPrincipal > 0 => ACTIVE
 *
 * Important Rules:
 * - Profit received does NOT determine completion.
 * - Outstanding principal === 0 is the sole authoritative completion condition for executed investments.
 *
 * @param investment Investment object or partial investment data
 * @returns InvestmentStatus
 */
export function getInvestmentStatus(
  investment: Partial<Investment> | null | undefined
): InvestmentStatus {
  if (!investment) return 'ACTIVE';

  // 1. Preserve explicit workflow / administrative states
  if (investment.status === 'DRAFT') return 'DRAFT';
  if (investment.status === 'PENDING_APPROVAL' || investment.status === 'PROPOSED') return 'PENDING_APPROVAL';
  if (investment.status === 'APPROVED') return 'APPROVED';
  if (investment.status === 'REJECTED') return 'REJECTED';
  if (investment.status === 'CANCELLED') return 'CANCELLED';

  // 2. Authoritative calculation based on outstanding principal
  const outstanding = calculateInvestmentOutstanding(investment);

  if (outstanding <= 0) {
    return 'COMPLETED';
  }

  if ((investment.returnedPrincipal ?? 0) > 0) {
    return 'PARTIAL_RETURN';
  }

  return 'ACTIVE';
}

/**
 * InvestmentService class providing static helpers for investment operations.
 */
export class InvestmentService {
  /**
   * Calculates outstanding principal for an investment.
   */
  static calculateInvestmentOutstanding(investment: Partial<Investment> | null | undefined): number {
    return calculateInvestmentOutstanding(investment);
  }

  /**
   * Evaluates the authoritative status for an investment according to workflow rules.
   */
  static getInvestmentStatus(investment: Partial<Investment> | null | undefined): InvestmentStatus {
    return getInvestmentStatus(investment);
  }

  /**
   * Helper to resolve status upon execution from APPROVED state.
   */
  static resolveExecutedStatus(investment: Partial<Investment>): InvestmentStatus {
    return getInvestmentStatus({
      ...investment,
      status: undefined, // Clear out pre-execution state so it resolves based on principal
      returnedPrincipal: investment.returnedPrincipal ?? 0
    });
  }

  /**
   * Helper to resolve status upon receiving a return payment.
   */
  static resolvePostReturnStatus(investment: Partial<Investment>): InvestmentStatus {
    return getInvestmentStatus({
      ...investment,
      status: undefined // Clear out previous state so it calculates COMPLETED / PARTIAL_RETURN / ACTIVE
    });
  }

  /**
   * Helper to validate if an investment principal return is valid.
   */
  static validatePrincipalReturn(
    investment: Partial<Investment>,
    returnAmount: number
  ): { valid: boolean; message?: string } {
    if (returnAmount < 0) {
      return { valid: false, message: 'ফেরতের পরিমাণ ঋণাত্মক হতে পারে না।' };
    }
    const outstanding = calculateInvestmentOutstanding(investment);
    if (returnAmount > outstanding) {
      return {
        valid: false,
        message: `ফেরতকৃত আসল (৳${returnAmount}) বকেয়া আসলের (৳${outstanding}) চেয়ে বেশি হতে পারবে না।`
      };
    }
    return { valid: true };
  }
}
