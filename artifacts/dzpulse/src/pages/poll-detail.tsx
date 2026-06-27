import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { apiFetch } from "@/lib/api-fetch";
import { usePollLive } from "@/hooks/use-poll-live";
import { Flag, ChevronLeft, Calendar, MapPin, ExternalLink, Bookmark, TrendingUp, BarChart2, Share2, X, Clock, Copy, Check, QrCode, Image as ImageIcon, Loader2, Link as LinkIcon, Hash, Globe } from "lucide-react";
import { ShareMenu } from "@/components/polls/share-menu";
import { AppShell } from "@/components/layout/app-shell";
import { VoteOptions } from "@/components/polls/vote-options";
import { CommentSection } from "@/components/polls/comment-section";
import { PollCard, PollCardSkeleton } from "@/components/polls/poll-card";
import { MarketCard } from "@/components/polls/market-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useGetPollBySlug,
  useGetRelatedPolls,
  useSubmitReport,
  getGetPollBySlugQueryKey,
  getGetRelatedPollsQueryKey,
} from "@workspace/api-client-react";
import { format, formatDistanceToNow } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLang } from "@/lib/language-context";
import { MetaTags } from "@/components/seo/meta-tags";

type DetailTab = "overview" | "discussion" | "timeline" | "breakdown" | "methodology";

