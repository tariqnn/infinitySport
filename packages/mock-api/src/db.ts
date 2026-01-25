import introSeed from '../data/intro.json';
import sportsSeed from '../data/sports.json';
import facilitiesSeed from '../data/facilities.json';
import eventsSeed from '../data/events.json';
import newsSeed from '../data/news.json';
import docsSeed from '../data/docs.json';
import directorySeed from '../data/directory.json';
import budgetSeed from '../data/budget.json';
import invoicesSeed from '../data/invoices.json';
import cashflowSeed from '../data/cashflow.json';
import pettyCashSeed from '../data/pettycash.json';
import landingSeed from '../data/landing-content.json';
import basketballPackagesSeed from '../data/basketball-packages.json';
import {
  IntroContent,
  Sport,
  Facility,
  EventItem,
  NewsItem,
  DocItem,
  DirectoryEntry,
  BudgetLine,
  Invoice,
  CashFlowEntry,
  PettyCashTxn,
  LandingContent,
  landingContentSchema,
  docItemSchema,
  pettyCashTxnSchema,
} from '@infinity/types';

export interface MockDatabase {
  intro: IntroContent;
  sports: Sport[];
  facilities: Facility[];
  events: EventItem[];
  news: NewsItem[];
  docs: DocItem[];
  directory: DirectoryEntry[];
  budget: BudgetLine[];
  invoices: Invoice[];
  cashflow: CashFlowEntry[];
  pettycash: PettyCashTxn[];
  landing: LandingContent;
}

export const db: MockDatabase = {
  intro: structuredClone(introSeed) as IntroContent,
  sports: structuredClone(sportsSeed) as Sport[],
  facilities: structuredClone(facilitiesSeed),
  events: structuredClone(eventsSeed),
  news: structuredClone(newsSeed),
  docs: structuredClone(docsSeed).map((doc: unknown) => docItemSchema.parse(doc)),
  directory: structuredClone(directorySeed),
  budget: structuredClone(budgetSeed),
  invoices: (structuredClone(invoicesSeed) as Record<string, unknown>[]).map((invoice) => ({
    ...invoice,
    status: invoice.status as Invoice['status'],
    currency: invoice.currency as Invoice['currency'],
  })) as Invoice[],
  cashflow: (structuredClone(cashflowSeed) as Record<string, unknown>[]).map((entry) => ({
    ...entry,
    category: entry.category as CashFlowEntry['category'],
    currency: entry.currency as CashFlowEntry['currency'],
  })) as CashFlowEntry[],
  pettycash: structuredClone(pettyCashSeed).map((txn: unknown) => pettyCashTxnSchema.parse(txn)),
  landing: landingContentSchema.parse(structuredClone(landingSeed)),
};

export { basketballPackagesSeed };
