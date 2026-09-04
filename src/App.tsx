
import { AccountingService } from './services/accounting';
import { getInitialDatabase } from './services/db';

(window as any).AccountingService = AccountingService;
(window as any).getInitialDatabase = getInitialDatabase;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';

// Layout
import { TopAppBar } from './components/layout/TopAppBar';
import { AppDrawer } from './components/layout/AppDrawer';
import { LoginView } from './components/auth/LoginView';
import { BottomNavigationBar } from './components/layout/BottomNavigationBar';
import { SpeedDialFab } from './components/layout/SpeedDialFab';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { BackupPromptAlert } from './components/layout/BackupPromptAlert';

// Views

import { MemberSettlementDashboardView } from './components/settlement/MemberSettlementDashboardView';
import { NormalMemberExitView } from './components/settlement/NormalMemberExitView';
import { EarlyMemberExitView } from './components/settlement/EarlyMemberExitView';
import { EarlyExitRequestsView } from './components/settlement/EarlyExitRequestsView';
import { DeathSettlementView } from './components/settlement/DeathSettlementView';
import { PendingSettlementApprovalsView } from './components/settlement/PendingSettlementApprovalsView';
import { CompletedSettlementsView } from './components/settlement/CompletedSettlementsView';
import { SettlementReportsView } from './components/settlement/SettlementReportsView';

import { DashboardView } from './components/dashboard/DashboardView';
import { MemberMasterView } from './components/members/MemberMasterView';
import { AdmissionWorkflowView } from './components/admission/AdmissionWorkflowView';
import { MonthlyCollectionView } from './components/collections/MonthlyCollectionView';
import { DueManagementView } from './components/collections/DueManagementView';
import { CapitalDepositView } from './components/capital/CapitalDepositView';
import { LoansView } from './components/loans/LoansView';
import { InvestmentsView } from './components/investments/InvestmentsView';
import { CashBookView } from './components/accounts/CashBookView';
import { BankBookView } from './components/accounts/BankBookView';
import { IncomeExpenseView } from './components/accounts/IncomeExpenseView';
import { ChartOfAccountsView } from './components/accounts/ChartOfAccountsView';
import { WelfareFundView } from './components/welfare/WelfareFundView';
import { ProfitDistributionView } from './components/profit/ProfitDistributionView';
import { MeetingsView } from './components/meetings/MeetingsView';
import { ResolutionsView } from './components/meetings/ResolutionsView';
import { ReportsCenterView } from './components/reports/ReportsCenterView';
import { CommitteeManagementView } from './components/committee/CommitteeManagementView';
import { SettingsView } from './components/settings/SettingsView';
import { FinancialYearView } from './components/settings/FinancialYearView';
import { CashReconciliationView } from './components/reconciliation/CashReconciliationView';
import { BankReconciliationView } from './components/reconciliation/BankReconciliationView';

