import { useState, useEffect } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api-fetch";
import { Users, Clock, Zap, TrendingUp, Flag, Lightbulb, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSubmitReport, useSubmitSuggestion } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Poll } from "@workspace/api-client-react";
import { getAnonId, markVoted, getLocalVote } from "@/lib/anon-id";
import { useLang } from "@/lib/language-context";
import { ShareMenu } from "./share-menu";
import { CaptchaDialog } from "@/components/ui/captcha-dialog";

const OPTION_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#e11d48"];

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `/api/storage${url}`;
}

function formatTimeLeft(closesAt: string | null | undefined): string {
  if (!closesAt) return "";
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d left`;
  return `${hours}h left`;
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Inline voting row ─────────────────────────────────────────────────────────
function InlineVoteRow({
  option, pct, color, isVoted, hasVotedAnother, onVote, disabled, t,
}: {
  option: Poll["options"][0];
  pct: number;
  color: string;
  isVoted: boolean;
  hasVotedAnother: boolean;
  onVote: () => void;
  disabled: boolean;
  t: ReturnType<typeof useLang>["t"];
}) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-0 group transition-all ${isVoted ? "opacity-100" : "opacity-90 hover:opacity-100"}`}>
      {/* Option image thumbnail */}
      {resolveImageUrl((option as any).imageUrl) && (
        <img
          src={resolveImageUrl((option as any).imageUrl)!}
          alt={option.label}
          className="w-7 h-7 rounded-md object-cover shrink-0 border border-border"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-foreground truncate">{option.label}</span>
          <span className="text-xs font-bold tabular-nums text-foreground shrink-0">{pct}%</span>
        </div>
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled && !isVoted) onVote(); }}
        disabled={disabled || isVoted}
        className={`shrink-0 h-6 min-w-[44px] px-2 rounded text-[10px] font-semibold transition-all border ${
          isVoted
            ? "bg-primary/10 border-primary/30 text-primary cursor-default"
            : hasVotedAnother
            ? "bg-muted border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 cursor-pointer"
            : disabled
            ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
            : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 cursor-pointer"
        }`}
        title={isVoted ? t.yourVote : hasVotedAnother ? "Change your vote" : t.voteButton}
      >
        {isVoted ? <CheckCircle2 size={10} className="mx-auto" /> : hasVotedAnother ? "Change" : t.voteButton}
      </button>
    </div>
  );
}

