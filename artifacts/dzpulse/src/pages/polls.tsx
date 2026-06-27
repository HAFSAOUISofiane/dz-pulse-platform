import { useState, useDeferredValue, useEffect } from "react";
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { WILAYAS } from "@/lib/wilayas";
import { AppShell } from "@/components/layout/app-shell";
import { MarketCard, MarketCardSkeleton } from "@/components/polls/market-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListPolls,
  useListCategories,
  getListPollsQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useLang } from "@/lib/language-context";
import { usePlatformMode } from "@/lib/platform-mode-context";
import { MetaTags } from "@/components/seo/meta-tags";

type PollStatus = "open" | "closed" | "all";
type PollSort = "trending" | "latest" | "most_voted" | "controversial";

const PAGE_SIZE = 20;

export default function PollsPage() {
  const { lang, t } = useLang();
  const { mode } = usePlatformMode();

  const SORT_LABELS: Record<PollSort, string> = {
    trending: t.mostActive,
    latest: t.newest,
    most_voted: t.mostVoted,
    controversial: t.closestSplit,
  };

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialCategory = urlParams.get("category") ?? "all";
  const initialSearch = urlParams.get("search") ?? "";
  const initialTag = urlParams.get("tag") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStatus, setSelectedStatus] = useState<PollStatus>("open");
  const [selectedSort, setSelectedSort] = useState<PollSort>("trending");
  const [region, setRegion] = useState<string>("all");
  const [activeTag, setActiveTag] = useState<string>(initialTag);
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, selectedCategory, selectedStatus, selectedSort, region, mode, activeTag]);

  const pollParams = {
    ...(deferredSearch ? { search: deferredSearch } : {}),
    ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
    ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
    ...(region !== "all" ? { wilaya: region } : {}),
    ...(mode !== "all" ? { pollMode: mode } : {}),
    ...(activeTag ? { tag: activeTag } : {}),
    sort: selectedSort,
    page,
    limit: PAGE_SIZE,
    lang,
  } as any;

  const { data, isLoading } = useListPolls(pollParams, {
    query: { queryKey: getListPollsQueryKey(pollParams), refetchInterval: 60_000 },
  });

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  const polls = data?.polls ?? [];
  const total = data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? 1;

  const summaryParts: string[] = [];
  if (selectedStatus !== "all") summaryParts.push(selectedStatus === "open" ? t.live : t.closed);
  summaryParts.push(`${t.polls} · ${SORT_LABELS[selectedSort].toLowerCase()}`);
  if (selectedCategory !== "all") {
    const cat = categories?.find(c => c.slug === selectedCategory);
    if (cat) summaryParts.unshift(cat.name);
  }

  return (
    <AppShell>
      <MetaTags
        title="Explore Polls"
        description="Browse and vote on live public opinion polls about Algeria — politics, economy, health, sports, and more. Results update in real time."
        url="/polls"
      />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground" data-testid="heading-polls">{t.explorePolls}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.platformDesc}</p>
        </div>

        {/* Tag filter banner */}
        {activeTag && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
            <span className="text-muted-foreground">Filtering by tag:</span>
            <span className="font-semibold text-primary">#{activeTag}</span>
            <button onClick={() => setActiveTag("")} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchPolls}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-9 h-10"
            data-testid="input-search"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category filter chips (horizontal scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4 border-b border-border">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedCategory === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
            data-testid="chip-all"
          >
            {t.allTopics}
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.slug ? "all" : cat.slug)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedCategory === cat.slug
                  ? "border-transparent text-white"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
              style={
                selectedCategory === cat.slug
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {}
              }
              data-testid={`chip-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <SlidersHorizontal size={13} className="text-muted-foreground" />
          <Select value={selectedStatus} onValueChange={v => setSelectedStatus(v as PollStatus)}>
            <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t.live}</SelectItem>
              <SelectItem value="closed">{t.closed}</SelectItem>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSort} onValueChange={v => setSelectedSort(v as PollSort)}>
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as PollSort[]).map(s => (
                <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-region">
              <SelectValue placeholder={t.national} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t.national}</SelectItem>
              <SelectItem value="national">{t.allRegions}</SelectItem>
              {WILAYAS.map(w => (
                <SelectItem key={w.code} value={w.name}>{w.code}. {w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedCategory !== "all" || search || selectedStatus !== "open") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-muted-foreground"
              onClick={() => { setSelectedCategory("all"); setSearch(""); setSelectedStatus("open"); setRegion("all"); }}
              data-testid="button-clear-filters"
            >
              <X size={12} />
              Clear
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground" data-testid="text-poll-count">
            {isLoading ? "Loading..." : `${total} polls`}
          </span>
        </div>

        {/* Smart summary line */}
        {!isLoading && polls.length > 0 && (
          <p className="text-xs text-muted-foreground mb-4" data-testid="text-summary">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} {summaryParts.join(" ")}.
          </p>
        )}

        {/* Poll grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-polls">
          {isLoading
            ? [1,2,3,4,5,6,7,8].map(i => <MarketCardSkeleton key={i} />)
            : polls.map(poll => <MarketCard key={poll.id} poll={poll} />)
          }
        </div>

        {!isLoading && polls.length === 0 && (
          <div className="text-center py-20 text-muted-foreground" data-testid="text-no-polls">
            <p className="text-sm font-medium">{t.noPollsFound}</p>
            <p className="text-xs mt-1">{t.tryDifferentFilters}</p>
            <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setSelectedCategory("all"); setSearch(""); }}>
              {t.filter}
            </Button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </Button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-8 min-w-[2rem] px-2 rounded text-xs font-medium transition-colors ${
                    pageNum === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
