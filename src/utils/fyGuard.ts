import { AppDatabaseState } from '../services/db';

export const isDateInClosedYear = (dateStr: string, db: AppDatabaseState): boolean => {
  if (!db.financialYears || db.financialYears.length === 0) return false;
  
  const closedYears = db.financialYears.filter(fy => fy.status === 'CLOSED');
  
  for (const fy of closedYears) {
    if (dateStr >= fy.startDate && dateStr <= fy.endDate) {
      return true;
    }
  }
  
  return false;
};

export const validateFyGuard = (dateStr: string, db: AppDatabaseState, isBangla: boolean): boolean => {
  if (isDateInClosedYear(dateStr, db)) {
    alert(isBangla ? 'এই অর্থবছর বন্ধ রয়েছে। নতুন বা পরিবর্তিত লেনদেন করা যাবে না।' : 'This Financial Year is CLOSED. Transactions cannot be created or modified.');
    return false;
  }
  return true;
};
