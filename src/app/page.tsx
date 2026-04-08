"use client";

import { useEffect, useMemo, useState } from "react";

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

const PAD = {
  paddingLeft: "clamp(1.25rem, 4vw, 2rem)",
  paddingRight: "clamp(1.25rem, 4vw, 2rem)",
};

const ANALYSIS_STAGES = [
  "Connecting to the site",
  "Extracting visual and verbal signals",
  "Comparing consistency across the brand",
  "Writing the diagnosis",
];

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
    <div
      className={`bg-transparent shadow-none ${className}`}
    >
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

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/88 backdrop-blur-xl">
      <div
        className="mx-auto flex h-14 max-w-[1280px] items-center justify-between"
        style={PAD}
      >
        <div className="flex items-center gap-3">
          <DABLogo className="h-3.5 w-auto" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text">
              DAB* Scanner
            </span>
            <span className="rounded-full border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-tertiary">
              Beta
            </span>
          </div>
        </div>
        <a
          href="https://wearefloc.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          by FLOC*
        </a>
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
    <main className="min-h-[calc(100dvh-57px)]">
      <div className="relative min-h-[calc(100dvh-57px)]" style={PAD}>
        <section className="absolute left-1/2 top-1/2 flex w-full max-w-[760px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
          <div className="mb-8 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary">
              Brand Autonomy Diagnostic
            </span>
          </div>

          <h1 className="max-w-[11ch] text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-balance">
            Is your brand built to operate without you?
          </h1>

          <p className="mt-10 max-w-[40rem] text-[16px] leading-7 text-text-secondary">
            Drop in a website and get a sharper read on brand structure, voice,
            consistency, and operational resilience. No account, no setup, just
            a fast DAB* diagnosis.
          </p>

          <form onSubmit={onSubmit} className="mt-20 w-full max-w-[640px]">
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

        <footer className="absolute bottom-0 left-0 right-0 border-t border-border py-4 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
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
      </div>
    </main>
  );
}

