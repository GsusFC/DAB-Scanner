"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Result = {
  score: number;
  survivalDays: number;
  categories: Record<string, { score: number; label: string }>;
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  verdict: string;
  brandName: string;
};

type ScanState = "idle" | "loading" | "success" | "error";
type ScanStage = "scraping" | "scraped" | "analyzing" | "done" | "error" | null;

type ScrapedMeta = {
  title: string;
  headingsCount: number;
  linksCount: number;
  imagesCount: number;
  ctasCount: number;
};

const PAD = {
  paddingLeft: "clamp(1.25rem, 4vw, 2rem)",
  paddingRight: "clamp(1.25rem, 4vw, 2rem)",
};

const ANALYSIS_STAGES = [
  { key: "scraping", label: "Connecting to the site" },
  { key: "scraped", label: "Extracting visual and verbal signals" },
  { key: "analyzing", label: "Running brand analysis" },
] as const;

function scoreColor(score: number) {
  if (score < 40) return "#ff6b57";
  if (score < 70) return "#5c7cff";
  return "#44c47a";
}

function scoreTone(score: number) {
  if (score < 40) return "Weak";
  if (score < 70) return "Developing";
  return "Strong";
}

function DABLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DAB* logo"
    >
      <path
        d="M299.986 150.006L149.994 300H0L149.992 150.007L0 0.0146484V0.0117188H149.994L299.986 150.006Z"
        fill="#ff6b57"
      />
      <path
        d="M449.978 -6.55641e-06L599.972 149.993L599.972 299.987L449.978 149.994L299.985 299.986L299.984 299.986L299.984 149.993L449.978 -6.55641e-06Z"
        fill="#44c47a"
      />
      <path
        d="M674.935 75L599.946 0.0117188V299.993H599.938V0.0107422H674.935V75ZM674.935 299.993H599.948L674.935 225.007V299.993ZM824.938 299.993H674.948V0.0107422H824.938V299.993ZM899.939 75.0068L824.944 150.001L899.939 224.996L824.942 299.993V0.0107422L899.939 75.0068ZM674.935 224.99L599.948 150.004L674.935 75.0176V224.99Z"
        fill="#5c7cff"
      />
    </svg>
  );
}

function RGBLine() {
  return (
    <div className="flex h-px" role="separator" aria-hidden="true">
      <div className="flex-1 bg-red" />
      <div className="flex-1 bg-green" />
      <div className="flex-1 bg-blue" />
    </div>
  );
}

function FullWidth({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex w-full flex-col items-center ${className}`} style={PAD}>
      {children}
    </div>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-transparent shadow-none ${className}`}>
      {children}
    </div>
  );
}

function Btn({
  children,
  href,
  onClick,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex h-14 min-w-[280px] items-center justify-center px-10 font-mono text-[11px] uppercase tracking-[0.08em] transition-all duration-200";
  const styles =
    variant === "primary"
      ? `${base} bg-text text-bg hover:-translate-y-px hover:opacity-90`
      : `${base} border border-border text-text-secondary hover:border-text-tertiary hover:text-text`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles}
      >
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={styles} type={type}>
      {children}
    </button>
  );
}

function Header({ onNewScan }: { onNewScan?: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/88 backdrop-blur-xl">
      <div
        className="flex h-14 items-center justify-between"
        style={PAD}
      >
        <div className="flex items-center gap-3">
          <DABLogo className="h-3.5 w-auto" />
          <a
            href="https://wearefloc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-text transition-colors hover:text-text-secondary"
          >
            *Scanner by FLOC*
          </a>
        </div>
        {onNewScan && (
          <button
            type="button"
            onClick={onNewScan}
            className="inline-flex h-8 items-center justify-center bg-green font-mono text-[10px] uppercase tracking-[0.08em] text-bg transition-all duration-200 hover:opacity-90" style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
          >
            Scan brand
          </button>
        )}
      </div>
      <RGBLine />
    </header>
  );
}

