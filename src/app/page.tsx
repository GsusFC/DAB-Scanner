"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, ScrapedMeta } from "@/lib/dab/types";

type ScanState = "idle" | "loading" | "success" | "error";
type ScanStage = "mapping" | "mapping-done" | "scraping" | "scraped" | "deep-scanning" | "deep-scanned" | "analyzing" | "done" | "error" | null;

const PAD = {
  paddingLeft: "clamp(1.25rem, 4vw, 2rem)",
  paddingRight: "clamp(1.25rem, 4vw, 2rem)",
};

const ANALYSIS_STAGES = [
  {
    key: "mapping",
    label: "Mapping site structure",
    detail: "Discovering pages, sections, and navigation depth.",
  },
  {
    key: "scraping",
    label: "Fetching site data",
    detail: "Connecting to the target URL and loading the homepage document.",
  },
  {
    key: "scraped",
    label: "Extracting brand signals",
    detail: "Reading structure, headings, links, images, CTAs, and metadata.",
  },
  {
    key: "deep-scanning",
    label: "Scanning key pages",
    detail: "Scraping internal pages for cross-page consistency analysis.",
  },
  {
    key: "analyzing",
    label: "Generating diagnosis",
    detail: "Synthesizing the DAB assessment from the extracted signals.",
  },
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

function LoaderStageIcon({
  stageKey,
  status,
}: {
  stageKey: (typeof ANALYSIS_STAGES)[number]["key"];
  status: "done" | "active" | "pending" | "error";
}) {
  const color =
    status === "done"
      ? "#44c47a"
      : status === "error"
        ? "#ff6b57"
        : status === "active"
          ? "#5c7cff"
          : "#63697d";
  const background =
    status === "done"
      ? "rgba(68,196,122,0.1)"
      : status === "error"
        ? "rgba(255,107,87,0.1)"
        : status === "active"
          ? "rgba(92,124,255,0.1)"
          : "rgba(255,255,255,0.02)";

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center border border-border/60"
      style={{ backgroundColor: background }}
      aria-hidden="true"
    >
      {status === "done" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : stageKey === "mapping" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3v10h10" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10V7M9 10V5M12 10V3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ) : stageKey === "scraping" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="1.3" />
          <path d="M2.5 8h11" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
          <path
            d="M8 2.5c1.6 1.7 2.4 3.5 2.4 5.5 0 2-.8 3.8-2.4 5.5-1.6-1.7-2.4-3.5-2.4-5.5 0-2 .8-3.8 2.4-5.5Z"
            stroke={color}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      ) : stageKey === "deep-scanning" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="6" rx="0.5" stroke={color} strokeWidth="1.2" />
          <rect x="9" y="2" width="5" height="6" rx="0.5" stroke={color} strokeWidth="1.2" />
          <rect x="5.5" y="10" width="5" height="4" rx="0.5" stroke={color} strokeWidth="1.2" />
        </svg>
      ) : stageKey === "scraped" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M3 8h7M3 12h9" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="11.5" cy="8" r="1" fill={color} />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2.5 9.2 6.8 13.5 8 9.2 9.2 8 13.5 6.8 9.2 2.5 8 6.8 6.8 8 2.5Z"
            stroke={color}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="12.5" cy="3.5" r="1" fill={color} />
        </svg>
      )}
    </span>
  );
}

function LoaderSkeletonCell({ label }: { label: string }) {
  return (
    <div className="border-t border-border/40 pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
        {label}
      </p>
      <div
        className="mt-3 h-7 w-16 bg-border/50"
        style={{ animation: "pulse 1.6s ease-in-out infinite" }}
      />
    </div>
  );
}

