"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { COPY } from "@/lib/content";
import { useLang } from "@/lib/useLang";
import { LinkedText } from "./LinkedText";

type Status = "Pending" | "Paid" | "Expired" | "Refunded";

/**
 * Brand glyphs for the share row, inlined so the buttons cost no extra
 * request and cannot render as three empty boxes if an icon host is blocked.
 */
const BRAND = {
  x: "M3 3l7.5 9.8L3.4 21H6l5.7-6.6L16.6 21H21l-7.9-10.3L20.6 3H18l-5.2 6L8.3 3H3z",
  whatsapp:
    "M12.04 2C6.6 2 2.17 6.43 2.17 11.87c0 1.74.46 3.44 1.32 4.94L2 22l5.32-1.4a9.86 9.86 0 004.72 1.2h.01c5.44 0 9.87-4.43 9.87-9.87S17.48 2 12.04 2zm5.79 14.11c-.24.68-1.4 1.3-1.95 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.14-.3.3-.13.59.17.29.76 1.25 1.63 2.02 1.12 1 2.06 1.31 2.35 1.46.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.66-.14.27.1 1.68.79 1.97.93.29.14.48.22.55.34.07.12.07.7-.17 1.38z",
  telegram:
    "M21.94 4.6l-3.02 14.25c-.23 1-.83 1.25-1.68.78l-4.64-3.42-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73 8.6-7.77c.37-.33-.08-.52-.58-.19l-10.63 6.7-4.58-1.43c-1-.31-1.02-1 .21-1.48l17.9-6.9c.83-.3 1.56.19 1.29 1.57z",
};

type InvoiceView = {
  status: Status;
  amountUsd: number;
  paidAmount: number | null;
  token: string | null;
  networkLabel: string;
  txUrl: string | null;
  certificateUrl: string | null;
  /** The donor is named and owed a certificate that has not been issued yet. */
  certificatePending?: boolean;
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
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
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
        // Paid and Refunded are the only genuinely final states — but a named
        // donor's certificate is issued a moment after the payment settles,
        // and stopping here left them looking at a settled donation with no
        // certificate and nothing to indicate one was coming.
        const waitingOnCertificate = data.status === "Paid" && data.certificatePending;
        if ((data.status === "Paid" || data.status === "Refunded") && !waitingOnCertificate) {
          return;
        }
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

  /**
   * The visible label is the platform name alone.
   *
   * "Share on …" on each of three buttons repeats the verb the heading above
   * has already said, and the three phrases are different lengths — X fit on
   * one line while WhatsApp and Telegram wrapped to two, so the row read as
   * ragged. The full phrase survives as the accessible name, which is where a
   * screen reader actually needs the verb.
   */
  const targets = [
    {
      name: "X",
      // X's logo is the letter itself, so printing the name beside it read as
      // a stutter — "𝕏 X". The accessible name still says "Share on X".
      hideName: true,
      icon: BRAND.x,
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "WhatsApp",
      icon: BRAND.whatsapp,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      name: "Telegram",
      icon: BRAND.telegram,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ];

  /**
   * The three buttons cover where most of this will travel, but not Discord,
   * Farcaster or Signal — which is where a good part of the crypto community
   * actually talks. This is deliberately a text link rather than a fourth
   * button: it is a fallback, and a full-width control gave it the same weight
   * as the platforms and pushed the closing action off the screen.
   */
  async function copyLink() {
    try {
      // The clipboard is denied outright in insecure contexts, and in some
      // in-app browsers (and whenever the document is not focused) the write
      // never settles at all — neither resolving nor rejecting. Racing it
      // against a timeout means a stalled write still ends somewhere the donor
      // can act on, instead of leaving a control that appears to do nothing.
      await Promise.race([
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`),
        new Promise((_, reject) => setTimeout(reject, 1200)),
      ]);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("failed");
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

      <div role="status" aria-live="polite" className="mt-4 space-y-3 text-base leading-relaxed">
        <p className={settled ? "text-fg" : "text-muted"}>
          <LinkedText>{message}</LinkedText>
        </p>
        {settled && (
          <>
            <p className="text-muted">{t.paidProof}</p>
            <p className="font-medium text-settled">{t.paidClosing}</p>
          </>
        )}
      </div>

      {invoice && (
        <dl className="mt-5 space-y-3 border-t border-line-soft pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-faint">{t.amountLabel}</dt>
            <dd className="font-semibold tnum">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(invoice.amountUsd)}
            </dd>
          </div>

          {/* The network is its own row rather than the label of the amount
              below it: "Celo" is a fact about the payment, not a name for the
              figure beside it. */}
          {settled && invoice.networkLabel !== "—" && (
            <div className="flex justify-between gap-4">
              <dt className="text-faint">{t.networkLabel}</dt>
              <dd className="font-medium">{invoice.networkLabel}</dd>
            </div>
          )}

          {/* What actually settled onchain, recorded at settlement — the only
              figure that stays true as exchange rates move. */}
          {settled && invoice.paidAmount !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-faint">{t.receivedLabel}</dt>
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
        <div className="mt-6 space-y-3">
          {/* Sharing is the primary post-donation action for everyone; the
              certificate is secondary and only exists for some donors. */}
          <h2 className="text-lg font-semibold tracking-tight">{t.shareTitle}</h2>
          <p className="text-sm leading-relaxed text-muted">{t.shareLead}</p>
          <p className="text-sm leading-relaxed text-muted">{t.shareLead2}</p>

          {/* Explicit destinations rather than one "share" button. The button
              relied on navigator.share, which does not exist on most desktop
              browsers, so it silently fell back to a clipboard write that could
              itself fail — and the catch swallowed both. These are plain links:
              they cannot fail quietly. */}
          <div className="grid gap-2 sm:grid-cols-3">
            {targets.map((target) => (
              <a
                key={target.name}
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.shareOn.replace("{platform}", target.name)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`shrink-0 ${target.hideName ? "h-[18px] w-[18px]" : "h-4 w-4"}`}
                  fill="currentColor"
                  aria-hidden
                >
                  <path d={target.icon} />
                </svg>
                {!target.hideName && target.name}
              </a>
            ))}
          </div>

          {copyState === "failed" ? (
            <p className="pt-1 text-center text-xs text-faint">
              {t.copyManual}{" "}
              <span className="select-all font-mono text-muted">{shareUrl}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={copyLink}
              className="mx-auto flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-faint transition-colors hover:text-accent"
            >
              {copyState === "done" ? t.copied : t.copyLink}
            </button>
          )}

          {settled && !invoice?.certificateUrl && invoice?.certificatePending && (
            <p className="flex h-12 items-center justify-center rounded-xl border border-dashed border-line px-6 text-center text-sm text-faint">
              {t.certPending}
            </p>
          )}

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
        className="mt-4 flex h-12 items-center justify-center rounded-xl border border-line bg-surface-2 px-6 text-sm font-semibold transition-colors hover:border-accent-dim"
      >
        {t.backHome}
      </Link>
    </div>
  );
}
