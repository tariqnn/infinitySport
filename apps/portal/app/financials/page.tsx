'use client';

import { useState } from 'react';
import { PageHeader } from '../_components/ui';
import { BudgetPlanning } from './_components/BudgetPlanning';
import { InvoiceManagement } from './_components/InvoiceManagement';
import { CashFlow } from './_components/CashFlow';
import { PettyCash } from './_components/PettyCash';
import { ChartBarIcon, DocumentTextIcon, ArrowPathIcon, WalletIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const tabs = [
  { id: 'budget', label: 'Budget Planning', icon: ChartBarIcon },
  { id: 'invoices', label: 'Invoice Management', icon: DocumentTextIcon },
  { id: 'cashflow', label: 'Cash Flow', icon: ArrowPathIcon },
  { id: 'pettycash', label: 'Petty Cash', icon: WalletIcon },
];

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState('budget');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Management"
        subtitle="Manage budgets, invoices, cash flow, and petty cash"
      />

      {/* Tabs */}
      <div className="border-b border-borderColor">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-primaryBlue text-primaryBlue'
                    : 'border-transparent text-textMuted hover:border-textMuted/50 hover:text-textPrimary'
                )}
              >
                <Icon className={clsx('h-5 w-5', isActive ? 'text-primaryBlue' : 'text-textMuted group-hover:text-textPrimary')} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'budget' && <BudgetPlanning />}
        {activeTab === 'invoices' && <InvoiceManagement />}
        {activeTab === 'cashflow' && <CashFlow />}
        {activeTab === 'pettycash' && <PettyCash />}
      </div>
    </div>
  );
}
