import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, Users, Zap, ExternalLink, Flame, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Poll } from "@workspace/api-client-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
}

const COLORS = [
  "#2563eb", "#ea580c", "#16a34a", "#9333ea", "#e11d48", "#0891b2", "#ca8a04"
];

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

type TimeRange = "1h" | "24h" | "7d" | "30d" | "90d";

const RANGE_LABELS: { key: TimeRange; label: string }[] = [
  { key: "1h",  label: "1H" },
  { key: "24h", label: "24H" },
  { key: "7d",  label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
];

interface TimelineBucket {
  label: string;
  ts: number;
  [optionId: number]: number | string;
}

interface TimelineData {
  buckets: TimelineBucket[];
  options: { id: number; label: string; voteCount: number }[];
  hasRealData: boolean;
}

// Synthetic fallback: deterministic noise-based interpolation from equal-split to current distribution
function generateSyntheticTimeline(poll: Poll, range: TimeRange): TimelineBucket[] {
  const opts = poll.options.slice(0, 5);
  if (!opts.length) return [];

  const points = { "1h": 12, "24h": 24, "7d": 7, "30d": 30, "90d": 13 }[range] ?? 7;
  const total = poll.totalVotes || 0;
  const finalPcts = opts.map(o => total > 0 ? (o.voteCount / total) * 100 : 100 / opts.length);
  const startPcts = opts.map(() => 100 / opts.length);
  const seed = poll.id * 1234567;
  const rng = (i: number, j: number) => {
    const x = Math.sin(seed + i * 997 + j * 113) * 10000;
    return x - Math.floor(x);
  };

  const now = Date.now();
  const windowMs: Record<TimeRange, number> = {
    "1h":  3600000, "24h": 86400000, "7d":  604800000, "30d": 2592000000, "90d": 7776000000,
  };
  const wMs = windowMs[range];

  return Array.from({ length: points }, (_, i): TimelineBucket => {
    const progress = i / (points - 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    const ts = now - wMs + (wMs / (points - 1)) * i;
    const bucket: TimelineBucket = { label: String(i), ts };
    opts.forEach((opt, j) => {
      const noise = (rng(i, j) - 0.5) * 8 * (1 - eased);
      bucket[opt.id] = +(Math.max(2, Math.min(95, startPcts[j] + (finalPcts[j] - startPcts[j]) * eased + noise)).toFixed(1));
    });
    return bucket;
  });
}

// Format synthetic labels for range
function syntheticLabel(idx: number, total: number, range: TimeRange): string {
  const now = new Date();
  const windowMs: Record<TimeRange, number> = {
    "1h": 3600000, "24h": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000,
  };
  const ts = new Date(Date.now() - windowMs[range] + (windowMs[range] / (total - 1)) * idx);
  if (range === "1h")  return `${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`;
  if (range === "24h") return `${String(ts.getHours()).padStart(2,"0")}h`;
  if (range === "7d" || range === "30d") return ts.toLocaleDateString("en-DZ", { month: "short", day: "numeric" });
  return `W${Math.ceil(ts.getDate() / 7)} ${ts.toLocaleDateString("en-DZ", { month: "short" })}`;
}

interface Props {
  polls: Poll[];
  loading: boolean;
  categories?: Category[];
  onVote?: (pollId: number, optionId: number) => void;
}

export function TrendingPollHero({ polls, loading, categories = [], onVote }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [range, setRange] = useState<TimeRange>("7d");
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const poll = polls[activeIdx];

  const fetchTimeline = useCallback(async (slug: string, r: TimeRange) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/polls/${slug}/timeline?range=${r}`, { signal: ctrl.signal });
      if (res.ok) {
        const data: TimelineData = await res.json();
        setTimeline(data);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setTimeline(null);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!poll?.slug) return;
    setTimeline(null);
    fetchTimeline(poll.slug, range);
  }, [poll?.slug, range]);

  // Build chart data: use real data if available, synthetic fallback otherwise
  const chartData = (() => {
    if (!poll) return [];
    const opts = poll.options.slice(0, 5);

    if (timeline?.hasRealData && timeline.buckets.length > 0) {
      return timeline.buckets.map(b => {
        const point: Record<string, any> = { label: b.label, ts: b.ts };
        for (const opt of opts) point[opt.id] = b[opt.id];
        return point;
      });
    }

    // Synthetic fallback
    const raw = generateSyntheticTimeline(poll, range);
    return raw.map((b, i) => ({
      ...b,
      label: syntheticLabel(i, raw.length, range),
    }));
  })();

  const leadingOption = poll?.options?.length
    ? poll.options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, poll.options[0])
    : undefined;
  const leadingPct = poll && poll.totalVotes > 0 && leadingOption
    ? Math.round((leadingOption.voteCount / poll.totalVotes) * 100)
    : 0;

  if (loading) return <HeroSkeleton />;
  if (!polls.length || !poll) return null;

  const isRealData = !!timeline?.hasRealData;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* ── Left: Featured trending poll ── */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        {/* Poll header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {poll?.category && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    color: poll.category.color,
                    backgroundColor: poll.category.color + "15",
                    borderColor: poll.category.color + "30",
                  }}
                >
                  {poll.category.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Zap size={10} />
                Trending
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live
              </span>
            </div>
            <Link href={`/polls/${poll?.slug}`}>
              <h2 className="text-lg font-bold text-foreground leading-snug hover:text-primary transition-colors cursor-pointer line-clamp-2">
                {poll?.title}
              </h2>
            </Link>
            {poll?.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{poll.subtitle}</p>
            )}
          </div>
          <Link href={`/polls/${poll?.slug}`}>
            <ExternalLink size={15} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 mt-1" />
          </Link>
        </div>

        {/* Content grid: options + chart */}
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* Option list */}
          <div className="p-5 flex flex-col gap-2.5">
            {poll?.options.slice(0, 5).map((opt, i) => {
              const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
              const isLeading = opt.id === leadingOption?.id;
              return (
                <div key={opt.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-sm text-[10px] font-bold flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: COLORS[i] }}>
                        {OPTION_LABELS[i]}
                      </span>
                      <span className="text-xs text-foreground truncate font-medium">{opt.label}</span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${isLeading ? "text-foreground" : "text-muted-foreground"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i] }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <Users size={11} />
              <span className="font-medium text-foreground">{poll?.totalVotes.toLocaleString()}</span>
              <span>total votes</span>
            </div>
          </div>

          {/* Chart */}
          <div className="p-4 flex flex-col gap-2">
            {/* Chart header + range selector */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp size={12} className={isRealData ? "text-primary" : "text-muted-foreground"} />
                <span>
                  Opinion timeline
                  {isRealData
                    ? <span className="ml-1 text-primary font-medium">· live data</span>
                    : <span className="ml-1 text-muted-foreground/60 italic">· simulated</span>
                  }
                </span>
                {timelineLoading && <RefreshCw size={10} className="animate-spin text-muted-foreground" />}
              </div>

              {/* Range pills */}
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                {RANGE_LABELS.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                      range === r.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart area */}
            <div className="h-[148px]">
              {timelineLoading && !chartData.length ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      {poll?.options.slice(0, 5).map((opt, i) => (
                        <linearGradient key={opt.id} id={`grad-${opt.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${Math.round(v)}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        background: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number, name: string) => {
                        const opt = poll?.options.find(o => String(o.id) === name);
                        return [`${typeof value === "number" ? value.toFixed(1) : value}%`, opt?.label ?? name];
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}
                    />
                    {poll?.options.slice(0, 5).map((opt, i) => (
                      <Area
                        key={opt.id}
                        type="monotone"
                        dataKey={String(opt.id)}
                        stroke={COLORS[i]}
                        strokeWidth={2}
                        fill={`url(#grad-${opt.id})`}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
              {poll?.options.slice(0, 5).map((opt, i) => {
                const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
                return (
                  <span key={opt.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    {opt.label} {pct}%
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* View poll CTA */}
        <div className="border-t border-border px-5 py-3 bg-muted/20 flex items-center justify-between">
          <Link href={`/polls/${poll?.slug}`}>
            <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium">
              <ExternalLink size={11} />
              View full results and discussion
            </span>
          </Link>
        </div>

        {/* Pagination dots + nav */}
        {polls.length > 1 && (
          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
            >
              <ChevronLeft size={14} />
              Prev
            </Button>
            <div className="flex items-center gap-1.5">
              {polls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`transition-all rounded-full ${i === activeIdx ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActiveIdx(i => Math.min(polls.length - 1, i + 1))}
              disabled={activeIdx === polls.length - 1}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: Hot Topics sidebar ── */}
      <div className="flex flex-col gap-4">
        <div className="border border-border rounded-xl bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Flame size={14} className="text-orange-500" />
              Hot Topics
            </h3>
            <Link href="/topics">
              <span className="text-xs text-primary hover:underline cursor-pointer">All topics</span>
            </Link>
          </div>
          <div className="flex flex-col gap-0.5">
            {categories.slice(0, 6).map((cat, idx) => (
              <Link key={cat.id} href={`/polls?category=${cat.slug}`}>
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                  <span className="text-sm font-bold text-muted-foreground/40 w-4 tabular-nums text-center shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{cat.name}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live polls count */}
        <div className="border border-border rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">About DzPulse</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Algeria's public opinion intelligence platform. Vote once, anonymously. Results are live and transparent.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <Link href="/methodology">
              <span className="text-xs text-primary hover:underline cursor-pointer block">How it works</span>
            </Link>
            <Link href="/submit">
              <span className="text-xs text-primary hover:underline cursor-pointer block">Suggest a poll</span>
            </Link>
            <Link href="/about">
              <span className="text-xs text-primary hover:underline cursor-pointer block">About us</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-6 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] p-5 gap-5">
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