// ── Report button ─────────────────────────────────────────────────────────────
function ReportButton({ pollId }: { pollId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("biased");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const reportMutation = useSubmitReport();
  const { t } = useLang();

  if (!isAuthenticated) return null;

  const submit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    reportMutation.mutate(
      { data: { entityType: "poll", entityId: pollId, reason } },
      {
        onSuccess: () => { toast({ title: "Report submitted" }); setOpen(false); },
        onError: () => toast({ title: "Report failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
        title={t.reportPoll}
      >
        <Flag size={11} />
      </button>
      {open && (
        <div className="absolute bottom-7 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-52" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-foreground mb-2">{t.reportPoll}</p>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground mb-2"
          >
            <option value="biased">Biased wording</option>
            <option value="misleading">Misleading</option>
            <option value="duplicate">Duplicate</option>
            <option value="spam">Spam</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-1.5">
            <button onClick={submit} className="flex-1 text-xs bg-primary text-primary-foreground rounded py-1 font-medium hover:bg-primary/90 transition-colors">Submit</button>
            <button onClick={() => setOpen(false)} className="flex-1 text-xs border border-border rounded py-1 text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Suggest button ────────────────────────────────────────────────────────────
function SuggestButton({ pollId }: { pollId: number }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const suggestMutation = useSubmitSuggestion();
  const { t } = useLang();

  if (!isAuthenticated) return null;

  const submit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text.trim()) return;
    suggestMutation.mutate(
      { data: { title: `Suggested answer for poll #${pollId}`, description: text, proposedOptions: [text], categoryId: 1 } },
      {
        onSuccess: () => { toast({ title: "Suggestion sent to admins" }); setOpen(false); setText(""); },
        onError: () => toast({ title: "Suggestion failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
        title={t.suggestAnswer}
      >
        <Lightbulb size={11} />
      </button>
      {open && (
        <div className="absolute bottom-7 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-56" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-foreground mb-1">{t.suggestAnswer}</p>
          <p className="text-[10px] text-muted-foreground mb-2">Propose a new option. Admins will review it.</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Your suggested answer..."
            className="w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground mb-2 resize-none h-16"
          />
          <div className="flex gap-1.5">
            <button onClick={submit} disabled={!text.trim()} className="flex-1 text-xs bg-primary text-primary-foreground rounded py-1 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">Send</button>
            <button onClick={() => setOpen(false)} className="flex-1 text-xs border border-border rounded py-1 text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main market card ──────────────────────────────────────────────────────────
interface MarketCardProps {
  poll: Poll;
}

export function MarketCard({ poll }: MarketCardProps) {
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLang();

  // Local vote tracking for anonymous users
  const [localVotedId, setLocalVotedId] = useState<number | null>(() => getLocalVote(poll.slug));
  const [voting, setVoting] = useState(false);
  const [captchaState, setCaptchaState] = useState<{ token: string; question: string; optionId: number } | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const [optimisticVotedId, setOptimisticVotedId] = useState<number | null>(null);

  // For authenticated users, we check server-side
  const [serverVotedId, setServerVotedId] = useState<number | null>(null);

  const effectiveVotedId = optimisticVotedId ?? (isAuthenticated ? serverVotedId : localVotedId);

  // Compute totals with optimistic +1 before server confirms
  const hasOptimistic = optimisticVotedId !== null && (isAuthenticated ? serverVotedId === null : localVotedId === null);
  const totalVotes = hasOptimistic ? poll.totalVotes + 1 : poll.totalVotes;
  const leadingOption = poll.options.reduce((a, b) => a.voteCount > b.voteCount ? a : b, poll.options[0]);
  const leadingPct = totalVotes > 0 ? Math.round((leadingOption?.voteCount / totalVotes) * 100) : 0;
  const isCloseRace = leadingPct > 0 && leadingPct < 55;

  // Fetch server-side vote on mount (for auth users and IP-based for anon)
  useEffect(() => {
    apiFetch(`/api/polls/${poll.slug}/my-vote`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.optionId) {
          if (isAuthenticated) { setServerVotedId(data.optionId); }
          else { setLocalVotedId(data.optionId); markVoted(poll.slug, data.optionId); }
        }
      })
      .catch(() => {});
  }, [poll.slug, token, isAuthenticated]);

  const castVote = async (optionId: number, captchaToken?: string, captchaAnswer?: number) => {
    setVoting(true);

    // Optimistic update — show result immediately
    setOptimisticVotedId(optionId);

    try {
      const anonId = isAuthenticated ? undefined : getAnonId();
      const body: Record<string, unknown> = { optionId };
      if (anonId) body.anonymousId = anonId;
      if (captchaToken !== undefined) body.captchaToken = captchaToken;
      if (captchaAnswer !== undefined) body.captchaAnswer = captchaAnswer;

      const res = await apiFetch(`/api/polls/${poll.slug}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const err = await res.json().catch(() => ({}));
        setOptimisticVotedId(null);
        if (err.requireCaptcha) {
          setCaptchaState({ token: err.captchaToken, question: err.question, optionId });
        } else {
          toast({ title: err.error ?? "Too many attempts", variant: "destructive" });
        }
        return;
      }

      if (res.status === 400 && captchaToken) {
        const err = await res.json().catch(() => ({}));
        setCaptchaError(err.error ?? "Wrong answer. Try again.");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setOptimisticVotedId(null);
        toast({ title: err.error ?? "Vote failed", variant: "destructive" });
        return;
      }

      setCaptchaState(null);
      setCaptchaError("");

      const data = await res.json().catch(() => ({}));
      const confirmedOptionId = data.optionId ?? optionId;

      if (isAuthenticated) {
        setServerVotedId(confirmedOptionId);
      } else {
        markVoted(poll.slug, confirmedOptionId);
        setLocalVotedId(confirmedOptionId);
      }
      setOptimisticVotedId(null);

      // Background sync for accurate counts
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast({ title: data.changed ? "Vote changed" : "Vote recorded" });
    } finally {
      setVoting(false);
    }
  };

  const handleVote = (optionId: number) => {
    if (voting) return;
    castVote(optionId);
  };

  const handleCaptchaConfirm = (answer: number) => {
    if (!captchaState) return;
    setCaptchaError("");
    castVote(captchaState.optionId, captchaState.token, answer);
  };

  return (
    <>
      {captchaState && (
        <CaptchaDialog
          question={captchaState.question}
          onConfirm={handleCaptchaConfirm}
          onClose={() => { setCaptchaState(null); setCaptchaError(""); }}
          error={captchaError}
        />
      )}

      <div className="group bg-card border border-card-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col" data-testid={`market-card-${poll.id}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full border shrink-0"
              style={{ color: poll.category.color, backgroundColor: poll.category.color + "15", borderColor: poll.category.color + "30" }}
            >
              {poll.category.name}
            </span>
            {(poll as any).regionScope === "wilaya" && (poll as any).wilayaCode && (
              <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <MapPin size={9} />
                {(poll as any).wilayaCode}
              </span>
            )}
            {poll.isTrending && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                <Zap size={9} />
                {t.trending}
              </span>
            )}
            {isCloseRace && (
              <span className="inline-flex items-center gap-0.5 text-xs text-violet-600 font-medium">
                <TrendingUp size={9} />
                {t.close}
              </span>
            )}
            {poll.status === "open" && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {t.live}
              </span>
            )}
          </div>

          {/* Title row: small thumbnail left (or right in RTL) + title */}
          <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
            {resolveImageUrl((poll as any).imageUrl) && (
              <img
                src={resolveImageUrl((poll as any).imageUrl)!}
                alt={poll.title}
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/polls/${poll.slug}`}>
                <h3 className={`text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 cursor-pointer ${isRTL ? "text-right" : ""}`} data-testid={`text-poll-title-${poll.id}`}>
                  {poll.title}
                </h3>
              </Link>
              {poll.subtitle && (
                <p className={`text-xs text-muted-foreground mt-0.5 line-clamp-1 ${isRTL ? "text-right" : ""}`}>{poll.subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Vote options */}
        <div className="px-4 pb-2 flex-1">
          <div className={`flex flex-col gap-0.5 ${poll.options.length > 4 ? "max-h-[192px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" : ""}`}>
          {poll.options.map((opt, i) => {
            const optVoteCount = (hasOptimistic && opt.id === optimisticVotedId) ? opt.voteCount + 1 : opt.voteCount;
            const pct = totalVotes > 0 ? Math.round((optVoteCount / totalVotes) * 100) : 0;
            const isVotedThis = effectiveVotedId === opt.id;
            const hasVotedAnother = effectiveVotedId !== null && !isVotedThis;
            return (
              <InlineVoteRow
                key={opt.id}
                option={opt}
                pct={pct}
                color={OPTION_COLORS[i] ?? "#888"}
                isVoted={isVotedThis}
                hasVotedAnother={hasVotedAnother}
                onVote={() => handleVote(opt.id)}
                disabled={voting || poll.status !== "open"}
                t={t}
              />
            );
          })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-border/50 mt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {poll.totalVotes.toLocaleString()}
            </span>
            {poll.closesAt && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatTimeLeft(poll.closesAt)}
              </span>
            )}
            {!poll.closesAt && poll.createdAt && (
              <span>{formatTimeAgo(poll.createdAt)}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <ShareMenu slug={poll.slug} title={poll.title} totalVotes={poll.totalVotes} compact />
            <SuggestButton pollId={poll.id} />
            <ReportButton pollId={poll.id} />
          </div>
        </div>
      </div>
    </>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-4 w-16 bg-muted rounded-full" />
        <div className="h-4 w-12 bg-muted rounded-full" />
      </div>
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-3/4 bg-muted rounded" />
      <div className="flex flex-col gap-2 mt-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 h-5 bg-muted rounded" />
            <div className="h-5 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 pt-1 border-t border-border/50">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}
