import { Link } from "wouter";
import { Users, Clock, TrendingUp, MessageSquare, MapPin, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Poll } from "@workspace/api-client-react";

interface PollCardProps {
  poll: Poll;
  variant?: "card" | "list";
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-DZ", { month: "short", day: "numeric" });
}

function formatTimeLeft(closesAt: string | null | undefined): string {
  if (!closesAt) return "";
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return "Closing soon";
}

export function PollCard({ poll, variant = "card" }: PollCardProps) {
  const topOptions = poll.options.slice(0, 2);
  const leadingOption = poll.options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, poll.options[0]);
  const leadingPct = poll.totalVotes > 0 ? Math.round((leadingOption?.voteCount / poll.totalVotes) * 100) : 0;
  const isCloseRace = leadingPct > 0 && leadingPct < 55;

  if (variant === "list") {
    return (
      <Link href={`/polls/${poll.slug}`} data-testid={`card-poll-${poll.id}`}>
        <div className="group flex items-start gap-4 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 cursor-pointer transition-all duration-150">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full border"
                style={{ color: poll.category.color, backgroundColor: poll.category.color + "15", borderColor: poll.category.color + "30" }}
              >
                {poll.category.name}
              </span>
              <StatusBadge status={poll.status} />
              {poll.isTrending && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <Zap size={10} />
                  Trending
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {poll.title}
            </h3>
          </div>
          <div className="shrink-0 flex items-center gap-4 text-xs text-muted-foreground">
            {leadingOption && poll.totalVotes > 0 && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-semibold text-foreground text-sm">{leadingPct}%</span>
                <span className="truncate max-w-[120px]">{leadingOption.label}</span>
              </div>
            )}
            <div className="flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-1">
                <Users size={11} />
                {poll.totalVotes.toLocaleString()}
              </span>
              {poll.commentCount !== undefined && (
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} />
                  {poll.commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/polls/${poll.slug}`} data-testid={`card-poll-${poll.id}`}>
      <div className="group bg-card border border-card-border rounded-lg p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all duration-200 h-full flex flex-col gap-3">
        {/* Category + Status row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full border shrink-0"
            style={{ color: poll.category.color, backgroundColor: poll.category.color + "15", borderColor: poll.category.color + "30" }}
            data-testid={`text-category-${poll.id}`}
          >
            {poll.category.name}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {poll.isTrending && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Zap size={10} />
                <span className="hidden sm:inline">Trending</span>
              </span>
            )}
            {isCloseRace && poll.status === "open" && (
              <span className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
                <TrendingUp size={10} />
                <span className="hidden sm:inline">Close race</span>
              </span>
            )}
            <StatusBadge status={poll.status} />
          </div>
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2" data-testid={`text-poll-title-${poll.id}`}>
            {poll.title}
          </h3>
          {poll.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{poll.subtitle}</p>
          )}
        </div>

        {/* Leading result highlight */}
        {leadingOption && poll.totalVotes > 0 && (
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">{leadingOption.label}</span>
              <span className="text-sm font-bold text-foreground shrink-0">{leadingPct}%</span>
            </div>
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${leadingPct}%`, backgroundColor: poll.category.color || "hsl(153 60% 25%)" }}
              />
            </div>
          </div>
        )}

        {/* All option bars (compact, 2 bars) */}
        {poll.totalVotes === 0 && (
          <div className="flex flex-col gap-1.5">
            {topOptions.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 truncate shrink-0">{option.label}</span>
                <div className="flex-1 h-1 bg-muted rounded-full" />
                <span className="text-xs text-muted-foreground w-6 text-right">—</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" data-testid={`text-total-votes-${poll.id}`}>
              <Users size={11} />
              {poll.totalVotes.toLocaleString()}
            </span>
            {poll.commentCount !== undefined && poll.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare size={11} />
                {poll.commentCount}
              </span>
            )}
            {poll.regionScope === "wilaya" && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                Local
              </span>
            )}
          </div>
          <span className="shrink-0">
            {poll.status === "open" && poll.closesAt ? (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatTimeLeft(poll.closesAt)}
              </span>
            ) : (
              formatTimeAgo(poll.createdAt)
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PollCardSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="bg-muted/50 rounded-md px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="mt-1.5 h-1 w-full rounded-full" />
      </div>
      <div className="flex justify-between pt-1 border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
