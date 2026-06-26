import { Link } from "wouter";
import { ArrowRight, BarChart2, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/language-context";
import { usePlatformMode } from "@/lib/platform-mode-context";
import { MetaTags } from "@/components/seo/meta-tags";
import { useListCategories, useListPolls, getListCategoriesQueryKey, getListPollsQueryKey } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/status-badge";

const ISSUE_CLUSTERS = [
  {
    slug: "youth",
    title: "Youth & Employment",
    description: "Algeria's youth unemployment stands among the highest in the MENA region. Polls in this cluster track sentiment on education-to-work transition, entrepreneurship, and the 'brain drain' concern.",
    color: "#7c3aed",
    tags: ["Employment", "Startup", "Education", "Chômage"],
  },
  {
    slug: "environment",
    title: "Energy & Environment",
    description: "With global pressure to decarbonise and Algeria's dependence on hydrocarbon revenues, this cluster explores attitudes toward renewable investment, energy policy, and climate concerns.",
    color: "#059669",
    tags: ["Renewables", "Hydrocarbons", "Climate", "Énergie"],
  },
  {
    slug: "economy",
    title: "Economic Policy",
    description: "Questions tracking public views on wages, inflation, import/export policy, public spending, and industrial development strategies.",
    color: "#d97706",
    tags: ["Wages", "Inflation", "Industry", "Économie"],
  },
  {
    slug: "politics",
    title: "Governance & Politics",
    description: "Questions on institutional trust, civic participation, electoral attitudes, and Algeria's political evolution.",
    color: "#dc2626",
    tags: ["Elections", "Institutions", "Reform", "Politique"],
  },
  {
    slug: "health",
    title: "Public Health",
    description: "Coverage of healthcare access, hospital quality, preventive care attitudes, mental health policy, and pharmaceutical sector challenges.",
    color: "#e11d48",
    tags: ["Healthcare", "Hospitals", "Prevention", "Santé"],
  },
  {
    slug: "technology",
    title: "Digital Algeria",
    description: "Tech adoption, startup ecosystem confidence, digital government services, e-commerce growth, and Algerian internet access.",
    color: "#6366f1",
    tags: ["Startups", "E-government", "Digital", "Tech"],
  },
  {
    slug: "sports",
    title: "Sport & National Identity",
    description: "National football team performance, Olympic ambitions, grassroots sport infrastructure, and sport as national pride.",
    color: "#0ea5e9",
    tags: ["Football", "Olympics", "Fennecs", "Sport"],
  },
  {
    slug: "society",
    title: "Society & Culture",
    description: "Language policy, cultural identity, social norms, generational divides, and evolving attitudes in Algerian society.",
    color: "#0f766e",
    tags: ["Culture", "Language", "Society", "Société"],
  },
];

const PROFESSIONAL_SLUGS = new Set(["economy", "technology"]);
const SOCIAL_SLUGS = new Set(["sports", "society", "health", "youth", "environment", "politics"]);

export default function TopicsPage() {
  const { t } = useLang();
  const { mode } = usePlatformMode();

  const { data: categories, isLoading: loadingCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const topicsParams = {
    sort: "trending" as const, status: "open" as const, limit: 4,
    ...(mode !== "all" ? { pollMode: mode } : {}),
  };
  const { data: trendingPolls } = useListPolls(
    topicsParams as any,
    { query: { queryKey: getListPollsQueryKey(topicsParams as any), refetchInterval: 10_000 } }
  );

  const filteredClusters = mode === "professional"
    ? ISSUE_CLUSTERS.filter(c => PROFESSIONAL_SLUGS.has(c.slug))
    : mode === "social"
    ? ISSUE_CLUSTERS.filter(c => SOCIAL_SLUGS.has(c.slug))
    : ISSUE_CLUSTERS;

  return (
    <AppShell>
      <MetaTags
        title="Topics"
        description="Explore Algerian public opinion organised by topic — economy, politics, health, youth, environment, and more."
        url="/topics"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Topics — DzPulse",
          "description": "Civic poll topics for Algeria",
          "url": "https://dzpulse.replit.app/topics",
        }}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-topics-heading">{t.topicsPageTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            DzPulse organises public opinion around the issues that matter most to Algeria. Each topic clusters related polls so you can follow the full debate — not just individual questions.
          </p>
        </div>

        {/* Issue Clusters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {filteredClusters.map((issue) => {
            const categoryData = categories?.find(c => c.slug === issue.slug);
            return (
              <Link key={issue.slug} href={`/polls?category=${issue.slug}`} data-testid={`link-topic-${issue.slug}`}>
                <div className="group border border-border rounded-lg p-5 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all bg-card h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: issue.color + "20" }}
                    >
                      <BookOpen size={16} style={{ color: issue.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {issue.title}
                        </h2>
                        {categoryData && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {categoryData.pollCount} {t.totalPolls}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{issue.description}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {issue.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-primary font-medium gap-1">
                    {t.explorePolls}
                    <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Active polls in category breakdown */}
        <div className="border-t border-border pt-8">
          <h2 className="text-base font-semibold text-foreground mb-5">{t.browseByTopic}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {loadingCategories
              ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
              : categories?.map((cat) => (
                <Link key={cat.id} href={`/polls?category=${cat.slug}`} data-testid={`link-cat-${cat.slug}`}>
                  <div className="border border-border rounded-lg p-4 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart2 size={11} />
                        {cat.pollCount} {t.totalPolls}
                      </span>
                      <ArrowRight size={11} className="text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))
            }
          </div>
        </div>

        {/* Submit CTA */}
        <div className="mt-10 border border-border rounded-lg p-6 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t.submitQuestion}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t.submitQuestionDesc}</p>
          </div>
          <Link href="/submit">
            <div className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline cursor-pointer">
              {t.submitaPoll}
              <ArrowRight size={13} />
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