export default function PollDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const { lang, t, isRTL } = useLang();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [floatShareDismissed, setFloatShareDismissed] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineRange, setTimelineRange] = useState("7d");
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [breakdownData, setBreakdownData] = useState<any>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  usePollLive(slug);

  useEffect(() => {
    if (activeTab !== "timeline" || !slug) return;
    setTimelineLoading(true);
    const token = localStorage.getItem("dzpulse_token") ?? "";
    apiFetch(`/api/polls/${slug}/timeline?range=${timelineRange}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setTimelineData(d))
      .catch(() => {})
      .finally(() => setTimelineLoading(false));
  }, [activeTab, slug, timelineRange]);

  useEffect(() => {
    if (activeTab !== "breakdown" || !slug) return;
    if (breakdownData) return;
    setBreakdownLoading(true);
    const token = localStorage.getItem("dzpulse_token") ?? "";
    apiFetch(`/api/polls/${slug}/breakdown`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setBreakdownData(d))
      .catch(() => {})
      .finally(() => setBreakdownLoading(false));
  }, [activeTab, slug]);

  const { data: poll, isLoading } = useGetPollBySlug(slug, {
    query: {
      queryKey: [...getGetPollBySlugQueryKey(slug), lang],
      queryFn: async ({ signal }: any) => {
        const token = localStorage.getItem("dzpulse_token") ?? "";
        const anonId = localStorage.getItem("dzpulse_anon_id") ?? "";
        const anonParam = anonId ? `&anonymousId=${encodeURIComponent(anonId)}` : "";
        const r = await apiFetch(`/api/polls/${slug}?lang=${lang}${anonParam}`, {
          signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    }
  });
  // myVoteOptionId is now embedded in the poll response — no separate request needed

  const { data: relatedPolls } = useGetRelatedPolls(slug, {
    query: {
      queryKey: [...getGetRelatedPollsQueryKey(slug), lang],
      queryFn: async ({ signal }: any) => {
        const token = localStorage.getItem("dzpulse_token") ?? "";
        const r = await apiFetch(`/api/polls/${slug}/related?lang=${lang}`, {
          signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) return [];
        return r.json();
      },
    }
  });

  const reportMutation = useSubmitReport();

  const handleReport = () => {
    if (!poll) return;
    reportMutation.mutate(
      { data: { entityType: "poll", entityId: poll.id, reason: "Inappropriate content" } },
      {
        onSuccess: () => toast({ title: t.reportSubmitted, description: t.thankYouFeedback }),
        onError: () => toast({ title: t.couldNotSubmitReport, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!poll) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">{t.pollNotFound}</p>
          <Link href="/polls" data-testid="link-back-to-polls">
            <Button variant="outline" size="sm" className="mt-4">{t.backToPolls}</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: t.overview },
    { id: "discussion", label: `${t.discussion}${poll.commentCount ? ` (${poll.commentCount})` : ""}` },
    { id: "timeline", label: "Timeline" },
    { id: "breakdown", label: "By Wilaya" },
    { id: "methodology", label: t.methodology },
  ];

  const options = poll?.options ?? [];
  const leadingOption = options.length > 0 ? options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, options[0]) : null;
  const leadingPct = leadingOption && poll.totalVotes > 0 ? Math.round((leadingOption.voteCount / poll.totalVotes) * 100) : 0;
  const isCloseRace = leadingPct > 0 && leadingPct < 55;

  const hoursUntilClose = poll?.closesAt
    ? Math.floor((new Date(poll.closesAt).getTime() - Date.now()) / (1000 * 60 * 60))
    : null;
  const isClosingSoon = hoursUntilClose !== null && hoursUntilClose >= 0 && hoursUntilClose < 24;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/polls/${poll?.slug}` : "";
  const shareText = encodeURIComponent(`${poll?.title} — Vote on DzPulse`);
  const waUrl = `https://wa.me/?text=${shareText}%0A${encodeURIComponent(shareUrl)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const liUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${shareText}`;
  const rdUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${shareText}`;

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* fallback */ }
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const handlePhotoDownload = async () => {
    if (!shareCardRef.current || generatingPhoto) return;
    setGeneratingPhoto(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shareCardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const dataUrl = canvas.toDataURL("image/png");
      if (typeof navigator.share === "function") {
        try {
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r));
          if (blob) {
            const file = new File([blob], `dzpulse-${poll?.slug ?? "poll"}.png`, { type: "image/png" });
            await navigator.share({ title: poll?.title, files: [file] });
            return;
          }
        } catch { /* fall through */ }
      }
      const a = document.createElement("a");
      a.download = `dzpulse-${poll?.slug ?? "poll"}.png`;
      a.href = dataUrl;
      a.click();
      toast({ title: "Image saved!", description: "Share it as an Instagram Story or anywhere you like." });
    } catch {
      toast({ title: "Could not generate image", variant: "destructive" });
    } finally {
      setGeneratingPhoto(false);
    }
  };

  return (
    <AppShell>
      {poll && (
        <MetaTags
          title={poll.title}
          description={poll.subtitle ?? `Vote on this poll and see live results. ${poll.totalVotes.toLocaleString()} votes cast so far.`}
          url={`/polls/${poll.slug}`}
          type="article"
          structuredData={{
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": poll.title,
            "description": poll.subtitle ?? `Algerian public opinion poll with ${poll.totalVotes} votes`,
            "url": `https://dzpulse.replit.app/polls/${poll.slug}`,
            "datePublished": poll.createdAt,
            "about": { "@type": "Thing", "name": poll.category?.name ?? "Algeria" },
          }}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground">
          <Link href="/polls" data-testid="link-breadcrumb-polls">
            <span className="cursor-pointer hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronLeft size={12} />
              {t.polls}
            </span>
          </Link>
          <span className="text-border">/</span>
          <Link href={`/polls?category=${poll.category.slug}`}>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
              style={{ color: poll.category.color, backgroundColor: poll.category.color + "15" }}
            >
              {poll.category.name}
            </span>
          </Link>
        </div>

        {/* ── Expiry urgency banner ── */}
        {isClosingSoon && poll.status === "open" && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2.5 text-amber-700 dark:text-amber-400">
            <Clock size={13} className="shrink-0 animate-pulse" />
            <span className="text-xs font-semibold">
              Closing soon — only {hoursUntilClose === 0 ? "less than an hour" : `${hoursUntilClose} hour${hoursUntilClose > 1 ? "s" : ""}`} left to vote!
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-0">
            {/* Title block */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <StatusBadge status={poll.status} />
                {(poll as any).isPrivate && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                    🔒 Private
                  </span>
                )}
                {poll.isTrending && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    <TrendingUp size={10} />
                    {t.trending}
                  </span>
                )}
                {isCloseRace && (
                  <span className="text-xs text-violet-600 dark:text-violet-400 font-medium border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                    {t.close}
                  </span>
                )}
                {poll.regionScope === "national" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={11} />
                    {t.national}
                  </span>
                )}
                {poll.regionScope === "wilaya" && poll.wilayaCode && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={11} />
                    Wilaya {poll.wilayaCode}
                  </span>
                )}
              </div>

              {/* Title + optional cover thumbnail side-by-side */}
              <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
                {poll.imageUrl && (
                  <img
                    src={poll.imageUrl.startsWith("http") ? poll.imageUrl : `/api/storage${poll.imageUrl}`}
                    alt={poll.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-border shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h1 className={`text-xl md:text-2xl font-bold text-foreground leading-snug ${isRTL ? "text-right" : ""}`} data-testid="text-poll-title">
                    {poll.title}
                  </h1>
                  {poll.subtitle && (
                    <p className={`mt-2 text-sm text-muted-foreground ${isRTL ? "text-right" : ""}`}>{poll.subtitle}</p>
                  )}
                </div>
              </div>
              {poll.description && (
                <p className="mt-3 text-sm text-foreground leading-relaxed">{poll.description}</p>
              )}

              {/* Tags */}
              {poll.tags && poll.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  {poll.tags.map((tag) => (
                    <Link key={tag} href={`/polls?tag=${encodeURIComponent(tag)}`}>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs rounded-md cursor-pointer transition-colors">
                        <Hash size={9} />
                        {tag}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-border mb-5">
              <div className="flex gap-0" role="tablist">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`tab-${tab.id}`}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-5">
                {/* Vote section */}
                <div className="border border-border rounded-lg p-5 bg-card" data-testid="section-vote-options">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">{t.voteButton}</h3>
                    <span className="text-xs text-muted-foreground">{t.participants}</span>
                  </div>
                  <VoteOptions
                    poll={poll}
                    myVoteOptionId={(poll as any).myVoteOptionId ?? null}
                  />
                </div>

                {/* Results snapshot */}
                {poll.totalVotes > 0 && (
                  <div className="border border-border rounded-lg p-4 bg-card" data-testid="section-results">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 size={14} className="text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Results snapshot</h3>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Updated {poll.updatedAt ? formatDistanceToNow(new Date(poll.updatedAt), { addSuffix: true }) : "recently"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {[...poll.options]
                        .sort((a, b) => b.voteCount - a.voteCount)
                        .map((option) => {
                          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                          const isLeading = option.id === leadingOption.id;
                          return (
                            <div key={option.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm ${isLeading ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                  {option.label}
                                  {isLeading && <span className="ml-2 text-xs text-primary font-normal">Leading</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{option.voteCount.toLocaleString()}</span>
                                  <span className={`text-sm font-bold ${isLeading ? "text-foreground" : "text-muted-foreground"}`}>{pct}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-[width] duration-400"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: isLeading ? poll.category.color || "hsl(153 60% 25%)" : undefined,
                                    opacity: isLeading ? 1 : 0.4,
                                    background: isLeading ? undefined : "hsl(var(--muted-foreground) / 0.3)",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Tab: Discussion */}
            {activeTab === "discussion" && (
              <div data-testid="section-discussion">
                <CommentSection pollSlug={slug} />
              </div>
            )}

            {/* Tab: Timeline */}
            {activeTab === "timeline" && (
              <div className="flex flex-col gap-5" data-testid="section-timeline">
                <div className="border border-border rounded-lg p-5 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={14} className="text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Opinion shift over time</h3>
                    </div>
                    <div className="flex gap-1">
                      {(["1h","24h","7d","30d","90d"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimelineRange(r)}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${timelineRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {timelineLoading ? (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                      <Loader2 size={16} className="animate-spin mr-2" /> Loading timeline…
                    </div>
                  ) : timelineData && timelineData.buckets && timelineData.buckets.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={timelineData.buckets} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: any) => [`${value}%`]} contentStyle={{ fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {(timelineData.options ?? []).map((opt: any, i: number) => {
                          const COLORS = ["#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#0284c7"];
                          return (
                            <Area
                              key={opt.id}
                              type="monotone"
                              dataKey={String(opt.id)}
                              name={opt.label}
                              stroke={COLORS[i % COLORS.length]}
                              fill={COLORS[i % COLORS.length]}
                              fillOpacity={0.08}
                              strokeWidth={2}
                              dot={false}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                      {timelineData?.hasRealData === false
                        ? "No votes recorded yet — chart will appear once voting begins."
                        : "No timeline data available for this range."}
                    </div>
                  )}
                  {!timelineLoading && timelineData && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Shows cumulative vote-share percentage at each time point. Lines starting at 50/50 indicate the chart precedes actual votes.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: By Wilaya */}
            {activeTab === "breakdown" && (
              <div className="flex flex-col gap-5" data-testid="section-breakdown">
                <div className="border border-border rounded-lg p-5 bg-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={14} className="text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Results by Wilaya</h3>
                  </div>
                  {breakdownLoading ? (
                    <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                      <Loader2 size={16} className="animate-spin mr-2" /> Loading breakdown…
                    </div>
                  ) : breakdownData && breakdownData.breakdown && breakdownData.breakdown.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {breakdownData.breakdown.map((row: any) => {
                        const leading = [...row.options].sort((a: any, b: any) => b.count - a.count)[0];
                        return (
                          <div key={row.wilaya} className="border border-border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <MapPin size={10} className="text-muted-foreground" />
                                Wilaya {row.wilaya}
                              </span>
                              <span className="text-xs text-muted-foreground">{row.total} vote{row.total !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {row.options.map((opt: any) => (
                                <div key={opt.optionId}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-xs ${opt.optionId === leading?.optionId ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
                                    <span className="text-xs font-medium">{opt.pct}%</span>
                                  </div>
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-[width] duration-400"
                                      style={{
                                        width: `${opt.pct}%`,
                                        backgroundColor: opt.optionId === leading?.optionId ? (poll.category.color || "hsl(153 60% 25%)") : "hsl(var(--muted-foreground) / 0.3)",
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
                      <Globe size={24} className="opacity-30" />
                      <p>No wilaya-level data yet.</p>
                      <p className="text-center max-w-xs">Breakdown appears once registered users with a wilaya set in their profile vote on this poll.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Methodology */}
            {activeTab === "methodology" && (
              <div className="flex flex-col gap-5" data-testid="section-methodology">
                <div className="border border-border rounded-lg p-5 bg-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4">About this poll</h3>

                  {poll.editorialNote && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Editorial Note</p>
                      <p className="text-sm text-foreground leading-relaxed">{poll.editorialNote}</p>
                    </div>
                  )}

                  {poll.methodologyNote ? (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Methodology</p>
                      <p className="text-sm text-foreground leading-relaxed">{poll.methodologyNote}</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Methodology</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        This poll is open to all registered DzPulse users. One vote is permitted per account. Results are displayed in real time and are not weighted or adjusted. This is a self-selected sample and does not constitute a scientific survey.
                      </p>
                    </div>
                  )}

                  {poll.sourceLinks && poll.sourceLinks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sources</p>
                      <div className="flex flex-col gap-1.5">
                        {poll.sourceLinks.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1.5"
                          >
                            <ExternalLink size={11} />
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Standard trust note */}
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    DzPulse polls are developed and reviewed by our editorial team. We follow a set of{" "}
                    <Link href="/methodology"><span className="text-primary cursor-pointer hover:underline">editorial standards</span></Link>{" "}
                    designed to ensure questions are fair, civic, and non-partisan. All results are publicly visible. Participation is voluntary and anonymous.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Poll meta */}
            <div className="border border-border rounded-lg p-4 bg-card" data-testid="section-poll-meta">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Details</h3>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <StatusBadge status={poll.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Scope</span>
                  <span className="font-medium text-foreground text-xs capitalize flex items-center gap-1">
                    <MapPin size={11} />
                    {poll.regionScope === "wilaya" && poll.wilayaCode ? `Wilaya ${poll.wilayaCode}` : "National"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Type</span>
                  <span className="text-foreground text-xs capitalize">{poll.pollType.replace("_", " ")}</span>
                </div>
                {poll.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Published</span>
                    <span className="text-foreground text-xs">{format(new Date(poll.createdAt), "MMM d, yyyy")}</span>
                  </div>
                )}
                {poll.closesAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Closes</span>
                    <span className="text-foreground text-xs">{format(new Date(poll.closesAt), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <ShareMenu
                    slug={poll.slug}
                    title={poll.title}
                    totalVotes={poll.totalVotes}
                    triggerClassName="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    triggerLabel="Share"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleReport} className="gap-1.5 text-xs text-muted-foreground hover:text-destructive" data-testid="button-report">
                  <Flag size={12} />
                  Report
                </Button>
              </div>
              <div className="flex gap-2">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#25D366]/30 bg-[#25D366]/8 text-[#25D366] hover:bg-[#25D366]/15 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 0C5.373 0 0 5.373 0 11.999c0 2.122.556 4.112 1.528 5.837L0 24l6.335-1.507A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.822 9.822 0 0 1-5.012-1.373l-.36-.214-3.728.887.916-3.618-.235-.372A9.819 9.819 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
                  WhatsApp
                </a>
                <a
                  href={tgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#2AABEE]/30 bg-[#2AABEE]/8 text-[#2AABEE] hover:bg-[#2AABEE]/15 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>
                  Telegram
                </a>
              </div>
            </div>

            {/* Integrity note */}
            <div className="border border-border rounded-lg p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Results are live and transparent. One vote per verified account. Anonymous participation guaranteed.
              </p>
            </div>

            {/* Link to methodology */}
            <Link href="/methodology">
              <div className="border border-border rounded-md p-3 hover:bg-muted/40 cursor-pointer transition-all">
                <p className="text-xs font-medium text-foreground">About our methodology</p>
                <p className="text-xs text-muted-foreground mt-0.5">How DzPulse selects and reviews polls</p>
              </div>
            </Link>

            {/* Related Polls */}
            {relatedPolls && relatedPolls.length > 0 && (
              <div data-testid="section-related-polls">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Related Polls</h3>
                <div className="flex flex-col gap-3">
                  {relatedPolls.slice(0, 4).map((related) => (
                    <MarketCard key={related.id} poll={related as any} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating mobile share sheet ── */}
      {!floatShareDismissed && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          {shareSheetOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-[-1]"
              onClick={() => { setShareSheetOpen(false); setShowQr(false); }}
            />
          )}

          {!shareSheetOpen ? (
            /* Collapsed trigger pill */
            <div className="m-3 flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-3 py-2.5">
              <Share2 size={13} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1 truncate min-w-0">{poll?.title ?? "Share this poll"}</span>
              <button
                onClick={() => setShareSheetOpen(true)}
                className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
              >
                Share
              </button>
              <button onClick={() => setFloatShareDismissed(true)} className="p-1 rounded-full hover:bg-muted text-muted-foreground shrink-0">
                <X size={12} />
              </button>
            </div>
          ) : (
            /* Expanded share sheet */
            <div className="m-3 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Share this poll</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[230px]">{poll?.title}</p>
                </div>
                <button onClick={() => { setShareSheetOpen(false); setShowQr(false); }} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground shrink-0 ml-2">
                  <X size={14} />
                </button>
              </div>

              {/* Social grid */}
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Share on</p>
                <div className="grid grid-cols-4 gap-y-4 gap-x-1">
                  {([
                    { label: "WhatsApp", bg: "#25D366", href: waUrl, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.556 4.112 1.528 5.837L0 24l6.335-1.507A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 0 1-5.012-1.373l-.36-.214-3.728.887.916-3.618-.235-.372A9.82 9.82 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg> },
                    { label: "Telegram", bg: "#2AABEE", href: tgUrl, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg> },
                    { label: "X / Twitter", bg: "#000000", href: xUrl, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                    { label: "Facebook", bg: "#1877F2", href: fbUrl, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg> },
                    { label: "LinkedIn", bg: "#0A66C2", href: liUrl, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                    { label: "Reddit", bg: "#FF4500", href: rdUrl, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg> },
                    { label: "Instagram Story", bg: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", onClick: handlePhotoDownload, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
                    { label: copyDone ? "Copied!" : "Copy Link", bg: "hsl(var(--muted))", onClick: handleCopyLink, icon: copyDone ? <Check size={20} className="text-green-600" /> : <LinkIcon size={20} className="text-foreground" /> },
                  ] as Array<{ label: string; bg: string; href?: string; onClick?: () => void; icon: React.ReactNode }>).map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-1.5">
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
                          style={{ background: item.bg }}
                        >
                          {item.icon}
                        </a>
                      ) : (
                        <button
                          onClick={item.onClick}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 active:scale-95 transition-transform"
                          style={{ background: item.bg }}
                        >
                          {item.icon}
                        </button>
                      )}
                      <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-border my-3" />

              {/* Utility row */}
              <div className="px-4 pb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">More options</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handlePhotoDownload}
                    disabled={generatingPhoto}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/60 hover:bg-muted active:scale-95 transition-all"
                  >
                    {generatingPhoto ? <Loader2 size={20} className="animate-spin text-muted-foreground" /> : <ImageIcon size={20} className="text-foreground" />}
                    <span className="text-[10px] text-muted-foreground">Save photo</span>
                  </button>
                  <button
                    onClick={() => setShowQr((q) => !q)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95 ${showQr ? "bg-primary/10 text-primary" : "bg-muted/60 hover:bg-muted"}`}
                  >
                    <QrCode size={20} className={showQr ? "text-primary" : "text-foreground"} />
                    <span className="text-[10px] text-muted-foreground">QR Code</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/60 hover:bg-muted active:scale-95 transition-all"
                  >
                    {copyDone ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-foreground" />}
                    <span className="text-[10px] text-muted-foreground">{copyDone ? "Copied!" : "Copy link"}</span>
                  </button>
                </div>

                {/* QR code reveal */}
                {showQr && (
                  <div className="mt-3 flex flex-col items-center gap-2 bg-white rounded-xl p-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=0a3d21&margin=10`}
                      alt="QR Code"
                      className="w-36 h-36 rounded-lg"
                    />
                    <p className="text-[10px] text-gray-500 text-center">Scan to vote on this poll</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden share card for html2canvas photo export */}
      {poll && (
        <div
          ref={shareCardRef}
          aria-hidden
          style={{
            position: "absolute",
            top: "-9999px",
            left: "-9999px",
            width: "1080px",
            height: "1080px",
            background: "linear-gradient(135deg, #0a3d21 0%, #1a5c34 55%, #0a3d21 100%)",
            padding: "80px",
            display: "flex",
            flexDirection: "column",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "40px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: "18px", fontWeight: "800" }}>DZ</span>
            </div>
            <span style={{ color: "#86efac", fontSize: "26px", fontWeight: "700", letterSpacing: "0.05em" }}>DzPulse</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "22px", margin: "0 0 16px 0" }}>Algeria is voting on:</p>
          <h2 style={{ color: "white", fontSize: "52px", fontWeight: "800", lineHeight: "1.25", margin: "0 0 60px 0", maxWidth: "900px" }}>
            {poll.title.length > 100 ? poll.title.slice(0, 100) + "…" : poll.title}
          </h2>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", justifyContent: "flex-end" }}>
            {poll.options.slice(0, 4).map((opt: any) => {
              const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
              return (
                <div key={opt.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "22px" }}>{opt.label}</span>
                    <span style={{ color: "white", fontSize: "26px", fontWeight: "800" }}>{pct}%</span>
                  </div>
                  <div style={{ height: "10px", background: "rgba(255,255,255,0.12)", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "rgba(255,255,255,0.5)", borderRadius: "6px" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "30px", marginTop: "50px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "18px" }}>{poll.totalVotes.toLocaleString()} votes cast</span>
            <span style={{ color: "#86efac", fontSize: "18px", fontWeight: "600" }}>dzpulse.dz/polls/{poll.slug}</span>
          </div>
        </div>
      )}
    </AppShell>
  );
}
