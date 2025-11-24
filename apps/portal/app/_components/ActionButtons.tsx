'use client';

import { useState } from 'react';
import { PlusIcon, CalendarIcon, CurrencyDollarIcon, CubeIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { CreateMemberModal } from './CreateMemberModal';
import { CreateBookingModal } from './CreateBookingModal';
import { CreateClassModal } from './CreateClassModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { CreateInventoryModal } from './CreateInventoryModal';
import { CreateCoachModal } from './CreateCoachModal';
import { ExportCsvButton } from './ExportCsvButton';
import { Button } from './ui';

export function AddMemberButton({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        Add Member
      </Button>
      <CreateMemberModal open={open} onClose={() => setOpen(false)} companyId={companyId} />
    </>
  );
}

export function CreateBookingButton({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarIcon className="h-4 w-4" />
        New Booking
      </Button>
      <CreateBookingModal open={open} onClose={() => setOpen(false)} companyId={companyId} />
    </>
  );
}

export function CreateProgramButton({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        Create Class
      </Button>
      <CreateClassModal open={open} onClose={() => setOpen(false)} companyId={companyId} />
    </>
  );
}

export function NewInvoiceButton({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CurrencyDollarIcon className="h-4 w-4" />
        Add Invoice
      </Button>
      <CreateInvoiceModal open={open} onClose={() => setOpen(false)} companyId={companyId} />
    </>
  );
}

export function NewPurchaseOrderButton({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CubeIcon className="h-4 w-4" />
        Add Item
      </Button>
      <CreateInventoryModal open={open} onClose={() => setOpen(false)} companyId={companyId} />
    </>
  );
}

export function AddCoachButton({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlusIcon className="h-4 w-4" />
        Add Coach
      </Button>
      <CreateCoachModal open={open} onClose={() => setOpen(false)} companyId={companyId} />
    </>
  );
}

export { ExportCsvButton };