import { UsersRolesView } from './components/users/UsersRolesView';
import { AuditLogView } from './components/audit/AuditLogView';
import { IntegrityCheckView } from './components/audit/IntegrityCheckView';
import { MemberProfileView } from './components/member-portal/MemberProfileView';
import { MemberLedgerView } from './components/member-portal/MemberLedgerView';
import { MemberNotificationsView } from './components/member-portal/MemberNotificationsView';
import { MemberLoginNotificationModal } from './components/notifications/MemberLoginNotificationModal';
import { NotificationManagementView } from './components/notifications/NotificationManagementView';
import { MemberFinancialSummaryView } from './components/member-portal/MemberFinancialSummaryView';
import { MemberChandaPaymentView } from './components/member-portal/MemberChandaPaymentView';
import { MemberMoreView } from './components/member-portal/MemberMoreView';
import { PaymentRequestsAdminView } from './components/admin/PaymentRequestsAdminView';
import { BackupRestoreView } from './components/settings/BackupRestoreView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const ScreenRenderer = ({ onQuickAction }: { onQuickAction: (action: string) => void }) => {
  const { activeScreen, selectedMemberId, navigateTo, activeUser } = useApp();
  const [collectionMemberId, setCollectionMemberId] = useState<string | null>(null);

  const handleOpenCollection = (memberId: string) => {
    setCollectionMemberId(memberId);
    navigateTo('COLLECTIONS');
  };

  switch (activeScreen) {
    case 'DASHBOARD': return <DashboardView onQuickAction={onQuickAction} />;
    case 'MEMBERS':
    case 'MEMBER_MASTER' as any: 
      return <MemberMasterView onOpenCollection={handleOpenCollection} />;
    case 'ADMISSION':
    case 'REGISTRATION' as any: 
      return <AdmissionWorkflowView />;
    case 'COLLECTIONS':
    case 'COLLECTION' as any: 
      return <MonthlyCollectionView preSelectedMemberId={collectionMemberId} />;
    case 'DUE_MANAGEMENT': return <DueManagementView onOpenCollection={handleOpenCollection} />;
    case 'CAPITAL':
    case 'CAPITAL_DEPOSIT' as any:
    case 'RESERVE_UTILIZATION' as any:
      return <CapitalDepositView />;
    case 'LOANS':
    case 'LOAN' as any: 
      return <LoansView />;
    case 'INVESTMENTS':
    case 'INVESTMENT' as any: 
      return <InvestmentsView />;
    case 'CASH_BOOK':
    case 'CASH' as any: 
      return <CashBookView />;
    case 'BANK_BOOK':
    case 'BANK' as any: 
      return <BankBookView />;
    case 'CASH_RECONCILIATION': return <CashReconciliationView />;
    case 'BANK_RECONCILIATION': return <BankReconciliationView />;
    case 'INCOME_EXPENSE':
    case 'INCOME' as any:
    case 'EXPENSE' as any:
      return <IncomeExpenseView />;
    case 'ACCOUNTS':
    case 'CHART_OF_ACCOUNTS' as any: 
      return <ChartOfAccountsView />;
    case 'WELFARE': return <WelfareFundView />;
    case 'PROFIT':
    case 'PROFIT_DISTRIBUTION' as any: 
      return <ProfitDistributionView />;
    case 'MEETINGS':
    case 'MEETING' as any: 
      return <MeetingsView />;
    case 'RESOLUTIONS':
    case 'RESOLUTION' as any: 
      return <ResolutionsView />;
    case 'REPORTS':
    case 'TRIAL_BALANCE' as any:
    case 'INCOME_STATEMENT' as any:
    case 'BALANCE_SHEET' as any:
    case 'FINANCIAL_STATEMENTS' as any:
      return <ReportsCenterView />;
    case 'MEMBER_FINANCIAL_SUMMARY':
    case 'FINANCIAL_SUMMARY':
    case 'SOCIETY_FINANCIAL_STATUS' as any:
    case 'FINANCIAL_STATUS' as any:
      return <MemberFinancialSummaryView />;
    case 'SETTINGS': return <SettingsView />;
    case 'FINANCIAL_YEAR': return <FinancialYearView />;
    case 'USERS':
    case 'USER_MANAGEMENT' as any:
    case 'ROLE_PERMISSION' as any:
      return <UsersRolesView />;
    case 'AUDIT_LOG':
    case 'AUDIT_TRAIL' as any: 
      return <AuditLogView />;
    case 'INTEGRITY_CHECK':
    case 'INTEGRITY_AUDIT' as any:
    case 'ACCOUNTING_INTEGRITY' as any:
      return <IntegrityCheckView />;
    case 'BACKUP_RESTORE': return <BackupRestoreView />;
    case 'PROFILE': return <MemberProfileView />;
    case 'MEMBER_PROFILE': return <MemberProfileView />;
    case 'MEMBER_LEDGER':
    case 'LEDGER': 
      return <MemberLedgerView initialMemberId={selectedMemberId || undefined} />;
    case 'NOTIFICATIONS': 
      return (activeUser?.role === 'ADMIN' || activeUser?.role === 'ACCOUNTANT')
        ? <NotificationManagementView />
        : <MemberNotificationsView />;

    case 'MEMBER_SETTLEMENT':
    case 'SETTLEMENT_DASHBOARD':
    case 'MEMBER_SETTLEMENT_DASHBOARD' as any: 
      return <MemberSettlementDashboardView />;
    case 'NORMAL_MEMBER_EXIT': return <NormalMemberExitView />;
    case 'EARLY_MEMBER_EXIT': return <EarlyMemberExitView />;
    case 'EARLY_EXIT_REQUESTS': return <EarlyExitRequestsView />;
    case 'DEATH_SETTLEMENT': return <DeathSettlementView />;
    case 'PENDING_SETTLEMENT_APPROVALS': return <PendingSettlementApprovalsView />;
    case 'COMPLETED_SETTLEMENTS': return <CompletedSettlementsView />;
    case 'SETTLEMENT_REPORTS': return <SettlementReportsView />;
    case 'COMMITTEE_MANAGEMENT': return <CommitteeManagementView />;
    case 'PAYMENT_REQUESTS': return <PaymentRequestsAdminView />;
    case 'MEMBER_CHANDA_PAYMENT': return <MemberChandaPaymentView />;
    case 'MORE': return activeUser?.role === 'MEMBER' ? <MemberMoreView /> : <ReportsCenterView />;

    default:
      return <DashboardView onQuickAction={onQuickAction} />;
  }
};

