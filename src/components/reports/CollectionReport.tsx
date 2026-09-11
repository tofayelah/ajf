import React from 'react';
import { AppDatabaseState } from '../../services/db';
import { MonthlyCollectionStatementReport } from './MonthlyCollectionStatementReport';

export { MonthlyCollectionStatementReport };

export const CollectionReport: React.FC<{ db: AppDatabaseState; onDrillDown?: (item: any) => void }> = ({
  db,
  onDrillDown
}) => {
  return <MonthlyCollectionStatementReport db={db} onDrillDown={onDrillDown} />;
};
