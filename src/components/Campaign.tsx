"use client";

import { AUTHOR } from "@/lib/author";
import { COPY, FIGURES, SOURCES, type Lang } from "@/lib/content";
import { addressUrlFrom, labelFor, shortAddress } from "@/lib/addresses";
import { DISBURSEMENTS } from "@/lib/disbursements";
// RECIPIENT is deliberately no longer imported: the removed "who manages the
// donations" fold was the only place that linked it by hand, and every other
// mention of ReFi Colombia in body copy is already turned into a link by
// LinkedText, via INLINE_LINKS.
import { SUPPORTERS, visible } from "@/lib/orgs";
import { useLang } from "@/lib/useLang";
import { DonateForm } from "./DonateForm";
import { LinkedText } from "./LinkedText";
import { LogoWall } from "./LogoWall";
import { Photos } from "./Photos";
import { Signature } from "./Signature";

/**
 * Carries no `certificateUrl`. One was plumbed all the way from the server
 * into this component and never rendered — the certificate found its own card
 * on the thank-you page instead. A field the ledger does not draw is a field
 * that quietly says which donors hold a credential, for no benefit.
 */
export type LedgerEntry = {
  amountUsd: number;
  donorName: string | null;
  paidAt: string | null;
  token: string | null;
  networkLabel: string;
  txUrl: string | null;
};

export type MovementEntry = {
  chainLabel: string;
  direction: "in" | "out" | "internal";
  amount: number;
  symbol: string;
  counterparty: string;
  txUrl: string;
};

export type CampaignProps = {
  donationsEnabled: boolean;
  certificatesEnabled: boolean;
  statsAvailable: boolean;
  totalUsd: number;
  donorCount: number;
  ledger: LedgerEntry[];
  intakeAddress: string | null;
  onchainConfigured: boolean;
  movements: MovementEntry[];
  contactEmail: string;
};

function usd(value: number, lang: Lang, cents = false) {
  return new Intl.NumberFormat(lang === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(value);
}

function num(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "es" ? "es-CO" : "en-US").format(value);
}

function dateTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleString(lang === "es" ? "es-CO" : "en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function shortDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A folded detail block. Closed by default so the letter stays the page. */
function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium transition-colors hover:text-accent">
        <span>{title}</span>
        <span
          aria-hidden
          className="shrink-0 text-xl leading-none text-faint transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}

export function Campaign(props: CampaignProps) {
  const [lang, setLang] = useLang();
  const t = COPY[lang];

  // Figures are interpolated rather than retyped, so the letter can never
  // quote a number the sourced data no longer says.
  const fillFigures = (text: string) =>
    text
      .replace("{deaths}", num(FIGURES.deaths, lang))
      .replace("{injured}", num(FIGURES.injured, lang))
      .replace("{structures}", num(FIGURES.structuresCollapsed, lang));

  /** Index of the letter paragraph that quotes the casualty figures. */
  const FIGURES_PARAGRAPH = 1;

  /**
   * How much of the letter is open before the fold.
   *
   * Three paragraphs: who is writing, what the figures are, and that he lived
   * it. That is the whole credibility claim a donor needs at this point in the
   * page, and it happens to end just after the sourced numbers — so the fold
   * never cuts a paragraph away from the citation underneath it.
   */
  const LETTER_PREVIEW = 3;
  const letterPreview = t.letter.paragraphs.slice(0, LETTER_PREVIEW);
  const letterRest = t.letter.paragraphs.slice(LETTER_PREVIEW);

  /* One wallet, not two. The intake/treasury split only existed to support
     the claim that moving funds needed several signers; without that, a
     second published address is noise a donor has to reconcile. */
  const wallets = [
    {
      label: t.transparency.intakeLabel,
      note: t.transparency.intakeNote,
      address: props.intakeAddress,
    },
  ];

  /**
   * One letter paragraph, plus the sourcing line when it is the paragraph that
   * quotes the figures.
   *
   * Shared by the open preview and the folded remainder so the fold can move
   * without the citation drifting away from the numbers it supports. `index`
   * is the paragraph's position in the WHOLE letter, not in the slice.
   */
  const letterParagraph = (paragraph: string, index: number) => (
    <div key={index}>
      <p className={index === 0 ? "" : "mt-5"}>
        <LinkedText>{fillFigures(paragraph)}</LinkedText>
      </p>

      {/* Sourcing sits with the claim it supports, not folded away in a
          section of its own — a reader who doubts the number looks here, not
          three screens down. */}
      {index === FIGURES_PARAGRAPH && (
        <p className="mt-2 text-sm leading-relaxed text-faint">
          {t.figures.disclaimer} {t.figures.asOf}{" "}
          {/* No full stop after the time: Spanish formats it as "7:00 p. m.",
              which already ends in one. */}
          <time dateTime={FIGURES.asOf}>{dateTime(FIGURES.asOf, lang)}</time>
          {" · "}
          {t.figures.sources}:{" "}
          {SOURCES.map((source, n) => (
            <span key={source.url}>
              {n > 0 && ", "}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-line underline-offset-4 hover:text-accent"
              >
                {source.label}
              </a>
            </span>
          ))}
          .
        </p>
      )}
    </div>
  );

  /** The raised / contributions pair, or an honest note about why it is absent. */
  const statsBlock = props.statsAvailable ? (
    <>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-faint">
            {t.stats.raised}
          </p>
          <p className="mt-1.5 text-4xl font-semibold tnum text-accent">
            {usd(props.totalUsd, lang)}
          </p>
        </div>
        <div className="bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-faint">
            {t.stats.donors}
          </p>
          <p className="mt-1.5 text-4xl font-semibold tnum">
            {props.donorCount > 0 ? (
              num(props.donorCount, lang)
            ) : (
              <span className="text-lg font-normal text-faint">{t.stats.none}</span>
            )}
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-xs text-faint">{t.stats.liveNote}</p>
    </>
  ) : (
    /* Says why the number is missing instead of hiding the block. Showing $0
       here would be a claim we cannot support: with the counter disconnected
       we do not know the total, and "we don't know" is not "nothing". */
    <p className="rounded-2xl border border-dashed border-line bg-surface/50 p-5 text-sm text-muted">
      {t.stats.unavailable}
    </p>
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line-soft bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            <span>DonaOnchain</span>
          </a>
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Language"
              className="flex overflow-hidden rounded-lg border border-line text-xs font-semibold"
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
            <a
              href="#donate"
              className="flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              {t.hero.cta}
            </a>
          </div>
        </div>
      </header>

      {/* One narrow column throughout. The letter has a measure, and the rest
          of the page keeps it so the two do not read as different sites. */}
      <main id="top" className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6">
        {/* ---------------------------------------------------------- Hero */}
        {/* Short on purpose. This page is a donation page first: a stranger
            gets what happened, who ends up with the money and why the total
            is checkable, and then immediately the form. The account of the
            day is still here in full, under "who is behind this" — it stopped
            being the first thing a donor has to read before they can give. */}
        <section className="pt-10 sm:pt-14">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">
            {t.hero.eyebrow}
          </p>
          <h1 className="letter mt-4 text-balance text-[1.75rem] font-medium leading-[1.28] tracking-tight text-fg sm:text-[2.25rem]">
            {t.hero.title}
          </h1>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted">
            <LinkedText>{t.hero.lede}</LinkedText>
          </p>
        </section>

        {/* ---------------------------------------- Raised, then the form */}
        {/* The counter sits ABOVE the form, not below it: what other people
            have already given is the argument for giving, so it should be
            read before the amount buttons rather than after. */}
        <section id="donate" className="scroll-mt-20 pt-8">
          {statsBlock}
          <div className="mt-4">
            <DonateForm
              lang={lang}
              enabled={props.donationsEnabled}
              certificatesEnabled={props.certificatesEnabled}
            />
          </div>
        </section>

        {/* -------------------------------------------------------- Ledger */}
        <section className="pt-10">
          {/* The contributions list is public proof, so it stays on the page
              rather than folded away with the technical detail. */}
          <h2 className="text-lg font-semibold tracking-tight">
            {t.transparency.ledgerTitle}
          </h2>
          {props.ledger.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface/50 p-5 text-sm text-muted">
              {t.transparency.ledgerEmpty}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-2 text-left text-xs uppercase tracking-wider text-faint">
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t.transparency.colWhen}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t.transparency.colAmount}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t.transparency.colNetwork}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t.transparency.colTx}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {props.ledger.map((row, i) => (
                    <tr
                      key={`${row.txUrl ?? "row"}-${i}`}
                      className="border-t border-line bg-surface"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {row.paidAt ? shortDate(row.paidAt, lang) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold tnum">
                        {usd(row.amountUsd, lang, true)}
                        <span className="ml-2 font-normal text-faint">
                          {/* Null means the donor did not opt in: the
                              contribution still counts, without a name. */}
                          {row.donorName ?? t.transparency.anonymousDonor}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {row.networkLabel}
                        {row.token && <span className="ml-1.5 text-faint">{row.token}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {row.txUrl ? (
                          <a
                            href={row.txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-settled underline decoration-settled/40 underline-offset-4"
                          >
                            {t.transparency.viewTx}
                          </a>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        {/* ------------------------------------------- Who is behind this */}
        {/* The letter, moved below the form. It is still the thing that makes
            a stranger believe a real person is asking, which is why it is a
            named section on the page and not a fold in the detail block. */}
        <section id="organizer" className="scroll-mt-20 pt-12">
          <h2 className="text-lg font-semibold tracking-tight">{t.organizer.title}</h2>

          {/* Slightly larger and looser than UI text: this is meant to be read
              start to finish, not scanned. */}
          <div className="letter mt-5 text-pretty text-[1.125rem] leading-[1.8] text-muted sm:text-[1.1875rem]">
            {letterPreview.map((paragraph, i) => letterParagraph(paragraph, i))}

            {/* Nothing is cut — the rest of the account, the photographs and
                the link to the thread all live one click away. The photographs
                open the fold rather than sitting in the preview: six images
                would make a "collapsed" section longer than the letter it is
                meant to shorten. */}
            {letterRest.length > 0 && (
              <details className="group mt-5">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-medium text-accent transition-opacity hover:opacity-80">
                  <span className="group-open:hidden">{t.letter.readMore}</span>
                  <span className="hidden group-open:inline">{t.letter.readLess}</span>
                  <span
                    aria-hidden
                    className="text-xl leading-none transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <div className="mt-5">
                  <Photos lang={lang} credit={t.letter.photoCredit} />
                  <p className="mt-6">
                    <a
                      href={AUTHOR.thread}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline decoration-accent-dim/60 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      {t.letter.threadLink} →
                    </a>
                  </p>
                  <div className="mt-5">
                    {letterRest.map((paragraph, i) =>
                      letterParagraph(paragraph, i + LETTER_PREVIEW),
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Signed outside the fold on purpose: a reader who never opens
                the rest still sees that a named person, with public profiles
                anyone can check, put their name to this. */}
            <Signature lang={lang} />
          </div>
        </section>

        {/* -------------------------------------------------- Transparency */}
        {/* Promoted out of the detail folds. "Verify it yourself" is the whole
            argument of this page; a claim a donor has to go looking for is a
            claim they will not check. */}
        <section id="transparency" className="scroll-mt-20 pt-12">
          <h2 className="text-lg font-semibold tracking-tight">{t.transparency.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <LinkedText>{t.transparency.lede}</LinkedText>
          </p>

          {/* Single column. This was two-up when there was a treasury card
              beside the intake one; left at sm:grid-cols-2 it rendered one
              card across half the width with an empty half beside it, which
              reads as a missing card rather than a deliberate layout. */}
          <div className="mt-4 grid gap-3">
            {wallets.map((w) => (
              <div key={w.label} className="rounded-2xl border border-line bg-surface p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-faint">
                  {w.label}
                </p>
                {w.address ? (
                  <p className="mt-2 break-all font-mono text-xs text-settled">{w.address}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted">{t.transparency.walletPending}</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  <LinkedText>{w.note}</LinkedText>
                </p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-sm font-medium uppercase tracking-wider text-faint">
            {t.transparency.outflowsTitle}
          </h3>
          <p className="mt-1.5 text-sm text-muted">{t.transparency.outflowsLede}</p>
          {!props.onchainConfigured ? (
            <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface/50 p-5 text-sm text-muted">
              {t.transparency.outflowsUnavailable}
            </p>
          ) : props.movements.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface/50 p-5 text-sm text-muted">
              {t.transparency.outflowsEmpty}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[30rem] border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-2 text-left uppercase tracking-wider text-faint">
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t.transparency.colDirection}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t.transparency.colAmount}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t.transparency.colNetwork}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t.transparency.colCounterparty}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t.transparency.colTx}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {props.movements.map((m, i) => (
                    <tr key={`${m.txUrl}-${i}`} className="border-t border-line bg-surface">
                      <td className="whitespace-nowrap px-3 py-2">
                        {m.direction === "internal" ? (
                          <span className="text-faint">
                            {t.transparency.inbound} → {t.transparency.outbound}
                          </span>
                        ) : (
                          <span
                            className={m.direction === "in" ? "text-settled" : "text-accent"}
                          >
                            {m.direction === "in"
                              ? t.transparency.inbound
                              : t.transparency.outbound}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold tnum text-fg">
                        {num(m.amount, lang)}{" "}
                        <span className="font-normal text-faint">{m.symbol}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{m.chainLabel}</td>

                      {/* The other side of the transfer. Named when we can
                          vouch for it, a truncated address linked to the
                          explorer when we cannot — never blank, and never a
                          guess. */}
                      <td className="px-3 py-2">
                        {(() => {
                          const name = labelFor(m.counterparty, lang);
                          const url = addressUrlFrom(m.txUrl, m.counterparty);
                          const shown = name ?? shortAddress(m.counterparty);
                          return url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`underline decoration-line underline-offset-4 hover:text-accent ${
                                name ? "" : "font-mono text-xs"
                              }`}
                            >
                              {shown}
                            </a>
                          ) : (
                            <span className={name ? "" : "font-mono text-xs"}>{shown}</span>
                          );
                        })()}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2">
                        <a
                          href={m.txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-settled underline underline-offset-4"
                        >
                          {t.transparency.viewTx}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ------------------------------------------------ Folded detail */}
        <section className="pb-10">
          <h2 className="text-sm font-medium uppercase tracking-wider text-faint">
            {t.detailsTitle}
          </h2>
          <div className="mt-2 rounded-2xl border border-line bg-surface px-5">
            <Detail title={t.onchain.title}>
              <p><LinkedText>{t.onchain.body}</LinkedText></p>
              <p className="mt-3"><LinkedText>{t.onchain.body2}</LinkedText></p>
            </Detail>

            <Detail title={t.flow.title}>
              <ol className="space-y-4">
                {t.flow.steps.map((step, i) => (
                  <li key={step.title}>
                    <span aria-hidden className="text-xs font-semibold tnum text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-semibold text-fg">
                      <LinkedText>{step.title}</LinkedText>
                    </p>
                    <p className="mt-1"><LinkedText>{step.body}</LinkedText></p>
                  </li>
                ))}
              </ol>
            </Detail>

            {/* The "who manages the donations" and "verify it yourself" folds
                used to sit here. The first repeated, three times over, what
                faq.groups[0] now says once; the second hid the wallet and its
                movements behind a click, and they are the page's whole
                argument, so they were promoted into a section of their own
                above. */}

            {/* Only rendered once there is something to render. An empty
                "what has been handed out" heading is a promise, and a promise
                that stays empty for three weeks says more than no section. */}
            {DISBURSEMENTS.length > 0 && (
              <Detail title={t.transparency.disbursementsTitle}>
                <p>{t.transparency.disbursementsLede}</p>
                <ul className="mt-4 space-y-4">
                  {DISBURSEMENTS.map((d) => (
                    <li key={`${d.date}-${d.recipient}`} className="border-t border-line-soft pt-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-medium text-fg">{d.recipient}</span>
                        <span className="font-semibold tnum text-fg">
                          {num(d.amount, lang)} {d.currency}
                        </span>
                      </div>
                      <p className="mt-1">{d.purpose[lang]}</p>

                      {/* The distinction is the point, so it is a visible
                          badge and not a footnote: green and checkable, or
                          muted and attested. */}
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {d.kind === "onchain" && d.txUrl ? (
                          <a
                            href={d.txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-settled underline underline-offset-4"
                          >
                            {t.transparency.disbursementVerified} →
                          </a>
                        ) : (
                          <span className="text-faint">{t.transparency.disbursementReported}</span>
                        )}

                        {d.evidence?.length
                          ? d.evidence.map((e) => (
                              <a
                                key={e.url}
                                href={e.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-line underline-offset-4 hover:text-accent"
                              >
                                {e.label[lang]}
                              </a>
                            ))
                          : d.kind === "reported" && (
                              <span className="text-faint">
                                {t.transparency.disbursementNoEvidence}
                              </span>
                            )}
                      </p>
                    </li>
                  ))}
                </ul>
              </Detail>
            )}

            {/* One fold per theme rather than twelve questions in a row.
                Flat, the list read as an undifferentiated wall; grouped, a
                reader goes straight to the part they actually doubt. */}
            {/* First fold, and deliberately not one question among twelve.
                Whether the organisation holding the money has ever handled
                money before is the doubt a stranger actually has, and the
                links are the answer — every claim here is checkable on a
                site ReFi Colombia publishes, not on this one. */}
            <Detail title={t.faq.trackRecord.title}>
              <p><LinkedText>{t.faq.trackRecord.body}</LinkedText></p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {t.faq.trackRecord.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline decoration-accent-dim/60 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      {link.label} →
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-faint">{t.faq.trackRecord.note}</p>
            </Detail>

            {t.faq.groups.map((group) => (
              <Detail key={group.title} title={group.title}>
                <dl className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.q}>
                      <dt className="font-semibold text-fg">{item.q}</dt>
                      <dd className="mt-1">
                        <LinkedText>{item.a}</LinkedText>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Detail>
            ))}
          </div>
        </section>

        <section className="pb-10">
          <LogoWall
            lang={lang}
            orgs={visible(SUPPORTERS)}
            title={t.orgs.technologyTitle}
          />
        </section>
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-sm text-muted">{t.footer.built}</p>
          <p className="mt-2 text-xs leading-relaxed text-faint">{t.footer.disclaimer}</p>
          <p className="mt-4 text-xs text-faint">
            <a
              href={`mailto:${props.contactEmail}`}
              className="underline decoration-line underline-offset-4 hover:text-accent"
            >
              {props.contactEmail}
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
