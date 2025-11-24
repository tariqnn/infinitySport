'use client';

import { useState } from 'react';
import { UserPlusIcon, CalendarIcon, CurrencyDollarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { QuickAction } from './PortalComponents';
import { CreateMemberModal } from './CreateMemberModal';
import { CreateBookingModal } from './CreateBookingModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';

export function QuickActions({ companyId }: { companyId?: string }) {
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <button onClick={() => setMemberModalOpen(true)}>
          <QuickAction
            icon={<UserPlusIcon className="h-4 w-4" />}
            title="Add member"
            description="Create athlete or family account"
          />
        </button>
        <button onClick={() => setBookingModalOpen(true)}>
          <QuickAction
            icon={<CalendarIcon className="h-4 w-4" />}
            title="Create booking"
            description="Allocate courts, fields, rooms"
          />
        </button>
        <button onClick={() => setInvoiceModalOpen(true)}>
          <QuickAction
            icon={<CurrencyDollarIcon className="h-4 w-4" />}
            title="Generate invoice"
            description="Send PDF to members"
          />
        </button>
        <QuickAction
          icon={<ClipboardDocumentCheckIcon className="h-4 w-4" />}
          title="Assign coach"
          description="Match athletes to staff"
        />
      </div>
      <CreateMemberModal open={memberModalOpen} onClose={() => setMemberModalOpen(false)} companyId={companyId} />
      <CreateBookingModal open={bookingModalOpen} onClose={() => setBookingModalOpen(false)} companyId={companyId} />
      <CreateInvoiceModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} companyId={companyId} />
    </>
  );
}

