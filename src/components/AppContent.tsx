import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import SubscriptionPage from './SubscriptionPage';
import Dashboard from './Dashboard';
import AIChat from './AIChat';
import Transactions from './Transactions';
import SmartAlerts from './SmartAlerts';
import Income from './Income';
import BankAccounts from './BankAccounts';
import Investments from './Investments';
import Retirement from './Retirement';
import RealEstate from './RealEstate';
import FinancialGoals from './FinancialGoals';
import Vehicles from './Vehicles';
import ExoticAssets from './ExoticAssets';
import Loans from './Loans';
import Bills from './Bills';
import Documents from './Documents';
import Employees from './Employees';
import AIInsights from './AIInsights';
import ExpenseManagement from './ExpenseManagement';
import RevenueManagement from './RevenueManagement';
import PatrimonyManagement from './PatrimonyManagement';
import FloatingChatButton from './FloatingChatButton';
import AccessManagement from './AccessManagement';
import UserProfile from './UserProfile';
import TrialExpiredModal from './TrialExpiredModal';
import PaymentFailedModal from './PaymentFailedModal';
import AdminPanel from './AdminPanel';

export default function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAdmin, isInTrial, trialExpiresAt, userPlan } = useAuth(); 
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);
  const [showPaymentFailedModal, setShowPaymentFailedModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Force subscription page when trial days left is 0
  const { trialDaysLeft } = useAuth();
  
  // Check if trial has expired
  React.useEffect(() => {
    if (isInTrial && trialExpiresAt) {
      const now = new Date();
      if (trialExpiresAt < now) {
        setShowTrialExpiredModal(true);
      }
    }
  }, [isInTrial, trialExpiresAt]);
  
  // Listen for payment failed events
  React.useEffect(() => {
    const handlePaymentFailed = () => {
      setShowPaymentFailedModal(true);
    };
    
    window.addEventListener('paymentFailed', handlePaymentFailed);
    
    return () => {
      window.removeEventListener('paymentFailed', handlePaymentFailed);
    };
  }, []);

  // Check if we should show subscription page
  const shouldShowSubscriptionPage = () => {
    // If trial days left is 0 or trial has expired or subscription has ended, only show subscription page
    // Admin users are exempt from this restriction
    if (!isAdmin && (trialDaysLeft === 0 ||
        (isInTrial && trialExpiresAt && trialExpiresAt < new Date()) || 
        (!isInTrial && !userPlan))) {
      return true;
    }
    // Otherwise, show the selected tab content
    return false;
  };

  const renderContent = () => {
    // If trial expired or no subscription, force subscription page
    if (shouldShowSubscriptionPage()) {
      return <SubscriptionPage />;
    }
    
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'smart-alerts':
        return <SmartAlerts />;
      case 'access':
        return <AccessManagement />;
      case 'revenues':
        return <RevenueManagement />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'patrimony':
        return <PatrimonyManagement />;
      case 'transactions':
        return <Transactions />;
      case 'income':
        return <Income />;
      case 'bank-accounts':
        return <BankAccounts />;
      case 'investments':
        return <Investments />;
      case 'retirement':
        return <Retirement />;
      case 'real-estate':
        return <RealEstate />;
      case 'vehicles':
        return <Vehicles />;
      case 'exotic-assets':
        return <ExoticAssets />;
      case 'loans':
        return <Loans />;
      case 'bills':
        return <Bills />;
      case 'documents':
        return <Documents />;
      case 'employees':
        return <Employees />;
      case 'insights':
        return <AIInsights />;
      case 'profile':
        return <UserProfile />;
      case 'financial-goals':
        return <FinancialGoals />;
      case 'admin':
        return isAdmin ? <AdminPanel /> : <Dashboard />;
      case 'subscription':
        return <SubscriptionPage />;
      case 'cards':
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cartões</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Configurações</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">      
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main content */}
      <main className="pt-16 lg:pt-0 px-4 sm:px-6 lg:px-8 lg:ml-64">
        <div className="max-w-7xl mx-auto py-4 sm:py-6">
          {renderContent()}
        </div>
      </main>
      
      <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col space-y-2 z-30">
        <FloatingChatButton />
      </div>
      
      {/* Modals */}
      <TrialExpiredModal 
        isOpen={showTrialExpiredModal} 
        onClose={() => setShowTrialExpiredModal(false)} 
      />
      <PaymentFailedModal 
        isOpen={showPaymentFailedModal} 
        onClose={() => setShowPaymentFailedModal(false)} 
      />
    </div>
  );
}