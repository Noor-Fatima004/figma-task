"use client";

import { useEffect } from "react";
import { FaArrowLeft, FaDownload, FaPrint } from "react-icons/fa";
import Link from "next/link";
import { toast } from "sonner";

export default function InvoiceDetailActions({
  id,
  printOnLoad,
}: {
  id: string;
  printOnLoad: boolean;
}) {
  const downloadPdf = async () => {
    try {
      const response = await fetch(`/api/admin/invoices/${id}/pdf`);
      if (!response.ok) {
        const body: unknown = await response.json();
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "PDF download failed.";
        throw new Error(message);
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice PDF downloaded.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "PDF download failed.");
    }
  };
  useEffect(() => {
    if (printOnLoad) {
      const timer = window.setTimeout(() => {
        window.print();
        toast.success("Print dialog opened.");
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [printOnLoad]);
  return (
    <div className="print:hidden">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/admin/invoices" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-background">
          <FaArrowLeft className="h-3 w-3" />Back to invoices
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => { window.print(); toast.success("Print dialog opened."); }} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-background"><FaPrint />Print</button>
          <button type="button" onClick={() => void downloadPdf()} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"><FaDownload />Download PDF</button>
        </div>
      </div>
    </div>
  );
}
