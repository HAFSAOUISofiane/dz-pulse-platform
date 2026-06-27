import { useState, useRef } from "react";
import { Users, RefreshCw, Image, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { getGetPollBySlugQueryKey, getGetMyVoteQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { CaptchaDialog } from "@/components/ui/captcha-dialog";
import type { PollDetail } from "@workspace/api-client-react";
import { recordStreakVote } from "@/hooks/use-streak";

interface PollOption {
  id: number;
  label: string;
  voteCount: number;
  percentageCache?: string;
  imageUrl?: string | null;
}

interface VoteOptionsProps {
  poll: PollDetail;
  myVoteOptionId: number | null;
  onVoted?: () => void;
}

/** Resolves a stored image path to a displayable URL. */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // Stored objectPath like /objects/uploads/uuid → served via /api/storage
  return `/api/storage${url}`;
}

export function VoteOptions({ poll, myVoteOptionId, onVoted }: VoteOptionsProps) {
  const { t } = useLang();
  const { token } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [voting, setVoting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [lastVotedId, setLastVotedId] = useState<number | null>(null);
  const prevTotalRef = useRef<number | null>(null);
  const [sharingImage, setSharingImage] = useState(false);
  const [captchaState, setCaptchaState] = useState<{ token: string; question: string } | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cardRef = useRef<HTMLDivElement>(null);

  const hasVoted = myVoteOptionId !== null;
  // Use lastVotedId as the effective voted option (covers optimistic state before myVote refetches)
  const effectiveVotedId = lastVotedId ?? myVoteOptionId;
  const totalVotes = poll.totalVotes;

  const getPercent = (option: PollOption) => {
    if (totalVotes === 0 && !lastVotedId) return 0;
    // Keep optimistic +1 until the server total has actually increased (both queries settled)
    const serverCaughtUp = lastVotedId !== null && prevTotalRef.current !== null && totalVotes > prevTotalRef.current;
    const needsOptimistic = lastVotedId !== null && !serverCaughtUp;
    const optCount = (needsOptimistic && option.id === lastVotedId) ? option.voteCount + 1 : option.voteCount;
    const total = needsOptimistic ? totalVotes + 1 : totalVotes;
    if (total === 0) return 0;
    return Math.round((optCount / total) * 100);
  };

  const castVote = async (optionId: number, captchaToken?: string, captchaAnswer?: number) => {
    setVoting(true);

    // Optimistic update — show result immediately before the network round-trip
    prevTotalRef.current = poll.totalVotes;
    setLastVotedId(optionId);
    setJustVoted(true);
    setIsChanging(false);
    setSelectedId(null);
    const { streak, newMilestone } = recordStreakVote();
    if (newMilestone !== null) {
      const medals: Record<number, string> = { 3: "🔥", 7: "⚡", 30: "🏆" };
      toast({
        title: `${medals[newMilestone] ?? "🎉"} ${newMilestone}-day streak!`,
        description: newMilestone === 30
          ? "You've voted every day for a month. Legendary civic participation!"
          : newMilestone === 7
          ? "A full week of votes. You're a DzPulse regular!"
          : "Three days in a row. Keep the streak going!",
      });
    }

    try {
      const body: Record<string, unknown> = { optionId };
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
        // Revert optimistic state
        setLastVotedId(null);
        setJustVoted(false);
        prevTotalRef.current = null;
        if (err.requireCaptcha) {
          setCaptchaState({ token: err.captchaToken, question: err.question });
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
        // Revert optimistic state
        setLastVotedId(null);
        setJustVoted(false);
        prevTotalRef.current = null;
        toast({ title: t.couldNotVote, description: err.error ?? "Please try again", variant: "destructive" });
        return;
      }

      setCaptchaState(null);
      setCaptchaError("");
      toast({ title: t.voteRecorded, description: "Your voice has been counted." });
      // Background sync — UI is already updated optimistically
      queryClient.invalidateQueries({ queryKey: getGetPollBySlugQueryKey(poll.slug) });
      queryClient.invalidateQueries({ queryKey: getGetMyVoteQueryKey(poll.slug) });
      if (onVoted) onVoted();
    } finally {
      setVoting(false);
    }
  };

  const handleOptionClick = (optionId: number) => {
    if (voting) return;
    setSelectedId(optionId);
    castVote(optionId);
  };

  const handleCaptchaConfirm = (answer: number) => {
    if (!captchaState || !selectedId) return;
    setCaptchaError("");
    castVote(selectedId, captchaState.token, answer);
  };

  const showResults = (hasVoted && !isChanging) || poll.status !== "open" || (justVoted && !isChanging);
  const showVoting = !showResults && poll.status === "open";

  // Detect if any option has an image (to use card layout)
  const hasImages = poll.options.some((o: any) => o.imageUrl);

  // Majority/minority calculation
  const getVerdictInfo = (votedId: number | null) => {
    if (!votedId || totalVotes === 0) return null;
    const voted = poll.options.find((o: any) => o.id === votedId);
    if (!voted) return null;
    const pct = getPercent(voted as any);
    const isClose = pct >= 44 && pct <= 56;
    return { pct, isClose, isMajority: pct >= 50 };
  };

  // Share result as image
  const handleShareImage = async () => {
    if (!cardRef.current || sharingImage) return;
    setSharingImage(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const dataUrl = canvas.toDataURL("image/png");
      // Try Web Share API (mobile)
      if (typeof navigator.share === "function") {
        try {
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r));
          if (blob) {
            const file = new File([blob], `dzpulse-result.png`, { type: "image/png" });
            await navigator.share({ title: poll.title, files: [file] });
            return;
          }
        } catch { /* fall through to download */ }
      }
      // Fallback: download
      const a = document.createElement("a");
      a.download = `dzpulse-${poll.slug}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      toast({ title: "Could not generate image", variant: "destructive" });
    } finally {
      setSharingImage(false);
    }
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
    <div className="flex flex-col gap-3" data-testid="vote-options-container">
      {/* If options have images and we're in voting mode — compact thumbnail row */}
      {hasImages && showVoting ? (
        <div className="flex flex-col gap-2">
          {poll.options.map((option: any) => {
            const isVoting = voting && option.id === selectedId;
            const imgSrc = resolveImageUrl(option.imageUrl);
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={voting}
                data-testid={`vote-option-${option.id}`}
                className={`flex items-center gap-3 w-full rounded-md border px-3 py-2 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  isVoting
                    ? "border-primary ring-2 ring-primary/20 bg-accent"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                }`}
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={option.label}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                {isVoting ? (
                  <span className="flex items-center gap-2 flex-1 text-sm font-medium text-primary">
                    <Loader2 size={13} className="animate-spin flex-shrink-0" />
                    {option.label}
                  </span>
                ) : (
                  <span className="flex-1 text-sm font-medium text-foreground">{option.label}</span>
                )}
                {isVoting && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : hasImages && showResults ? (
        /* Results view with images — compact thumbnail row + progress bar */
        <div className="flex flex-col gap-2">
          {poll.options.map((option: any) => {
            const pct = getPercent(option);
            const isMyVote = option.id === effectiveVotedId;
            const imgSrc = resolveImageUrl(option.imageUrl);
            return (
              <div
                key={option.id}
                className={`relative flex items-center gap-3 rounded-md border overflow-hidden px-3 py-2 transition-all ${isMyVote ? "border-primary" : "border-border"}`}
                data-testid={`result-option-${option.id}`}
              >
                <div
                  className="absolute inset-0 transition-[width] duration-400"
                  style={{
                    width: `${pct}%`,
                    background: isMyVote
                      ? "linear-gradient(90deg, hsl(153,60%,25%,0.12), hsl(153,60%,25%,0.08))"
                      : "hsl(var(--muted))",
                  }}
                />
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={option.label}
                    className="relative w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="relative flex items-center gap-1.5 flex-1 min-w-0">
                  {isMyVote && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  <span className={`text-sm font-medium truncate ${isMyVote ? "text-primary" : "text-foreground"}`}>
                    {option.label}
                  </span>
                </div>
                <div className="relative flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{option.voteCount.toLocaleString()}</span>
                  <span className={`text-sm font-bold ${isMyVote ? "text-primary" : "text-foreground"}`}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* No images — original list layout */
        <>
          {poll.options.map((option: any) => {
            const pct = getPercent(option);
            const isMyVote = option.id === effectiveVotedId;
            const isSelected = option.id === selectedId;

            if (showResults) {
              return (
                <div
                  key={option.id}
                  className={`relative rounded-md border overflow-hidden transition-all ${isMyVote ? "border-primary" : "border-border"}`}
                  data-testid={`result-option-${option.id}`}
                >
                  <div
                    className="absolute inset-0 transition-[width] duration-400"
                    style={{
                      width: `${pct}%`,
                      background: isMyVote
                        ? "linear-gradient(90deg, hsl(153,60%,25%,0.12), hsl(153,60%,25%,0.08))"
                        : "hsl(var(--muted))",
                    }}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isMyVote && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      <span className={`text-sm font-medium ${isMyVote ? "text-primary" : "text-foreground"}`}>
                        {option.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{option.voteCount.toLocaleString()}</span>
                      <span className={`text-sm font-bold ${isMyVote ? "text-primary" : "text-foreground"}`}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            }

            const isVoting = voting && option.id === selectedId;
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={voting}
                data-testid={`vote-option-${option.id}`}
                className={`w-full text-left rounded-md border px-4 py-3 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  isVoting
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:border-primary/50 hover:bg-muted text-foreground"
                }`}
              >
                {isVoting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    {option.label}
                  </span>
                ) : option.label}
              </button>
            );
          })}
        </>
      )}

      {showVoting && isChanging && (
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => { setIsChanging(false); setSelectedId(null); }}
          >
            {t.cancel}
          </Button>
        </div>
      )}

      {hasVoted && !isChanging && poll.status === "open" && (
        <button
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 transition-colors"
          onClick={() => { setIsChanging(true); setSelectedId(null); }}
          data-testid="button-change-vote"
        >
          <RefreshCw size={11} />
          {t.changeVote}
        </button>
      )}

      {/* Vote-to-unlock teaser (shown to non-voters on open polls with existing votes) */}
      {!hasVoted && poll.status === "open" && poll.totalVotes >= 3 && (
        <div className="relative overflow-hidden rounded-lg border border-border/60 mt-1">
          <div className="blur-[3px] pointer-events-none select-none px-3 py-2" aria-hidden>
            {poll.options.slice(0, Math.min(3, poll.options.length)).map((opt: any) => {
              const fakePct = Math.round(100 / poll.options.length) + (opt.displayOrder === 0 ? 8 : -4);
              return (
                <div key={opt.id} className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/30 rounded-full" style={{ width: `${Math.max(5, Math.min(90, fakePct))}%` }} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground w-8 text-right">??%</span>
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/75 backdrop-blur-[1.5px]">
            <p className="text-xs font-bold text-foreground">🔒 Vote to reveal Algeria's verdict</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{poll.totalVotes.toLocaleString()} Algerians have already voted</p>
          </div>
        </div>
      )}

      {/* Post-vote: majority/minority reveal + sharing */}
      {justVoted && (() => {
        const verdict = getVerdictInfo(lastVotedId);
        const shareUrl = `${window.location.origin}/polls/${poll.slug}`;
        const shareText = encodeURIComponent(`I just voted on DzPulse! "${poll.title}" — your turn`);
        return (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/6 to-primary/3 px-3 py-3">
            {verdict && (
              <div className="text-center pb-2 border-b border-primary/10">
                {verdict.isClose ? (
                  <p className="text-sm font-bold text-violet-600 dark:text-violet-400">🔥 Algeria is divided on this one</p>
                ) : verdict.isMajority ? (
                  <p className="text-sm font-bold text-primary">✓ You agree with the {verdict.pct}% majority</p>
                ) : (
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">💡 You're in the {verdict.pct}% minority</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">Share the results — let Algeria hear more voices</p>
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleShareImage}
                disabled={sharingImage}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {sharingImage ? <Loader2 size={11} className="animate-spin" /> : <Image size={11} />}
                Save card
              </button>
              <button
                onClick={() => window.open(`https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`, "_blank", "noopener")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-[#25D366]/10 text-[#128c2e] dark:text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors"
              >
                WhatsApp
              </button>
              <button
                onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}`, "_blank", "noopener")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/30 hover:bg-[#0088cc]/20 transition-colors"
              >
                Telegram
              </button>
              <button onClick={() => setJustVoted(false)} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground px-1">✕</button>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-vote-count">
        <Users size={12} />
        <span>{totalVotes.toLocaleString()} {t.totalVotes}</span>
        {poll.uniqueVoters !== totalVotes && (
          <span>· {poll.uniqueVoters.toLocaleString()} {t.participants}</span>
        )}
      </div>
    </div>

    {/* Hidden branded result card for html2canvas image export */}
    <div
      ref={cardRef}
      aria-hidden
      style={{
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        width: "600px",
        height: "600px",
        background: "linear-gradient(135deg, #0a3d21 0%, #1a5c34 60%, #0a3d21 100%)",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "white", fontSize: "11px", fontWeight: "800" }}>DZ</span>
        </div>
        <span style={{ color: "#86efac", fontSize: "15px", fontWeight: "700", letterSpacing: "0.05em" }}>DzPulse</span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", margin: "0 0 8px 0" }}>Algeria is voting on:</p>
      <h2 style={{ color: "white", fontSize: "22px", fontWeight: "700", lineHeight: "1.35", margin: "0 0 24px 0" }}>
        {poll.title.length > 85 ? poll.title.slice(0, 85) + "…" : poll.title}
      </h2>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
        {[...poll.options]
          .sort((a: any, b: any) => b.voteCount - a.voteCount)
          .slice(0, 4)
          .map((opt: any) => {
            const pct = getPercent(opt);
            const isMyVote = opt.id === (lastVotedId ?? myVoteOptionId);
            return (
              <div key={opt.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ color: isMyVote ? "#86efac" : "rgba(255,255,255,0.85)", fontSize: "14px", fontWeight: isMyVote ? "700" : "400" }}>
                    {isMyVote ? "✓ " : ""}{opt.label}
                  </span>
                  <span style={{ color: "white", fontSize: "15px", fontWeight: "800" }}>{pct}%</span>
                </div>
                <div style={{ height: "7px", background: "rgba(255,255,255,0.12)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: isMyVote ? "#22c55e" : "rgba(255,255,255,0.35)", borderRadius: "4px" }} />
                </div>
              </div>
            );
          })}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "16px", marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>{totalVotes.toLocaleString()} Algerians voted</span>
        <span style={{ color: "#86efac", fontSize: "11px", fontWeight: "600" }}>dzpulse.dz/polls/{poll.slug}</span>
      </div>
    </div>
    </>
  );
}