function Scanning({
  url,
  error,
  onRetry,
  onBack,
}: {
  url: string;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stageIndex = error
    ? Math.min(2, ANALYSIS_STAGES.length - 1)
    : Math.min(Math.floor(elapsed / 4), ANALYSIS_STAGES.length - 1);

  const activeStage = error ? "Scan interrupted" : ANALYSIS_STAGES[stageIndex];
  const completedStages = ANALYSIS_STAGES.slice(0, stageIndex);

  return (
    <main className="min-h-[calc(100dvh-57px)] pt-24 pb-12">
      <FullWidth>
        <Surface>
          <div className="mx-auto max-w-[920px]">
            <div className="px-6 sm:px-8" style={{ paddingTop: "80px" }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Live analysis
              </p>
              <h1 className="mt-4 max-w-[12ch] text-[clamp(2rem,6vw,3.6rem)] font-semibold leading-[0.96] tracking-[-0.04em]">
                Diagnosing the brand system.
              </h1>
              <p className="mt-4 max-w-[40rem] text-[15px] leading-6 text-text-secondary">
                We are checking the site structure, copy signals, and visual
                patterns. This view stays intentionally calm while the analysis
                runs in the background.
              </p>

              <div className="mt-8 flex flex-col gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    Target
                  </p>
                  <p className="mt-2 text-sm text-text">{url.replace(/^https?:\/\//, "")}</p>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                  {error ? "Needs retry" : `${elapsed}s elapsed`}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  Change URL
                </button>
              </div>
            </div>

            <div
              className="grid gap-x-16 gap-y-12 border-t border-border px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-2"
              style={{ marginTop: "60px" }}
            >
              <div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    Current stage
                  </p>
                  <p className="mt-3 text-lg font-medium text-text">{activeStage}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
                    {error ? "Interrupted" : "Running"}
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  {ANALYSIS_STAGES.map((stage, index) => {
                    const isComplete = index < stageIndex;
                    const isCurrent = index === stageIndex;

                    return (
                      <div key={stage} className="px-1 py-4 transition-colors">
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
                            <p className="text-sm text-text">{stage}</p>
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
                          {isCurrent && !error && (
                            <span className="ml-auto flex gap-1">
                              {[0, 0.15, 0.3].map((delay) => (
                                <span
                                  key={delay}
                                  className="h-1.5 w-1.5 rounded-full bg-text-secondary"
                                  style={{
                                    animation: `pulse 1s ease-in-out infinite ${delay}s`,
                                  }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  Scan notes
                </p>
                {!error && (
                  <>
                    <p className="mt-3 text-lg font-medium text-text">
                      Waiting for the model to finish.
                    </p>
                    <p className="mt-4 max-w-[28rem] text-sm leading-5 text-text-secondary">
                      Large or script-heavy sites can take longer. This screen
                      stays visible briefly before the result appears.
                    </p>
                    <div className="mt-8 grid gap-6">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                          Completed
                        </p>
                        <div className="mt-3 space-y-2">
                          {completedStages.length === 0 && (
                            <p className="text-sm leading-5 text-text-secondary">
                              No completed stages yet.
                            </p>
                          )}
                          {completedStages.map((stage) => (
                            <p key={stage} className="text-sm leading-5 text-text-secondary">
                              {stage}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                          Current focus
                        </p>
                        <p className="mt-3 text-sm leading-5 text-text-secondary">
                          {activeStage}
                        </p>
                      </div>
                    </div>
                  </>
                )}
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
        </Surface>
      </FullWidth>
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
}: {
  result: Result;
  url: string;
  onReset: () => void;
}) {
  const categories = Object.entries(result.categories);
  const summaryTone = scoreTone(result.score);

  return (
    <main className="pt-24 pb-14">
      <FullWidth>
        <section className="w-full max-w-[920px]" style={{ paddingTop: "80px" }}>
          <div className="grid w-full gap-x-16 gap-y-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
            <div className="flex justify-center lg:justify-end">
              <Gauge score={result.score} />
            </div>
            <div>
              <div className="flex min-h-[2.25rem] items-start gap-4">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: scoreColor(result.score) }}
                />
                <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  {result.brandName || new URL(url).hostname} / Verdict
                </p>
              </div>
              <h1 className="mt-5 w-full text-[48px] font-semibold leading-[0.98] tracking-[-0.05em] text-balance">
                {result.verdict}
              </h1>
              <p className="mt-5 w-full max-w-[56rem] text-[15px] leading-5 text-text-secondary">
                This is a {summaryTone.toLowerCase()} operating brand. The
                score blends visual repeatability, voice clarity, structural
                logic, and how independently the brand can keep producing
                coherent output.
              </p>
            </div>
          </div>
        </section>

        <section
          className="grid w-full max-w-[920px] gap-x-20 gap-y-16 lg:grid-cols-2"
          style={{ marginTop: "60px" }}
        >
          <Surface className="p-6 sm:p-8">
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

          <Surface className="p-6 sm:p-8">
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

        <section
          className="grid w-full max-w-[920px] gap-x-20 gap-y-20 lg:grid-cols-2"
          style={{ marginTop: "40px" }}
        >
          <Surface className="p-6 sm:p-8">
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

          <Surface className="p-6 sm:p-8">
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

        <section
          className="w-full max-w-[920px]"
          style={{ marginTop: "40px" }}
        >
          <Surface className="px-12 pt-12 pb-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
              Next step
            </p>
            <h2 className="mt-[22px] text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
              Turn the diagnosis into a more autonomous brand system.
            </h2>
            <p className="mt-8 max-w-[46rem] text-[15px] leading-5 text-text-secondary">
              Use this output as a starting point for system cleanup, clearer
              voice rules, and stronger reusable assets.
            </p>
            <div className="mt-5 flex flex-wrap gap-4">
              <Btn href="https://wearefloc.com" variant="primary">
                Book a call with FLOC*
              </Btn>
              <Btn onClick={onReset} variant="secondary">
                Scan another brand
              </Btn>
            </div>
          </Surface>
        </section>
      </FullWidth>
    </main>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScan = async (targetUrl: string) => {
    const normalized = targetUrl.startsWith("http")
      ? targetUrl
      : `https://${targetUrl}`;
    const startedAt = Date.now();
    const minVisibleMs = 4000;

    setSubmittedUrl(normalized);
    setScanState("loading");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Analysis failed");
      }

      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs < minVisibleMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, minVisibleMs - elapsedMs)
        );
      }

      setResult(data);
      setScanState("success");
    } catch (caughtError) {
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
    setScanState("idle");
    setResult(null);
    setError(null);
    setSubmittedUrl("");
  };

  const handleRetry = () => {
    if (!submittedUrl) return;
    void startScan(submittedUrl);
  };

  return (
    <>
      <Header />
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
          onRetry={handleRetry}
          onBack={handleReset}
        />
      )}
      {scanState === "success" && result && (
        <Results result={result} url={submittedUrl} onReset={handleReset} />
      )}
    </>
  );
}
