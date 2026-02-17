'use client';

import { useState } from 'react';
import { UserPlusIcon, CalendarIcon, CurrencyDollarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { QuickAction } from './PortalComponents';
import { CreateMemberModal } from './CreateMemberModal';
import { CreateBookingModal } from './CreateBookingModal';
import { CreateInvoiceModal } from '../financials/_components/CreateInvoiceModal';

export function QuickActions({ companyId }: { companyId?: string }) {
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          onClick={() => setMemberModalOpen(true)}
          icon={<UserPlusIcon className="h-5 w-5" />}
          title="Add Member"
          description="Registration"
          variant="centered"
        />
        <QuickAction
          onClick={() => setBookingModalOpen(true)}
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Create Booking"
          description="Reservation"
          variant="centered"
        />
        <QuickAction
          onClick={() => setInvoiceModalOpen(true)}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          title="Generate Invoice"
          description="Payments"
          variant="centered"
        />
        <QuickAction
          icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
          title="Assign Coach"
          description="Schedules"
          variant="centered"
        />
      </div>
      <CreateMemberModal open={memberModalOpen} onClose={() => setMemberModalOpen(false)} companyId={companyId} />
      <CreateBookingModal open={bookingModalOpen} onClose={() => setBookingModalOpen(false)} companyId={companyId} />
      <CreateInvoiceModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} />
    </>
  );
}

