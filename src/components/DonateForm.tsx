"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { COPY, PRESET_AMOUNTS, type Lang } from "@/lib/content";
import { LinkedText } from "./LinkedText";

type Props = {
  lang: Lang;
  enabled: boolean;
  certificatesEnabled: boolean;
};

/**
 * Progressive donation form.
 *
 * Each question only appears once the previous answer makes it relevant, so an
 * anonymous donor is never shown a name field and the certificate question
 * only reaches people it applies to.
 *
 * No email is collected. An earlier version asked for one "to receive" the
 * certificate, but nothing ever sent it — the certificate appears on the
 * thank-you page and in the public ledger. Asking for a personal detail we do
 * not use, on the strength of a delivery that does not happen, is worse than
 * not asking.
 */
export function DonateForm({ lang, enabled, certificatesEnabled }: Props) {
  const t = COPY[lang].donate;
  const ids = useId();
  const router = useRouter();

  const [preset, setPreset] = useState<number | "custom">(PRESET_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  /**
   * Named by default, to encourage a public ledger people want to be on.
   *
   * Safe because the name field is REQUIRED in this mode: nobody is published
   * without typing a name and reading "this will be public" next to it. A
   * donor who prefers not to appear switches to anonymous in one tap.
   */
  const [showName, setShowName] = useState(true);
  const [name, setName] = useState("");
  const [wantsCertificate, setWantsCertificate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = preset === "custom" ? Number(custom) : preset;
  const amountValid = Number.isFinite(amount) && amount > 0;

  // The certificate is an optional amplification asset, not part of the trust
  // architecture — so it is offered only when it can actually be issued.
  const showCertificateQuestion = showName && certificatesEnabled;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amountValid) {
      setError(t.minError);
      return;
    }
    if (showName && !name.trim()) {
      setError(t.nameRequired);
      return;
    }

    setSubmitting(true);

    // Opened synchronously, inside the click gesture. The hosted checkout has
    // no return URL, so the donor would otherwise finish paying elsewhere and
    // never see a confirmation. A window.open issued after the await would be
    // swallowed by popup blockers, since the gesture has expired by then.
    const checkoutTab = window.open("", "_blank");

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          name: showName && name.trim() ? name.trim() : undefined,
          showName: showName && name.trim().length > 0,
        }),
      });

      if (!res.ok) {
        checkoutTab?.close();
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error === "not_configured" ? t.notConfigured : t.genericError);
        setSubmitting(false);
        return;
      }

      const { checkoutUrl, invoiceId } = (await res.json()) as {
        checkoutUrl: string;
        invoiceId: string;
      };

      if (checkoutTab && !checkoutTab.closed) {
        checkoutTab.location.href = checkoutUrl;
        router.push(`/thanks?invoice=${encodeURIComponent(invoiceId)}`);
      } else {
        // Popup blocked. Losing the confirmation screen is worse than nothing,
        // but the payment still works and is still recorded.
        window.location.href = checkoutUrl;
      }
    } catch {
      checkoutTab?.close();
      setError(t.genericError);
      setSubmitting(false);
    }
  }

  const optionClass = (active: boolean) =>
    `cursor-pointer rounded-xl border p-4 transition-colors ${
      active ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-accent-dim"
    }`;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <LinkedText>{t.subtitle}</LinkedText>
      </p>

      {!enabled && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-accent-dim/40 bg-accent/10 px-4 py-3 text-sm text-accent"
        >
          {t.notConfigured}
        </p>
      )}

      <fieldset className="mt-6" disabled={!enabled || submitting}>
        <legend className="sr-only">{t.amountLabel}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_AMOUNTS.map((value) => {
            const active = preset === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setPreset(value)}
                className={`h-12 rounded-xl border text-base font-semibold tnum transition-colors ${
                  active
                    ? "border-accent bg-accent text-ink"
                    : "border-line bg-surface-2 text-fg hover:border-accent-dim"
                } disabled:opacity-50`}
              >
                ${value}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={preset === "custom"}
            onClick={() => setPreset("custom")}
            className={`h-12 rounded-xl border px-2 text-sm font-semibold transition-colors ${
              preset === "custom"
                ? "border-accent bg-accent text-ink"
                : "border-line bg-surface-2 text-fg hover:border-accent-dim"
            } disabled:opacity-50`}
          >
            {t.custom}
          </button>
        </div>

        {preset === "custom" && (
          <div className="mt-3">
            <label htmlFor={`${ids}-amount`} className="sr-only">
              {t.amountLabel}
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              >
                $
              </span>
              <input
                id={`${ids}-amount`}
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                autoFocus
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="250"
                className="h-12 w-full rounded-xl border border-line bg-surface-2 pl-8 pr-4 text-base tnum text-fg placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Question 1 — visibility. */}
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-muted">{t.visibilityLegend}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {/* Named first: it is the default, and the option a reader sees
                first is the one they weigh. */}
            {(
              [
                { value: true, label: t.namedOption, hint: t.namedHint },
                { value: false, label: t.anonymousOption, hint: t.anonymousHint },
              ] as const
            ).map((option) => (
              <label key={String(option.value)} className={optionClass(showName === option.value)}>
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name={`${ids}-visibility`}
                    checked={showName === option.value}
                    onChange={() => setShowName(option.value)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="text-sm font-semibold">{option.label}</span>
                </span>
                <span className="mt-1.5 block pl-7 text-xs leading-relaxed text-faint">
                  {option.hint}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {showName && (
          <div className="mt-4">
            <label htmlFor={`${ids}-name`} className="block text-sm font-medium text-muted">
              {t.nameLabel}
            </label>
            <input
              id={`${ids}-name`}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              aria-describedby={`${ids}-name-help`}
              className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <p id={`${ids}-name-help`} className="mt-1.5 text-xs font-medium text-accent">
              {t.nameHelpPublic}
            </p>
          </div>
        )}

        {/* Question 2 — certificate. Only for named donors, and only when
            issuance actually works. */}
        {showCertificateQuestion && (
          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-muted">{t.certificateLegend}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  { value: true, label: t.certificateYes },
                  { value: false, label: t.certificateNo },
                ] as const
              ).map((option) => (
                <label
                  key={String(option.value)}
                  className={optionClass(wantsCertificate === option.value)}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name={`${ids}-certificate`}
                      checked={wantsCertificate === option.value}
                      onChange={() => setWantsCertificate(option.value)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-sm font-semibold">{option.label}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-faint">{t.certificateHint}</p>
          </fieldset>
        )}


        <button
          type="submit"
          className="mt-6 h-14 w-full rounded-xl bg-accent text-base font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
