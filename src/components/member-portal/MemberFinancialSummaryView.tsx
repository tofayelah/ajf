import React from 'react';
import { KeyFinancialIndicators } from '../dashboard/KeyFinancialIndicators';

export const MemberFinancialSummaryView: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <KeyFinancialIndicators showTitle={true} />
    </div>
  );
};

