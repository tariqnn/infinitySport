"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { receiptsApi, type PackageRegistrationRow, type ReceiptRow } from "../../../lib/portalApi";
import { Button } from "../../_components/ui";

type ReceiptDetail = ReceiptRow & {
  registration?: PackageRegistrationRow;
  transactionId?: string | null;
};

function formatMoneyJod(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toFixed(2)} JOD`;
}

function formatIssuedAt(dateTimeIssued: string) {
  const d = new Date(dateTimeIssued);
  if (Number.isNaN(d.getTime())) return dateTimeIssued;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaymentMonth(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "long", year: "numeric" });
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

export default function ReceiptPrintPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    receiptsApi
      .get(id)
      .then((r) => setReceipt(r as ReceiptDetail))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load receipt"))
      .finally(() => setLoading(false));
  }, [id]);

  const computed = useMemo(() => {
    if (!receipt) return null;
    const amountPaid = receipt.amountPaid ?? 0;
    const totalDue = receipt.registration?.finalPriceJod ?? null;
    const paidToDateRaw =
      typeof receipt.registration?.collected === "number" ? receipt.registration.collected : amountPaid;
    const paidToDate = Number.isFinite(paidToDateRaw) ? paidToDateRaw : amountPaid;
    const remaining = typeof totalDue === "number" ? Math.max(0, totalDue - paidToDate) : null;
    const showPartialLines =
      typeof totalDue === "number" && (remaining !== null && remaining > 0.0001 || Math.abs(paidToDate - amountPaid) > 0.0001);

    return {
      amountPaid,
      totalDue,
      paidToDate,
      remaining,
      showPartialLines,
    };
  }, [receipt]);

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
            <div className="text-sm text-ui-textMuted">Loading…</div>
          ) : error ? (
            <div className="text-sm text-ui-danger">{error}</div>
          ) : !receipt || !computed ? (
            <div className="text-sm text-ui-textMuted">Receipt not found.</div>
          ) : (
            <div className="text-ui-textPrimary">
              {/* Header */}
              <div className="flex items-start justify-between gap-6">
                <LogoBlock />
                <div className="text-right">
                  <div className="text-3xl font-extrabold tracking-wide text-ui-textPrimary">RECEIPT</div>
                </div>
              </div>

              <div className="my-6 h-px w-full bg-ui-border" />

              {/* Meta */}
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-semibold">Receipt Number:</span>{" "}
                    <span className="text-ui-textPrimary">{receipt.receiptId}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span>{" "}
                    <span className="text-ui-textPrimary">{formatIssuedAt(receipt.dateTimeIssued)}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Paid For Month:</span>{" "}
                    <span className="text-ui-textPrimary">{formatPaymentMonth(receipt.paymentPeriodKey)}</span>
                  </div>
                  <div className="pt-2">
                    <div className="font-semibold">Received From:</div>
                    <div className="text-ui-textPrimary">{receipt.personName}</div>
                    {(receipt.personPhone || receipt.registration?.customerEmail) && (
                      <div className="text-xs text-ui-textMuted">
                        {receipt.personPhone ? receipt.personPhone : ""}
                        {receipt.personPhone && receipt.registration?.customerEmail ? " · " : ""}
                        {receipt.registration?.customerEmail ? receipt.registration.customerEmail : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ui-textMuted">Amount Paid</div>
                  <div className="mt-1 text-3xl font-extrabold text-ui-textPrimary">
                    {formatMoneyJod(computed.amountPaid)}
                  </div>
                </div>
              </div>

              {/* Payment details */}
              <div className="mt-8 rounded-xl border border-ui-border bg-white p-5">
                <div className="mb-3 text-sm font-bold text-ui-textPrimary">Payment Details</div>
                <div className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2 sm:gap-x-6">
                  <div className="flex justify-between gap-3 sm:block">
                    <span className="text-ui-textMuted">Payment Method</span>
                    <span className="font-semibold text-ui-textPrimary sm:ml-2">{receipt.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between gap-3 sm:block sm:text-right">
                    <span className="text-ui-textMuted">Paid For Month</span>
                    <span className="font-semibold text-ui-textPrimary sm:ml-2">{formatPaymentMonth(receipt.paymentPeriodKey)}</span>
                  </div>
                  {receipt.transactionId ? (
                    <div className="flex justify-between gap-3 sm:block sm:text-right">
                      <span className="text-ui-textMuted">Transaction ID</span>
                      <span className="font-semibold text-ui-textPrimary sm:ml-2">{receipt.transactionId}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4">
                  <div className="text-ui-textMuted text-sm">Private Note</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-ui-textPrimary">
                    {receipt.privateNote || "—"}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mt-8">
                <table className="w-full border-collapse overflow-hidden rounded-xl border border-ui-border text-sm">
                  <thead>
                    <tr className="bg-[#003DA5] text-white">
                      <th className="px-4 py-3 text-left font-bold">Description</th>
                      <th className="px-4 py-3 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-ui-border">
                      <td className="px-4 py-3">
                        Registration payment — {receipt.packageName || receipt.registration?.packageName || "Program"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoneyJod(computed.amountPaid)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-[320px] space-y-2 text-sm">
                  {computed.showPartialLines && (
                    <>
                      <div className="flex items-center justify-between gap-6">
                        <span className="text-ui-textMuted">Paid to Date</span>
                        <span className="font-semibold">{formatMoneyJod(computed.paidToDate)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="text-ui-textMuted">Remaining</span>
                        <span className="font-semibold">
                          {computed.remaining === null ? "—" : formatMoneyJod(computed.remaining)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="mt-2 h-px w-full bg-ui-border" />
                  <div className="flex items-center justify-between gap-6 text-base">
                    <span className="font-bold">Total Paid</span>
                    <span className="font-extrabold">{formatMoneyJod(computed.amountPaid)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 text-center">
                <div className="text-sm font-semibold text-ui-textPrimary">Thank you for your payment.</div>
                <div className="mt-1 text-xs text-ui-textMuted">Infinity Sport · +962 · infinitysports.jo</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

