"use client";

import { AUTHOR } from "@/lib/author";
import { COPY, FIGURES, SOURCES, type Lang } from "@/lib/content";
import { RECIPIENT, SUPPORTERS, visible } from "@/lib/orgs";
import { useLang } from "@/lib/useLang";
import { DonateForm } from "./DonateForm";
import { LinkedText } from "./LinkedText";
import { LogoWall } from "./LogoWall";
import { Photos } from "./Photos";
import { Signature } from "./Signature";

export type LedgerEntry = {
  amountUsd: number;
  donorName: string | null;
  paidAt: string | null;
  token: string | null;
  networkLabel: string;
  txUrl: string | null;
  certificateUrl: string | null;
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

      {/* One narrow column throughout. A letter has a measure; a landing page
          has sections, and this is meant to read as the former. */}
      <main id="top" className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6">
        {/* -------------------------------------------------------- Letter */}
        <section className="pt-12 sm:pt-20">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">
            {t.hero.eyebrow}
          </p>
          <h1 className="letter mt-4 text-balance text-[1.75rem] font-medium leading-[1.28] tracking-tight text-fg sm:text-[2.25rem]">
            {t.hero.title}
          </h1>

          {/* Slightly larger and looser than UI text: this is meant to be read
              start to finish, not scanned. */}
          <div className="letter mt-7 text-pretty text-[1.125rem] leading-[1.8] text-muted sm:text-[1.1875rem]">
            {t.letter.paragraphs.map((paragraph, i) => (
              <div key={i}>
                <p className={i === 0 ? "" : "mt-5"}><LinkedText>{fillFigures(paragraph)}</LinkedText></p>

                {/* Sourcing sits with the claim it supports, not folded away
                    in a section of its own — a reader who doubts the number
                    looks here, not three screens down. */}
                {i === FIGURES_PARAGRAPH && (
                  <p className="mt-2 text-sm leading-relaxed text-faint">
                    {t.figures.disclaimer} {t.figures.asOf}{" "}
                    {/* No full stop after the time: Spanish formats it as
                        "7:00 p. m.", which already ends in one. */}
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

                {/* The photographs sit where the letter describes what
                    happened, not in a gallery of their own. They are the
                    evidence that the person writing was actually there. */}
                {i === t.letter.photosAfter && (
                  <>
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
                  </>
                )}
              </div>
            ))}

            {/* Signed inside the letter, not in a section of its own: the
                point is that a person wrote this, and a detached "about the
                author" block would undo that. */}
            <Signature lang={lang} />
          </div>
        </section>

        {/* -------------------------------------------------------- Donate */}
        <section id="donate" className="scroll-mt-20 py-10">
          <DonateForm
            lang={lang}
            enabled={props.donationsEnabled}
            certificatesEnabled={props.certificatesEnabled}
          />
        </section>

        {/* ------------------------------- Total raised and who contributed */}
        <section id="transparency" className="scroll-mt-20 pb-10">
          {props.statsAvailable ? (
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
            /* Says why the number is missing instead of hiding the block.
               Showing $0 here would be a claim we cannot support: with the
               counter disconnected we do not know the total, and "we don't
               know" is not the same as "nothing". */
            <p className="rounded-2xl border border-dashed border-line bg-surface/50 p-5 text-sm text-muted">
              {t.stats.unavailable}
            </p>
          )}

          {/* The contributions list is public proof, so it stays on the page
              rather than folded away with the technical detail. */}
          <h2 className="mt-8 text-lg font-semibold tracking-tight">
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

          {/* Single column. This was two-up when there was a treasury card
              beside the intake one; left at sm:grid-cols-2 it rendered one
              card across half the width with an empty half beside it, which
              reads as a missing card rather than a deliberate layout. */}
          <div className="mt-8 grid gap-3">
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
              </div>
            ))}
          </div>
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

            <Detail title={t.manager.title}>
              <a
                href={RECIPIENT.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent underline decoration-accent-dim/50 underline-offset-4"
              >
                {RECIPIENT.name}
              </a>
              <p className="mt-2"><LinkedText>{t.manager.body}</LinkedText></p>
              <p className="mt-3 font-medium text-fg">{t.funds.title}</p>
              <p className="mt-1"><LinkedText>{t.funds.lede}</LinkedText></p>
              <p className="mt-3"><LinkedText>{t.funds.reporting}</LinkedText></p>
            </Detail>

            <Detail title={t.transparency.title}>
              {wallets.map((w) => (
                <p key={w.label} className="mb-3">
                  <span className="font-medium text-fg">{w.label}.</span>{" "}
                  <LinkedText>{w.note}</LinkedText>
                </p>
              ))}

              {/* The donation ledger itself lives above, on the page proper —
                  it is proof, not fine print. Only the wallet-level movements
                  stay folded here. */}
              <p className="mt-4 font-medium text-fg">{t.transparency.outflowsTitle}</p>
              <p className="mt-1">{t.transparency.outflowsLede}</p>
              {!props.onchainConfigured ? (
                <p className="mt-2">{t.transparency.outflowsUnavailable}</p>
              ) : props.movements.length === 0 ? (
                <p className="mt-2">{t.transparency.outflowsEmpty}</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[30rem] border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-2 text-left uppercase tracking-wider text-faint">
                        <th className="px-3 py-2 font-medium">{t.transparency.colDirection}</th>
                        <th className="px-3 py-2 font-medium">{t.transparency.colAmount}</th>
                        <th className="px-3 py-2 font-medium">{t.transparency.colNetwork}</th>
                        <th className="px-3 py-2 font-medium">{t.transparency.colTx}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.movements.map((m, i) => (
                        <tr key={`${m.txUrl}-${i}`} className="border-t border-line">
                          <td className="whitespace-nowrap px-3 py-2">
                            {m.direction === "internal" ? (
                              <span className="text-faint">
                                {t.transparency.inbound} → {t.transparency.outbound}
                              </span>
                            ) : (
                              <span
                                className={
                                  m.direction === "in" ? "text-settled" : "text-accent"
                                }
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
            </Detail>

            {/* One fold per theme rather than twelve questions in a row.
                Flat, the list read as an undifferentiated wall; grouped, a
                reader goes straight to the part they actually doubt. */}
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
