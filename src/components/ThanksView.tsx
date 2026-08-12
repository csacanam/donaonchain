"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { COPY } from "@/lib/content";
import { useLang } from "@/lib/useLang";
import { LinkedText } from "./LinkedText";

type Status = "Pending" | "Paid" | "Expired" | "Refunded";

type InvoiceView = {
  status: Status;
  amountUsd: number;
  paidAmount: number | null;
  token: string | null;
  networkLabel: string;
  txUrl: string | null;
  certificateUrl: string | null;
};

/**
 * Polls the invoice until it reaches a final state, then delivers the proof.
 *
 * Polling is not a nicety: the settlement webhook is batched and may not be
 * configured at all, so whichever path sees the payment first records it.
 *
 * `Expired` is deliberately NOT treated as final — the deposit address is
 * watched for 24h after expiry, so an invoice already seen as Expired can flip
 * to Refunded when late funds arrive and are returned. A donor who paid late
 * should be told the truth rather than left believing nothing happened.
 */
export function ThanksView() {
  const params = useSearchParams();
  const invoiceId = params.get("invoice");

  const [lang, setLang] = useLang();
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [copied, setCopied] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/invoice/${invoiceId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as InvoiceView;
        if (cancelled) return;
        setInvoice(data);
        // Paid and Refunded are the only genuinely final states.
        if (data.status === "Paid" || data.status === "Refunded") return;
      } catch {
        if (cancelled) return;
      }

      attempts.current += 1;
      // Every 4s for the first two minutes, then every 20s, giving up after
      // roughly 15 minutes rather than polling forever.
      if (attempts.current > 70) return;
      timer = setTimeout(poll, attempts.current < 30 ? 4_000 : 20_000);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [invoiceId]);

  const t = COPY[lang].thanks;
  const settled = invoice?.status === "Paid";

  const message = (() => {
    if (!invoiceId || !invoice) return t.checking;
    switch (invoice.status) {
      case "Paid":
        return t.paid;
      case "Expired":
        return t.expired;
      case "Refunded":
        return t.refunded;
      default:
        return t.pending;
    }
  })();

  const shareUrl = "https://www.donaonchain.com";
  // Never include the donor's amount: what they gave is their business, even
  // when they chose to be named in the ledger.
  const shareText = t.shareCopy;

  const targets = [
    {
      label: "X",
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard denied (insecure context, no focus). Select-and-copy is the
      // fallback, so the link is shown as text rather than left unavailable.
      setCopied(false);
    }
  }


  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {settled ? t.title : COPY[lang].donate.title}
        </h1>
        <div
          role="group"
          aria-label="Language"
          className="flex shrink-0 overflow-hidden rounded-lg border border-line text-xs font-semibold"
        >
          {(["en", "es"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={`h-11 w-11 uppercase transition-colors ${
                lang === code ? "bg-accent text-ink" : "text-muted hover:text-fg"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-4 text-base leading-relaxed ${settled ? "text-settled" : "text-muted"}`}
      >
        <LinkedText>{message}</LinkedText>
      </p>

      {invoice && (
        <dl className="mt-6 space-y-3 border-t border-line-soft pt-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-faint">{t.amountLabel}</dt>
            <dd className="font-semibold tnum">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(invoice.amountUsd)}
            </dd>
          </div>

          {/* paid_amount is what actually settled onchain, recorded at
              settlement — the only figure that stays true over time. */}
          {settled && invoice.paidAmount !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-faint">{invoice.networkLabel}</dt>
              <dd className="font-mono tnum">
                {invoice.paidAmount} {invoice.token}
              </dd>
            </div>
          )}

          {invoice.txUrl && (
            <div className="flex justify-between gap-4">
              <dt className="text-faint">{t.txLabel}</dt>
              <dd>
                <a
                  href={invoice.txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-settled underline decoration-settled/40 underline-offset-4"
                >
                  {COPY[lang].transparency.viewTx}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}

      {settled && (
        <div className="mt-7 space-y-3">
          {/* Sharing is the primary post-donation action for everyone; the
              certificate is secondary and only exists for some donors. */}
          <p className="text-sm leading-relaxed text-muted">{t.shareLead}</p>

          {/* Explicit destinations rather than one "share" button. The button
              relied on navigator.share, which does not exist on most desktop
              browsers, so it silently fell back to a clipboard write that could
              itself fail — and the catch swallowed both. These are plain links:
              they cannot fail quietly. */}
          <div className="grid grid-cols-3 gap-2">
            {targets.map((target) => (
              <a
                key={target.label}
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center rounded-xl bg-accent px-3 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
              >
                {target.label}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-line bg-surface-2 px-6 text-sm font-semibold transition-colors hover:border-accent-dim"
          >
            {copied ? t.copied : t.copyLink}
          </button>

          {invoice?.certificateUrl && (
            <a
              href={invoice.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center rounded-xl border border-line bg-surface-2 px-6 text-sm font-semibold transition-colors hover:border-accent-dim"
            >
              {t.certificateCta}
            </a>
          )}
        </div>
      )}

      <Link
        href="/"
        className="mt-3 flex h-12 items-center justify-center rounded-xl border border-line bg-surface-2 px-6 text-sm font-semibold transition-colors hover:border-accent-dim"
      >
        {t.backHome}
      </Link>
    </div>
  );
}