function stageOrder(stage: ScanStage): number {
  const order: Record<string, number> = { mapping: 0, "mapping-done": 1, scraping: 2, scraped: 3, "deep-scanning": 4, "deep-scanned": 5, analyzing: 6, done: 7 };
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
  }, [error, url]);

  const signalFeed = useMemo(() => {
    if (scanStage === "mapping" || scanStage === "mapping-done") {
      return [
        "Discovering site structure",
        "Mapping pages, sections, and navigation depth",
        "Building architecture profile",
      ];
    }

    if (!scrapedMeta) {
      return [
        "Opening connection to target URL",
        "Requesting page HTML and metadata",
        "Preparing structural scan",
      ];
    }

    const items: string[] = [];

    if (scrapedMeta.title) {
      items.push(
        `Title detected: ${
          scrapedMeta.title.length > 42
            ? `${scrapedMeta.title.slice(0, 42)}...`
            : scrapedMeta.title
        }`
      );
    }

    if (scrapedMeta.headingsCount > 0) {
      items.push(`${scrapedMeta.headingsCount} headings mapped`);
    }
    if (scrapedMeta.linksCount > 0) {
      items.push(`${scrapedMeta.linksCount} links indexed`);
    }
    if (scrapedMeta.imagesCount > 0) {
      items.push(`${scrapedMeta.imagesCount} images detected`);
    }
    if (scrapedMeta.ctasCount > 0) {
      items.push(`${scrapedMeta.ctasCount} CTAs identified`);
    }

    if (scanStage === "analyzing") {
      items.unshift("Comparing voice, hierarchy, and repeatability");
      items.push("Assembling the final structured diagnosis");
    }

    return items.length > 0 ? items : ["Static HTML loaded", "Preparing extracted signals"];
  }, [scanStage, scrapedMeta]);

  const currentOrder = stageOrder(scanStage);
  // mapping-done and deep-scanned are transitional — show the previous visible stage
  const resolvedStage = scanStage === "mapping-done" ? "mapping"
    : scanStage === "deep-scanned" ? "deep-scanning"
    : scanStage;
  const activeStage =
    ANALYSIS_STAGES.find((stage) => stage.key === resolvedStage) ?? null;
  const progress =
    error
      ? 100
      : scanStage === "done"
        ? 100
        : scanStage === "analyzing"
          ? Math.min(82 + Math.max(elapsed - 6, 0) * 1, 94)
          : scanStage === "deep-scanned"
            ? Math.min(72 + elapsed * 2, 78)
            : scanStage === "deep-scanning"
              ? Math.min(56 + Math.max(elapsed - 3, 0) * 2, 70)
              : scanStage === "scraped"
                ? Math.min(44 + Math.max(elapsed - 2, 0) * 2, 54)
                : scanStage === "scraping"
                  ? Math.min(16 + elapsed * 4, 38)
                  : scanStage === "mapping-done"
                    ? Math.min(12 + elapsed * 2, 15)
                    : scanStage === "mapping"
                      ? Math.min(3 + elapsed * 3, 10)
                      : 2;
  const progressLabel = error
    ? "Interrupted"
    : scanStage === "done"
      ? "Ready"
      : `${Math.round(progress)}%`;
  const pulseMessage =
    signalFeed.length > 0
      ? signalFeed[Math.floor(elapsed / 2) % signalFeed.length]
      : "Preparing scan";
  const targetLabel = url.replace(/^https?:\/\//, "");
  const stats = scrapedMeta
    ? [
        { label: "Headings", value: scrapedMeta.headingsCount },
        { label: "Links", value: scrapedMeta.linksCount },
        { label: "Images", value: scrapedMeta.imagesCount },
        { label: "CTAs", value: scrapedMeta.ctasCount },
      ]
    : [];

  return (
    <main
      className="flex min-h-[calc(100dvh-57px)] flex-col items-center"
      style={{ ...PAD, paddingTop: "4.75rem", animation: "enter 0.5s var(--ease) both" }}
    >
      <div className="flex w-full max-w-[980px] flex-1 flex-col gap-12 pb-16 sm:pb-24">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <div className="flex flex-col gap-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Live analysis
            </p>
            <h1 className="max-w-[12ch] text-[clamp(2rem,6vw,3.6rem)] font-semibold leading-[0.96] tracking-[-0.04em]">
              Diagnosing the brand system.
            </h1>
            <p className="max-w-[42rem] text-[15px] leading-6 text-text-secondary">
              We are collecting the page structure, extracting signals, and
              assembling the diagnosis in the background. This state reflects
              the real scan phases rather than a generic loader.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
              {error
                ? "Needs retry"
                : elapsed > 20
                  ? `${elapsed}s — taking longer than usual`
                  : `${elapsed}s elapsed`}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="self-start px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary transition-colors hover:text-text-secondary lg:self-auto"
            >
              Change URL
            </button>
          </div>
        </section>

        <section
          className="border border-border/60 bg-bg-panel/80"
          style={{ animation: "enter 0.5s var(--ease) 0.15s both" }}
        >
          <RGBLine />
          <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="border-b border-border/60 lg:border-b-0 lg:border-r lg:border-r-border/60">
              <div className="border-b border-border/60 px-6 py-6 sm:px-8">
                <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                      Current stage
                    </p>
                    <h2 className="mt-3 max-w-[18ch] text-[clamp(1.35rem,3vw,2rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-text">
                      {error
                        ? "Scan interrupted"
                        : scanStage === "done"
                          ? "Analysis complete"
                          : activeStage?.label ?? "Initializing scan"}
                    </h2>
                    <p className="mt-3 max-w-[40rem] text-sm leading-6 text-text-secondary">
                      {error
                        ? "The scan stopped before the diagnosis could be assembled."
                        : scanStage === "done"
                          ? "The structured assessment is ready and the UI is preparing the handoff."
                          : activeStage?.detail ??
                            "Preparing the request and warming up the analysis pipeline."}
                    </p>
                  </div>

                  <div className="border-t border-border/60 pt-4 sm:border-t-0 sm:border-l sm:border-l-border/60 sm:pl-5 sm:pt-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                      Target
                    </p>
                    <p className="mt-2 break-all text-sm text-text">{targetLabel}</p>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                      Status
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {error
                        ? "Interrupted"
                        : scanStage === "done"
                          ? "Final handoff"
                          : scanStage === "analyzing"
                            ? "Model synthesis"
                            : scanStage === "scraped"
                              ? "Signal extraction complete"
                              : "Connecting"}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="h-1 overflow-hidden bg-border/60">
                    <div
                      className="h-full"
                      style={{
                        width: `${progress}%`,
                        background: error
                          ? "#ff6b57"
                          : progress > 70
                            ? "linear-gradient(90deg, #5c7cff 0%, #44c47a 100%)"
                            : "#5c7cff",
                        transition: "width 700ms var(--ease)",
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    <span>{error ? "Interrupted" : "In progress"}</span>
                    <span>{progressLabel}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 sm:px-8">
                {ANALYSIS_STAGES.map((stage, index) => {
                  const stageIdx = stageOrder(stage.key);
                  const status: "done" | "active" | "pending" | "error" =
                    error && stageIdx >= currentOrder
                      ? "error"
                      : stageIdx < currentOrder
                        ? "done"
                        : stage.key === scanStage
                          ? "active"
                          : "pending";

                  return (
                    <div
                      key={stage.key}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 border-t border-border/40 py-4 first:border-t-0"
                      style={{ animation: `enter 0.4s var(--ease) ${index * 0.08}s both` }}
                    >
                      <LoaderStageIcon stageKey={stage.key} status={status} />

                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium"
                          style={{
                            color:
                              status === "done"
                                ? "#44c47a"
                                : status === "active"
                                  ? "#f3f4f7"
                                  : status === "error"
                                    ? "#ff6b57"
                                    : "#7a8092",
                          }}
                        >
                          {stage.label}
                        </p>
                        <p className="mt-1 max-w-[34rem] text-sm leading-5 text-text-secondary">
                          {stage.detail}
                        </p>
                      </div>

                      <div className="pt-0.5 text-right">
                        <span
                          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                          style={{
                            color:
                              status === "done"
                                ? "#44c47a"
                                : status === "active"
                                  ? "#a3a8bb"
                                  : status === "error"
                                    ? "#ff6b57"
                                    : "#63697d",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                status === "done"
                                  ? "#44c47a"
                                  : status === "active"
                                    ? "#5c7cff"
                                    : status === "error"
                                      ? "#ff6b57"
                                      : "#3a3e4c",
                              animation:
                                status === "active"
                                  ? "pulse 1.2s ease-in-out infinite"
                                  : undefined,
                            }}
                          />
                          {status === "done"
                            ? "Done"
                            : status === "active"
                              ? "Running"
                              : status === "error"
                                ? "Stopped"
                                : "Queued"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Signal log
              </p>

              {!error && (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-blue"
                      style={{ animation: "pulse 1.4s ease-in-out infinite" }}
                    />
                    <p
                      key={`${scanStage}-${pulseMessage}`}
                      className="text-sm leading-6 text-text"
                      style={{ animation: "enter 0.35s var(--ease) both" }}
                    >
                      {pulseMessage}
                    </p>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
                    {scrapedMeta ? (
                      stats.map((item, index) => (
                        <div
                          key={item.label}
                          className="border-t border-border/40 pt-4"
                          style={{ animation: `enter 0.4s var(--ease) ${index * 0.08}s both` }}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                            {item.label}
                          </p>
                          <p className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.04em] text-text">
                            {item.value}
                          </p>
                        </div>
                      ))
                    ) : (
                      <>
                        <LoaderSkeletonCell label="Headings" />
                        <LoaderSkeletonCell label="Links" />
                        <LoaderSkeletonCell label="Images" />
                        <LoaderSkeletonCell label="CTAs" />
                      </>
                    )}
                  </div>

                  <div className="mt-8 border-t border-border/40 pt-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                      Live read
                    </p>
                    <p
                      className="mt-3 text-lg font-medium text-text"
                      style={{ animation: "enter 0.4s var(--ease) both" }}
                    >
                      {scrapedMeta?.title || "Waiting for the site response"}
                    </p>
                    <p className="mt-3 max-w-[30rem] text-sm leading-6 text-text-secondary">
                      {!scrapedMeta
                        ? "Fetching the page shell and metadata. Once the document is loaded, the extracted counts will appear here."
                        : scanStage === "analyzing"
                          ? "The site signals are locked in. The model is now synthesizing voice, structure, consistency, and autonomy."
                          : "The page data is loaded. We are preparing the final analysis pass from the extracted signals."}
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className="mt-4 flex flex-col gap-5">
                  <p className="text-lg font-medium text-text">Scan failed.</p>
                  <p className="max-w-[30rem] text-sm leading-6 text-text-secondary">
                    {error}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
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
        </section>
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
  onShowNextStep,
}: {
  result: AnalysisResult;
  url: string;
  onShowNextStep: () => void;
}) {
  const categories = Object.entries(result.categories);
  const summaryTone = scoreTone(result.score);

  return (
    <main className="flex flex-col items-center pb-40 sm:pb-48" style={{ ...PAD, paddingTop: "5rem", gap: "4rem", animation: "enter 0.5s var(--ease) both" }}>
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
            <h1 className="w-full text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance">
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
  result: AnalysisResult;
  onReset: () => void;
  onClose: () => void;
}) {
  const weakest = [...Object.entries(result.categories)]
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", trapFocus);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="next-step-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ animation: "overlayIn 0.35s var(--ease) both" }}
    >
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div ref={dialogRef} className="relative z-10 flex max-h-[85vh] w-full max-w-[760px] flex-col gap-10 overflow-y-auto border border-border/50 bg-bg-panel sm:gap-12" style={{ padding: "clamp(3rem, 5vw, 4rem) clamp(2.5rem, 5vw, 4rem)" }}>
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

        <h2 id="next-step-title" className="text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNextStep, setShowNextStep] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const startScan = async (targetUrl: string) => {
    const normalized = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentRunId = ++runIdRef.current;

    setSubmittedUrl(normalized);
    setScanState("loading");
    setScanStage(null);
    setScrapedMeta(null);
    setError(null);
    setResult(null);

    const isStale = () => runIdRef.current !== currentRunId;

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
      let receivedTerminal = false;
      const minStageMs = 1500;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (isStale()) return;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          if (isStale()) return;

          const event = JSON.parse(line.slice(6)) as { stage: string; data?: unknown; message?: string };
          const stageStart = Date.now();

          if (event.stage === "mapping") {
            setScanStage("mapping");
          } else if (event.stage === "mapping-done") {
            setScanStage("mapping-done");
          } else if (event.stage === "scraping") {
            setScanStage("scraping");
          } else if (event.stage === "scraped") {
            setScanStage("scraped");
            setScrapedMeta(event.data as ScrapedMeta);
          } else if (event.stage === "deep-scanning") {
            setScanStage("deep-scanning");
          } else if (event.stage === "deep-scanned") {
            setScanStage("deep-scanned");
          } else if (event.stage === "analyzing") {
            setScanStage("analyzing");
          } else if (event.stage === "done") {
            receivedTerminal = true;
            setScanStage("done");
            setResult(event.data as AnalysisResult);
            await new Promise((r) => setTimeout(r, 800));
            if (isStale()) return;
            setScanState("success");
            return;
          } else if (event.stage === "error") {
            receivedTerminal = true;
            throw new Error((event.message as string) || "Analysis failed");
          }

          const elapsed = Date.now() - stageStart;
          if (elapsed < minStageMs) {
            await new Promise((r) => setTimeout(r, minStageMs - elapsed));
          }
        }
      }

      if (!receivedTerminal && !isStale()) {
        throw new Error("Analysis stream ended without a result");
      }
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
      if (isStale()) return;
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
    runIdRef.current++;
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
          key={runIdRef.current}
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
