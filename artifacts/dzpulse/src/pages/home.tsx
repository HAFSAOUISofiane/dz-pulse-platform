import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Shield, CheckCircle, Globe, BarChart2, Zap, Users, Flame, Clock } from "lucide-react";
import { PollOfTheDay } from "@/components/home/poll-of-the-day";
import { getStreak } from "@/hooks/use-streak";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { MarketCard, MarketCardSkeleton } from "@/components/polls/market-card";
import { TrendingPollHero } from "@/components/home/trending-poll-hero";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/language-context";
import { usePlatformMode } from "@/lib/platform-mode-context";
import { MetaTags } from "@/components/seo/meta-tags";
import {
  useListPolls,
  useListCategories,
  useGetTrendingPolls,
  useGetAnalyticsSummary,
  getListPollsQueryKey,
  getListCategoriesQueryKey,
  getGetTrendingPollsQueryKey,
  getGetAnalyticsSummaryQueryKey,
} from "@workspace/api-client-react";

export default function HomePage() {
  const { t } = useLang();
  const { mode } = usePlatformMode();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(getStreak());
  }, []);

  const TRUST_STRIP = [
    { icon: <Shield size={13} />, label: t.oneVoteFair },
    { icon: <CheckCircle size={13} />, label: "Editorially reviewed" },
    { icon: <Globe size={13} />, label: "Algeria-focused" },
    { icon: <BarChart2 size={13} />, label: "Transparent methodology" },
  ];

  const { data: trendingPolls, isLoading: loadingTrending } = useGetTrendingPolls(
    { limit: 5 },
    { query: { queryKey: getGetTrendingPollsQueryKey({ limit: 5 }), refetchInterval: 60_000 } }
  );

  const latestParams = {
    sort: "latest" as const, status: "open" as const, limit: 8,
    ...(mode !== "all" ? { pollMode: mode } : {}),
  };
  const { data: latestPolls, isLoading: loadingLatest } = useListPolls(
    latestParams as any,
    { query: { queryKey: getListPollsQueryKey(latestParams as any), refetchInterval: 60_000 } }
  );

  const trendingParams = {
    sort: "trending" as const, status: "open" as const, limit: 12,
    ...(mode !== "all" ? { pollMode: mode } : {}),
  };
  const { data: allPolls, isLoading: loadingAll } = useListPolls(
    trendingParams as any,
    { query: { queryKey: getListPollsQueryKey(trendingParams as any), refetchInterval: 60_000 } }
  );

  const upcomingParams = { sort: "latest" as const, status: "upcoming" as const, limit: 4 };
  const { data: upcomingPolls } = useListPolls(
    upcomingParams as any,
    { query: { queryKey: getListPollsQueryKey(upcomingParams as any) } }
  );

  const { data: categories, isLoading: loadingCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const { data: summary } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  return (
    <AppShell>
      <MetaTags
        url="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "DzPulse — Algeria's Civic Pulse",
          "description": "Algeria's live civic polling platform. Vote anonymously on politics, economy, health, and society.",
          "url": "https://dzpulse.replit.app/",
          "breadcrumb": { "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dzpulse.replit.app/" }] },
        }}
      />
      {/* ── Compact hero strip ── */}
      <div className="border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t.liveInAlgeria}
            </span>
            {summary && (
              <>
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{summary.totalVotes.toLocaleString()}</span> {t.votesCast}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  <span className="font-semibold text-foreground">{summary.openPolls}</span> {t.livePolls}
                </span>
                {streak > 0 && (
                  <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Flame size={11} className="fill-amber-500 text-amber-500" />
                    {streak}-day streak
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/submit">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                {t.submitaPoll} <ArrowRight size={11} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trending poll hero with chart ── */}
      <TrendingPollHero polls={allPolls?.polls ?? []} loading={loadingAll} categories={categories ?? []} />

      {/* ── Trust strip ── */}
      <div className="border-t border-b border-border bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
            {TRUST_STRIP.map((item) => (
              <div key={item.label} className="flex items-center gap-2 shrink-0">
                <span className="text-primary">{item.icon}</span>
                <p className="text-xs font-medium text-foreground whitespace-nowrap">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Poll of the Day ── */}
      <PollOfTheDay poll={allPolls?.polls?.[0]} loading={loadingAll} />

      {/* ── All Polls (market cards) ── */}
      <div className="max-w-7xl mx-auto px-4 py-6" data-testid="section-all-polls">
        {/* Horizontal category filter */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4 border-b border-border">
          <Link href="/polls">
            <button className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-primary bg-primary text-primary-foreground transition-all">
              {t.allTopics}
            </button>
          </Link>
          {loadingCategories ? (
            [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full shrink-0" />)
          ) : (
            categories?.map(cat => (
              <Link key={cat.id} href={`/polls?category=${cat.slug}`}>
                <button
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  style={{ "--cat-color": cat.color } as any}
                >
                  {cat.name}
                </button>
              </Link>
            ))
          )}
          <Link href="/polls">
            <span className="shrink-0 text-xs text-primary hover:underline cursor-pointer whitespace-nowrap ml-2">
              {t.allPolls} <ArrowRight size={10} className="inline" />
            </span>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t.trendingNow}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t.voteDirectly}</p>
          </div>
          <Link href="/polls?sort=trending">
            <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
              {t.allPolls} <ArrowRight size={11} />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loadingAll
            ? [1,2,3,4,5,6,7,8].map(i => <MarketCardSkeleton key={i} />)
            : allPolls?.polls?.map(poll => <MarketCard key={poll.id} poll={poll} />)
          }
        </div>
      </div>

      {/* ── Most Active sidebar + Topics ── */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Most voted */}
          <div className="md:col-span-2" data-testid="section-trending">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">{t.mostActive}</h2>
              </div>
              <Link href="/polls?sort=most_voted">
                <span className="text-xs text-primary hover:underline cursor-pointer">{t.seeAll}</span>
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {loadingLatest
                ? [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)
                : latestPolls?.polls?.map((poll, idx) => {
                  const leadingOpt = poll.options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, poll.options[0]);
                  const pct = poll.totalVotes > 0 ? Math.round((leadingOpt?.voteCount / poll.totalVotes) * 100) : 0;
                  return (
                    <Link key={poll.id} href={`/polls/${poll.slug}`} data-testid={`link-trending-${poll.id}`}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:border-primary/30 hover:bg-muted/40 cursor-pointer transition-all">
                        <span className="text-lg font-bold text-muted-foreground/25 w-6 shrink-0 tabular-nums text-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate leading-snug">{poll.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users size={10} />
                              {poll.totalVotes.toLocaleString()} {t.votes}
                            </span>
                            {leadingOpt && poll.totalVotes > 0 && (
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {t.leading} {leadingOpt.label} <strong>{pct}%</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full hidden sm:block"
                            style={{ color: poll.category.color, backgroundColor: poll.category.color + "15" }}
                          >
                            {poll.category.name}
                          </span>
                          <StatusBadge status={poll.status} />
                        </div>
                      </div>
                    </Link>
                  );
                })
              }
            </div>
          </div>

          {/* Topics */}
          <div data-testid="section-categories">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">{t.topics}</h2>
              <Link href="/topics">
                <span className="text-xs text-primary hover:underline cursor-pointer">{t.allTopics}</span>
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {loadingCategories
                ? [1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)
                : categories?.map(cat => (
                  <Link key={cat.id} href={`/polls?category=${cat.slug}`} data-testid={`link-category-${cat.slug}`}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-md border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-all">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-foreground">{cat.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{cat.pollCount}</span>
                    </div>
                  </Link>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming polls ── */}
      {upcomingPolls && upcomingPolls.polls && upcomingPolls.polls.length > 0 && (
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                <h2 className="text-base font-semibold text-foreground">Coming Soon</h2>
                <span className="text-xs text-muted-foreground">— polls opening soon</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {upcomingPolls.polls.map((poll) => (
                <div key={poll.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-border bg-muted/20">
                  <Clock size={13} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{poll.title}</p>
                    {(poll as any).opensAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Opens {new Date((poll as any).opensAt).toLocaleDateString("en-DZ", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: poll.category.color, backgroundColor: poll.category.color + "15" }}
                  >
                    {poll.category.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CTA Banner ── */}
      <div className="border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t.haveAQuestion}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.submitPollCTA}</p>
          </div>
          <Link href="/submit">
            <Button variant="outline" className="gap-2 shrink-0">
              {t.submitaPoll}
              <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
