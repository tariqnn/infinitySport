"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { financeApi } from "../../../lib/portalApi";
import { Button } from "../../_components/ui";
import { downloadInvoicePdf } from "../../financials/_components/invoiceUtils";

type InvoiceLineItem = {
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

type InvoiceDetail = {
  id: string;
  number?: string | null;
  amount?: number | null;
  amountPaid?: number | null;
  currency?: string | null;
  status?: string | null;
  dueDate?: string | null;
  issuedAt?: string | null;
  description?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  lineItems?: InvoiceLineItem[] | null;
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  note?: string | null;
  notes?: string | null;
  meta?: {
    paymentMethod?: string | null;
    descriptionText?: string | null;
  } | null;
  pdfPath?: string | null;
};

function formatMoney(amount: number | null | undefined, currency = "JOD") {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `${safe.toFixed(2)} ${currency}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#003DA5] text-white">
        <span className="text-lg font-extrabold">IS</span>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-extrabold tracking-wide text-ui-textPrimary">Infinity Sport</div>
        <div className="text-xs text-ui-textMuted">Learn, Adapt, Evolve</div>
      </div>
    </div>
  );
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    financeApi.invoices
      .get(id)
      .then((row) => setInvoice(row as InvoiceDetail))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  const computed = useMemo(() => {
    if (!invoice) return null;

    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    const subtotal =
      invoice.subtotal ??
      items.reduce((sum, item) => sum + Number(item?.lineTotal || 0), 0) ??
      invoice.amount ??
      0;
    const tax = Number(invoice.tax || 0);
    const discount = Number(invoice.discount || 0);
    const total = Number(invoice.amount ?? subtotal + tax - discount);
    const amountPaid = Number(invoice.amountPaid || 0);
    const remaining = Math.max(0, total - amountPaid);
    const headlineAmount = amountPaid > 0 ? amountPaid : total;
    const headlineLabel = amountPaid > 0 ? "Amount Paid" : "Amount Due";

    return {
      items,
      subtotal,
      tax,
      discount,
      total,
      amountPaid,
      remaining,
      headlineAmount,
      headlineLabel,
    };
  }, [invoice]);

  return (
    <div className="min-h-screen bg-ui-softBg py-10">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 16mm;
        }
        @media print {
          html,
          body {
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .a4-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            width: auto !important;
            min-height: auto !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr,
          td,
          th {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="mx-auto w-full px-4 sm:px-6">
        <div className="no-print mx-auto mb-4 flex max-w-[900px] items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!invoice) return;
              const ok = await downloadInvoicePdf({
                number: invoice.number ?? undefined,
                pdfPath: invoice.pdfPath ?? undefined,
                description: invoice.description ?? undefined,
              });
              if (!ok) {
                alert("Failed to download invoice PDF.");
              }
            }}
          >
            Download PDF
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print / Download PDF
          </Button>
        </div>

        <div
          className="a4-sheet mx-auto rounded-2xl border border-ui-border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "16mm",
          }}
        >
          {loading ? (
            <div className="text-sm text-ui-textMuted">Loading...</div>
          ) : error ? (
            <div className="text-sm text-ui-danger">{error}</div>
          ) : !invoice || !computed ? (
            <div className="text-sm text-ui-textMuted">Invoice not found.</div>
          ) : (
            <div className="text-ui-textPrimary">
              <div className="flex items-start justify-between gap-6">
                <LogoBlock />
                <div className="text-right">
                  <div className="text-3xl font-extrabold tracking-wide text-ui-textPrimary">INVOICE</div>
                </div>
              </div>

              <div className="my-6 h-px w-full bg-ui-border" />

              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-semibold">Invoice Number:</span>{" "}
                    <span className="text-ui-textPrimary">{invoice.number || "-"}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span>{" "}
                    <span className="text-ui-textPrimary">{formatDateTime(invoice.issuedAt)}</span>
                  </div>
                  <div className="pt-2">
                    <div className="font-semibold">Billed To:</div>
                    <div className="text-ui-textPrimary">{invoice.clientName || "-"}</div>
                    {(invoice.clientEmail || invoice.clientAddress) && (
                      <div className="text-xs text-ui-textMuted">
                        {invoice.clientEmail ? invoice.clientEmail : ""}
                        {invoice.clientEmail && invoice.clientAddress ? " | " : ""}
                        {invoice.clientAddress ? invoice.clientAddress : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ui-textMuted">
                    {computed.headlineLabel}
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-ui-textPrimary">
                    {formatMoney(computed.headlineAmount, invoice.currency || "JOD")}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-ui-border bg-white p-5">
                <div className="mb-3 text-sm font-bold text-ui-textPrimary">Payment Details</div>
                <div className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2 sm:gap-x-6">
                  <div className="flex justify-between gap-3 sm:block">
                    <span className="text-ui-textMuted">Payment Method</span>
                    <span className="font-semibold text-ui-textPrimary sm:ml-2">
                      {invoice.meta?.paymentMethod || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 sm:block sm:text-right">
                    <span className="text-ui-textMuted">Status</span>
                    <span className="font-semibold text-ui-textPrimary sm:ml-2">{invoice.status || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3 sm:block">
                    <span className="text-ui-textMuted">Due Date</span>
                    <span className="font-semibold text-ui-textPrimary sm:ml-2">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between gap-3 sm:block sm:text-right">
                    <span className="text-ui-textMuted">Contact</span>
                    <span className="font-semibold text-ui-textPrimary sm:ml-2">
                      {invoice.companyPhone || invoice.companyEmail || "-"}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-ui-textMuted">Private Note</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-ui-textPrimary">
                    {invoice.note || invoice.notes || "-"}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <table className="w-full border-collapse overflow-hidden rounded-xl border border-ui-border text-sm">
                  <thead>
                    <tr className="bg-[#003DA5] text-white">
                      <th className="px-4 py-3 text-left font-bold">Description</th>
                      <th className="px-4 py-3 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.items.length > 0 ? (
                      computed.items.map((item, index) => (
                        <tr key={`${item.description || "item"}-${index}`} className="border-t border-ui-border">
                          <td className="px-4 py-3">
                            <div>{item.description || invoice.meta?.descriptionText || "Invoice item"}</div>
                            {item.quantity && item.quantity > 1 ? (
                              <div className="mt-1 text-xs text-ui-textMuted">
                                {item.quantity} x {formatMoney(item.unitPrice || 0, invoice.currency || "JOD")}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatMoney(item.lineTotal || 0, invoice.currency || "JOD")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-ui-border">
                        <td className="px-4 py-3">{invoice.meta?.descriptionText || "Invoice item"}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatMoney(computed.total, invoice.currency || "JOD")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-[320px] space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-ui-textMuted">Subtotal</span>
                    <span className="font-semibold">{formatMoney(computed.subtotal, invoice.currency || "JOD")}</span>
                  </div>
                  {computed.tax > 0 ? (
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-ui-textMuted">Tax</span>
                      <span className="font-semibold">{formatMoney(computed.tax, invoice.currency || "JOD")}</span>
                    </div>
                  ) : null}
                  {computed.discount > 0 ? (
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-ui-textMuted">Discount</span>
                      <span className="font-semibold">- {formatMoney(computed.discount, invoice.currency || "JOD")}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-ui-textMuted">Paid</span>
                    <span className="font-semibold">{formatMoney(computed.amountPaid, invoice.currency || "JOD")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-ui-textMuted">Remaining</span>
                    <span className="font-semibold">{formatMoney(computed.remaining, invoice.currency || "JOD")}</span>
                  </div>
                  <div className="mt-2 h-px w-full bg-ui-border" />
                  <div className="flex items-center justify-between gap-6 text-base">
                    <span className="font-bold">{computed.amountPaid > 0 ? "Total Paid" : "Total Due"}</span>
                    <span className="font-extrabold">
                      {formatMoney(
                        computed.amountPaid > 0 ? computed.amountPaid : computed.total,
                        invoice.currency || "JOD",
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <div className="text-sm font-semibold text-ui-textPrimary">Thank you for your business.</div>
                <div className="mt-1 text-xs text-ui-textMuted">
                  {invoice.companyName || "Infinity Sport"} | {invoice.companyPhone || "+962"} | infinitysports.jo
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