function Landing({
  url,
  onUrlChange,
  onSubmit,
  isLoading,
}: {
  url: string;
  onUrlChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const isValid = useMemo(() => {
    try {
      const parsed = new URL(normalized);
      return Boolean(parsed.hostname && parsed.hostname.includes("."));
    } catch {
      return false;
    }
  }, [normalized]);

  return (
    <main className="flex min-h-[calc(100dvh-57px)] flex-col" style={PAD}>
      <section className="flex flex-1 flex-col items-center justify-center gap-14 py-20 text-center">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary">
            Brand Autonomy Diagnostic
          </span>
        </div>

        <h1 className="max-w-[11ch] text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-balance">
          Is your brand built to operate without you?
        </h1>

        <p className="max-w-[40rem] text-[16px] leading-7 text-text-secondary">
          Drop in a website and get a sharper read on brand structure, voice,
          consistency, and operational resilience. No account, no setup, just
          a fast DAB* diagnosis.
        </p>

        <form onSubmit={onSubmit} className="w-full max-w-[640px]">
          <label htmlFor="url-input" className="sr-only">
            Website URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="yourproject.com"
              autoComplete="url"
              spellCheck={false}
              autoFocus
              className="h-12 w-full border border-border bg-transparent px-4 font-mono text-sm text-text outline-none transition-colors placeholder:text-text-tertiary/60 focus-visible:border-text-secondary"
            />
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="inline-flex h-12 items-center justify-center border border-text bg-text px-5 font-mono text-[11px] uppercase tracking-[0.08em] text-bg transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25 sm:min-w-[152px]"
            >
              {isLoading ? "Scanning..." : "Scan brand"}
            </button>
          </div>
        </form>
      </section>

      <footer className="border-t border-border py-4 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="https://paragraph.com/@brand3/dab"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-text-secondary"
            >
              What is a DAB*?
            </a>
            <span>Free. No signup. AI-assisted diagnosis.</span>
          </div>
        </footer>
    </main>
  );
}

function stageOrder(stage: ScanStage): number {
  const order: Record<string, number> = { scraping: 0, scraped: 1, analyzing: 2, done: 3 };
  return stage ? (order[stage] ?? -1) : -1;
}

function Scanning({
  url,
  error,
  scanStage,
  scrapedMeta,
  onRetry,
  onBack,
}: {
  url: string;
  error: string | null;
  scanStage: ScanStage;
  scrapedMeta: ScrapedMeta | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [error]);

  const currentOrder = stageOrder(scanStage);

  return (
    <main className="flex min-h-[calc(100dvh-57px)] flex-col items-center" style={{ ...PAD, paddingTop: "5rem", animation: "enter 0.5s var(--ease) both" }}>
      <div className="flex w-full max-w-[920px] flex-1 flex-col gap-16 pb-12">
        <section className="flex flex-col gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
            Live analysis
          </p>
          <h1 className="max-w-[12ch] text-[clamp(2rem,6vw,3.6rem)] font-semibold leading-[0.96] tracking-[-0.04em]">
            Diagnosing the brand system.
          </h1>
          <p className="max-w-[40rem] text-[15px] leading-6 text-text-secondary">
            We are checking the site structure, copy signals, and visual
            patterns. This view stays intentionally calm while the analysis
            runs in the background.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Target
              </p>
              <p className="text-sm text-text">{url.replace(/^https?:\/\//, "")}</p>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
              {error ? "Needs retry" : elapsed > 20 ? `${elapsed}s — taking longer than usual` : `${elapsed}s elapsed`}
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="self-start px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Change URL
          </button>
        </section>

        <div className="grid gap-x-16 gap-y-12 border-t border-border pt-10 lg:grid-cols-2" style={{ animation: "enter 0.5s var(--ease) 0.15s both" }}>
              <div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    Current stage
                  </p>
                  <p className="mt-3 text-lg font-medium text-text">
                    {error
                      ? "Scan interrupted"
                      : scanStage === "done"
                        ? "Analysis complete"
                        : ANALYSIS_STAGES.find((s) => s.key === scanStage)?.label ?? "Starting..."}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
                    {error ? "Interrupted" : scanStage === "done" ? "Done" : "Running"}
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  {ANALYSIS_STAGES.map((stage, index) => {
                    const stageIdx = stageOrder(stage.key);
                    const isComplete = stageIdx < currentOrder;
                    const isCurrent = stage.key === scanStage || (stage.key === "scraped" && scanStage === "scraped");

                    return (
                      <div key={stage.key} className="flex flex-col gap-3 px-1 py-4 transition-colors" style={{ animation: `enter 0.4s var(--ease) ${index * 0.1}s both` }}>
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center font-mono text-[10px] uppercase tracking-[0.08em]"
                            style={{
                              color: isComplete || isCurrent ? "#e4e4e8" : "#666b7d",
                              background: isCurrent ? "rgba(61,68,88,0.18)" : "transparent",
                            }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-sm text-text">{stage.label}</p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
                              {isComplete
                                ? "Completed"
                                : isCurrent
                                  ? error
                                    ? "Stopped here"
                                    : "In progress"
                                  : "Queued"}
                            </p>
                          </div>
                        </div>
                        {isCurrent && !error && (
                          <span className="flex h-1 w-full gap-0.5">
                            {[0, 0.2, 0.4, 0.6].map((delay) => (
                              <span
                                key={delay}
                                className="h-full flex-1 rounded-full bg-blue"
                                style={{ animation: `pulse 1.2s ease-in-out infinite ${delay}s` }}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  Scan data
                </p>
                {!error && !scrapedMeta && (
                  <>
                    <p className="mt-3 text-lg font-medium text-text">
                      Connecting to the site...
                    </p>
                    <p className="mt-4 max-w-[28rem] text-sm leading-5 text-text-secondary">
                      Fetching the page structure, headings, links, and visual signals.
                    </p>
                  </>
                )}
                {!error && scrapedMeta && (() => {
                  const stats = [
                    { label: "Headings", value: scrapedMeta.headingsCount },
                    { label: "Links", value: scrapedMeta.linksCount },
                    { label: "Images", value: scrapedMeta.imagesCount },
                    { label: "CTAs", value: scrapedMeta.ctasCount },
                  ].filter((s) => s.value > 0);
                  return (
                    <>
                      <p className="mt-3 text-lg font-medium text-text" style={{ animation: "enter 0.4s var(--ease) both" }}>
                        {scrapedMeta.title || "Site loaded"}
                      </p>
                      {stats.length > 0 ? (
                        <div className="mt-6 grid grid-cols-2 gap-4">
                          {stats.map((item, i) => (
                            <div key={item.label} style={{ animation: `enter 0.4s var(--ease) ${i * 0.08}s both` }}>
                              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                                {item.label}
                              </p>
                              <p className="mt-1 text-2xl font-semibold tabular-nums text-text">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-5 text-text-secondary" style={{ animation: "enter 0.4s var(--ease) both" }}>
                          JS-rendered site — limited static data available. Analysis will use available signals.
                        </p>
                      )}
                      {scanStage === "analyzing" && (
                        <p className="mt-6 text-sm leading-5 text-text-secondary" style={{ animation: "enter 0.4s var(--ease) both" }}>
                          Running brand analysis on the extracted data...
                        </p>
                      )}
                    </>
                  );
                })()}
                {error && (
                  <div className="mt-3">
                    <p className="text-lg font-medium text-text">Scan failed.</p>
                    <p className="mt-3 max-w-[28rem] text-sm leading-5 text-text-secondary">
                      {error}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Btn onClick={onRetry} variant="primary">
                        Retry scan
                      </Btn>
                      <Btn onClick={onBack} variant="secondary">
                        Edit URL
                      </Btn>
                    </div>
                  </div>
                )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Gauge({ score }: { score: number }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative h-[196px] w-[196px] shrink-0">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#242633" strokeWidth="3" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={
            {
              "--circumference": circumference,
              "--offset": offset,
              animation: "gaugeStroke 1.2s var(--ease) 0.15s forwards",
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-semibold leading-none tracking-[-0.04em]" style={{ color }}>
          {score}
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
          autonomy score
        </span>
      </div>
    </div>
  );
}

function Results({
  result,
  url,
  onReset,
  onShowNextStep,
}: {
  result: Result;
  url: string;
  onReset: () => void;
  onShowNextStep: () => void;
}) {
  const categories = Object.entries(result.categories);
  const summaryTone = scoreTone(result.score);

  return (
    <main className="flex flex-col items-center gap-16 pb-40 sm:pb-48" style={{ ...PAD, paddingTop: "5rem", animation: "enter 0.5s var(--ease) both" }}>
      <section className="w-full max-w-[920px]">
        <div className="grid w-full gap-x-16 gap-y-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <div className="flex justify-center lg:justify-end">
            <Gauge score={result.score} />
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex min-h-[2.25rem] items-start gap-4">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: scoreColor(result.score) }}
              />
              <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                {result.brandName || new URL(url).hostname} / Verdict
              </p>
            </div>
            <h1 className="w-full text-[48px] font-semibold leading-[0.98] tracking-[-0.05em] text-balance">
              {result.verdict}
            </h1>
            <p className="w-full max-w-[56rem] text-[15px] leading-5 text-text-secondary">
              This is a {summaryTone.toLowerCase()} operating brand. The
              score blends visual repeatability, voice clarity, structural
              logic, and how independently the brand can keep producing
              coherent output.
            </p>
          </div>
        </div>
      </section>

      <section className="grid w-full max-w-[920px] gap-x-20 gap-y-16 lg:grid-cols-2">
          <Surface className="relative z-10 border-t border-border/70 px-3 pt-8 sm:px-4 sm:pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Category breakdown
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text">
              Where the score comes from
            </h2>

            <div className="mt-8 space-y-6">
              {categories.map(([key, category]) => {
                const color = scoreColor(category.score);

                return (
                  <div key={key}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                          {key}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-text-secondary">
                          {category.label}
                        </p>
                      </div>
                      <p
                        className="font-mono text-[14px] font-semibold tabular-nums"
                        style={{ color }}
                      >
                        {category.score}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden bg-border">
                      <div
                        className="h-full"
                        style={{
                          width: `${category.score}%`,
                          background: `linear-gradient(90deg, ${color}CC 0%, ${color} 100%)`,
                          animation: "scaleIn 0.7s var(--ease) both",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>

          <Surface className="relative z-10 border-t border-border/70 px-3 pt-8 sm:px-4 sm:pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Strengths
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text">
              What the brand is already doing well
            </h2>
            <div className="mt-8 grid gap-8">
              {result.strengths.map((item) => (
                <div key={`${item.title}-${item.detail}`}>
                  <p className="text-base font-medium text-text">{item.title}</p>
                  <p className="mt-2 text-sm leading-5 text-text-secondary">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </Surface>
      </section>

      <section className="grid w-full max-w-[920px] gap-x-20 gap-y-20 lg:grid-cols-2">
          <Surface className="relative z-10 border-t border-border/70 px-3 pt-8 sm:px-4 sm:pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Survival horizon
            </p>
            <div className="mt-4 flex items-end gap-4">
              <p className="text-[48px] font-semibold leading-none tracking-[-0.05em] text-text">
                {result.survivalDays}
              </p>
              <p className="pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                days
              </p>
            </div>
            <p className="mt-4 text-sm leading-5 text-text-secondary">
              Estimated time the brand could keep output quality without direct
              founder intervention.
            </p>
            <div className="mt-8 max-w-[40rem]">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Scan target
              </p>
              <p className="mt-3 text-sm leading-5 text-text-secondary">{url}</p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Readiness
              </p>
              <p className="mt-4 text-[48px] font-semibold leading-none tracking-[-0.05em] text-text">
                {summaryTone}
              </p>
              <p className="mt-4 max-w-[34rem] text-sm leading-5 text-text-secondary">
                A shorthand read of how stable and transferable the system feels.
              </p>
            </div>
          </Surface>

          <Surface className="relative z-10 border-t border-border/70 px-3 pt-8 sm:px-4 sm:pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Weaknesses
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text">
              Where the system is still fragile
            </h2>
            <div className="mt-8 grid gap-8">
              {result.weaknesses.map((item) => (
                <div key={`${item.title}-${item.detail}`}>
                  <p className="text-base font-medium text-text">{item.title}</p>
                  <p className="mt-2 text-sm leading-5 text-text-secondary">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </Surface>
      </section>

      <div className="flex w-full max-w-[920px] justify-center">
        <button
          type="button"
          onClick={onShowNextStep}
          className="inline-flex h-14 min-w-[280px] items-center justify-center bg-green px-10 font-mono text-[11px] uppercase tracking-[0.08em] text-bg transition-all duration-200 hover:-translate-y-px hover:opacity-90"
        >
          What to do next
        </button>
      </div>
    </main>
  );
}

function NextStepOverlay({
  result,
  onReset,
  onClose,
}: {
  result: Result;
  onReset: () => void;
  onClose: () => void;
}) {
  const weakest = [...Object.entries(result.categories)]
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ animation: "overlayIn 0.35s var(--ease) both" }}
    >
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-[760px] flex-col gap-10 overflow-y-auto border border-border/50 bg-bg-panel sm:gap-12" style={{ padding: "clamp(3rem, 5vw, 4rem) clamp(2.5rem, 5vw, 4rem)" }}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
            Next step
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-text-tertiary transition-colors hover:text-text"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
          {result.score < 40
            ? "This brand needs foundational work before it can run on its own."
            : result.score < 70
              ? "The structure is forming — time to close the gaps."
              : "Strong base. Now codify it so it scales without you."}
        </h2>

        <div className="grid gap-x-14 gap-y-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Priority fixes
            </p>
            <div className="flex flex-col gap-5">
              {weakest.map(([key, cat], i) => (
                <div key={key} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center font-mono text-[10px]"
                    style={{ color: scoreColor(cat.score) }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text">
                      {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                      <span
                        className="font-mono text-[11px] tabular-nums"
                        style={{ color: scoreColor(cat.score) }}
                      >
                        {cat.score}
                      </span>
                    </p>
                    <p className="mt-1 text-sm leading-5 text-text-secondary">
                      {cat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              What to do with this report
            </p>
            <div className="flex flex-col gap-4">
              {[
                result.score < 40
                  ? "Define a basic visual system: logo rules, 2-3 colors, one typeface"
                  : result.score < 70
                    ? "Document the existing visual patterns into reusable tokens"
                    : "Audit your system for the few remaining inconsistencies",
                result.score < 40
                  ? "Write a single-page voice guide with tone, vocabulary, and examples"
                  : result.score < 70
                    ? "Strengthen voice rules with do/don't examples for each content type"
                    : "Test your voice guide with someone outside the team — can they write in your brand?",
                "Use this score as a baseline. Re-scan after changes to track progress.",
              ].map((step) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-tertiary" />
                  <p className="text-sm leading-6 text-text-secondary">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Btn href="https://wearefloc.com" variant="primary">
            Book a call with FLOC*
          </Btn>
          <Btn onClick={onReset} variant="secondary">
            Scan another brand
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanStage, setScanStage] = useState<ScanStage>(null);
  const [scrapedMeta, setScrapedMeta] = useState<ScrapedMeta | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNextStep, setShowNextStep] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startScan = async (targetUrl: string) => {
    const normalized = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSubmittedUrl(normalized);
    setScanState("loading");
    setScanStage(null);
    setScrapedMeta(null);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Analysis failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const events: Array<{ stage: string; data?: unknown; message?: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          events.push(JSON.parse(line.slice(6)));
        }
      }

      const minStageMs = 1500;
      for (const event of events) {
        const stageStart = Date.now();

        if (event.stage === "scraping") {
          setScanStage("scraping");
        } else if (event.stage === "scraped") {
          setScanStage("scraped");
          setScrapedMeta(event.data as ScrapedMeta);
        } else if (event.stage === "analyzing") {
          setScanStage("analyzing");
        } else if (event.stage === "done") {
          setScanStage("done");
          setResult(event.data as Result);
          await new Promise((r) => setTimeout(r, 800));
          setScanState("success");
          return;
        } else if (event.stage === "error") {
          throw new Error((event.message as string) || "Analysis failed");
        }

        const elapsed = Date.now() - stageStart;
        if (elapsed < minStageMs) {
          await new Promise((r) => setTimeout(r, minStageMs - elapsed));
        }
      }
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
      setError(
        caughtError instanceof Error ? caughtError.message : "Analysis failed"
      );
      setScanState("error");
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    void startScan(url.trim());
  };

  const handleReset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setScanState("idle");
    setScanStage(null);
    setScrapedMeta(null);
    setResult(null);
    setError(null);
    setSubmittedUrl("");
    setShowNextStep(false);
  };

  const handleRetry = () => {
    if (!submittedUrl) return;
    void startScan(submittedUrl);
  };

  return (
    <>
      <Header onNewScan={scanState === "success" ? handleReset : undefined} />
      {scanState === "idle" && (
        <Landing
          url={url}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
          isLoading={false}
        />
      )}
      {(scanState === "loading" || scanState === "error") && (
        <Scanning
          url={submittedUrl}
          error={error}
          scanStage={scanStage}
          scrapedMeta={scrapedMeta}
          onRetry={handleRetry}
          onBack={handleReset}
        />
      )}
      {scanState === "success" && result && (
        <>
          <Results
            result={result}
            url={submittedUrl}
            onReset={handleReset}
            onShowNextStep={() => setShowNextStep(true)}
          />
          {showNextStep && (
            <NextStepOverlay
              result={result}
              onReset={handleReset}
              onClose={() => setShowNextStep(false)}
            />
          )}
        </>
      )}
    </>
  );
}