const RoleGuard = ({ children }: { children: React.ReactNode }) => {
  const { activeUser, activeScreen, language } = useApp();
  const isBangla = language === 'bn';

  if (activeUser?.role === 'MEMBER') {
    const allowedScreens = [
      'DASHBOARD', 'PROFILE', 'MEMBER_PROFILE', 'MEMBER_LEDGER', 'LEDGER', 'NOTIFICATIONS',
      'MEMBER_FINANCIAL_SUMMARY', 'FINANCIAL_SUMMARY', 'SOCIETY_FINANCIAL_STATUS', 'FINANCIAL_STATUS',
      'MEMBER_CHANDA_PAYMENT', 'MORE'
    ];

    if (!allowedScreens.includes(activeScreen as string)) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center mt-20">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-black">!</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {isBangla ? 'প্রবেশাধিকার নেই' : 'Unauthorized Access'}
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            {isBangla 
              ? 'এই পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।' 
              : 'You do not have permission to view this page.'}
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
};

const MainLayout = () => {
  const { 
    notificationMessage, 
    navigateTo, 
    isAuthenticated, 
    isDbLoading,
    activeLoginNotifications,
    setActiveLoginNotifications,
    loginSessionId
  } = useApp() as any;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'NEW_MEMBER': navigateTo('ADMISSION'); break;
      case 'MEMBER_LEDGER': navigateTo('MEMBER_LEDGER'); break;
      case 'COLLECT_MONTHLY': navigateTo('COLLECTIONS'); break;
      case 'CAPITAL_DEPOSIT': navigateTo('CAPITAL'); break;
      case 'LOAN_APPLICATION': navigateTo('LOANS'); break;
      case 'LOAN_REPAYMENT': navigateTo('LOANS'); break;
      case 'RECORD_INCOME': navigateTo('INCOME_EXPENSE'); break;
      case 'RECORD_EXPENSE': navigateTo('INCOME_EXPENSE'); break;
      case 'WELFARE_PAYMENT': navigateTo('WELFARE'); break;
      default: navigateTo('DASHBOARD'); break;
    }
  };

  if (isDbLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      {/* Member Login Notification Popup Modal - Blocks Background View & Navigation Until Dismissed */}
      {activeLoginNotifications && activeLoginNotifications.length > 0 && (
        <MemberLoginNotificationModal
          notifications={activeLoginNotifications}
          loginSessionId={loginSessionId}
          onComplete={() => setActiveLoginNotifications([])}
        />
      )}

      <AppDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TopAppBar onOpenDrawer={() => setIsDrawerOpen(true)} />
        <BackupPromptAlert />
        <main className="flex-1 relative pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <RoleGuard>
            <ErrorBoundary>
              <ScreenRenderer onQuickAction={handleQuickAction} />
            </ErrorBoundary>
          </RoleGuard>
        </main>
      </div>

      {/* Viewport-fixed mobile-only bottom nav */}
      <BottomNavigationBar />

      <SpeedDialFab onQuickAction={handleQuickAction} />
      
      <GlobalSearchModal />
      
      {/* Global Notification Toast */}
      {notificationMessage && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4
          ${notificationMessage.type === 'success' ? 'bg-emerald-800 text-white' : 
            notificationMessage.type === 'error' ? 'bg-red-600 text-white' : 
            'bg-slate-800 text-white'}`}
        >
          {notificationMessage.text}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}

