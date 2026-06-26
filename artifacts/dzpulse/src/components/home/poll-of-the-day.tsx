import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Clock, Flame, Users, ChevronRight } from "lucide-react";
import type { Poll } from "@workspace/api-client-react";

function getCountdown(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  poll: Poll | null | undefined;
  loading?: boolean;
}

export function PollOfTheDay({ poll, loading }: Props) {
  const [countdown, setCountdown] = useState(getCountdown());

  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-5 animate-pulse h-28" />
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.totalVotes;
  const leadingOption = poll.options.length > 0
    ? poll.options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, poll.options[0])
    : null;
  const leadingPct = leadingOption && totalVotes > 0
    ? Math.round((leadingOption.voteCount / totalVotes) * 100)
    : 0;
  const isClose = leadingPct > 0 && leadingPct < 55;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <Link href={`/polls/${poll.slug}`}>
        <div className="group relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/3 hover:border-primary/40 hover:shadow-sm transition-all duration-200 overflow-hidden cursor-pointer">
          {/* Accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/40 rounded-l-xl" />

          <div className="px-5 py-4 pl-6 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Left: label + question */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary uppercase tracking-wide">
                  <Flame size={11} className="fill-primary" />
                  Poll of the Day
                </span>
                {isClose && (
                  <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                    Close race
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {poll.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={10} />
                  {totalVotes.toLocaleString()} votes
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ color: poll.category.color, backgroundColor: poll.category.color + "18" }}
                >
                  {poll.category.name}
                </span>
              </div>
            </div>

            {/* Right: countdown + leading result */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5 border border-border/50">
                <Clock size={11} className="text-muted-foreground" />
                <span className="text-xs font-mono font-semibold text-foreground tabular-nums">{countdown}</span>
                <span className="text-[10px] text-muted-foreground">left</span>
              </div>

              {leadingOption && totalVotes > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground truncate max-w-[120px] hidden sm:block">{leadingOption.label}</span>
                  <span className="font-bold text-foreground">{leadingPct}%</span>
                </div>
              )}

              <ChevronRight size={14} className="text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
