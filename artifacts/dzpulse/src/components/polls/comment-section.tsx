import { useState } from "react";
import { MessageSquare, ChevronDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-fetch";
import {
  useListComments,
  useCreateComment,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Comment } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";

const UPVOTED_KEY = "dzpulse_upvoted_comments";
function getUpvoted(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(UPVOTED_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveUpvoted(s: Set<number>) {
  try { localStorage.setItem(UPVOTED_KEY, JSON.stringify([...s])); } catch { /* */ }
}

function CommentItem({ comment, pollSlug }: { comment: Comment; pollSlug: string }) {
  const { isAuthenticated } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [upvotes, setUpvotes] = useState<number>(comment.upvotes ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(() => getUpvoted().has(comment.id));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCommentMutation = useCreateComment();

  const handleUpvote = async () => {
    if (hasUpvoted) return;
    setUpvotes((n) => n + 1);
    setHasUpvoted(true);
    const s = getUpvoted();
    s.add(comment.id);
    saveUpvoted(s);
    try {
      const token = localStorage.getItem("dzpulse_token") ?? "";
      await apiFetch(`/api/polls/${pollSlug}/comments/${comment.id}/upvote`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* optimistic — don't roll back */ }
  };

  const handleReply = () => {
    if (!replyBody.trim()) return;
    createCommentMutation.mutate(
      { slug: pollSlug, data: { body: replyBody.trim(), parentId: comment.id } },
      {
        onSuccess: () => {
          setReplyBody("");
          setShowReply(false);
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(pollSlug) });
          toast({ title: "Reply posted" });
        },
        onError: () => toast({ title: "Failed to post reply", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex gap-3" data-testid={`comment-${comment.id}`}>
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
          {comment.user.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground mt-1 leading-relaxed">{comment.body}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleUpvote}
            disabled={hasUpvoted}
            className={`inline-flex items-center gap-1 text-xs transition-colors ${
              hasUpvoted
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ThumbsUp size={11} className={hasUpvoted ? "fill-primary" : ""} />
            {upvotes > 0 && <span>{upvotes}</span>}
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reply
            </button>
          )}
        </div>
        {showReply && (
          <div className="mt-2 flex gap-2">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="text-sm min-h-[60px]"
              data-testid="input-reply-body"
            />
            <div className="flex flex-col gap-1">
              <Button size="sm" onClick={handleReply} disabled={createCommentMutation.isPending} className="h-7 text-xs" data-testid="button-submit-reply">Post</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReply(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-3 border-l-2 border-border flex flex-col gap-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} pollSlug={pollSlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentSectionProps {
  pollSlug: string;
}

export function CommentSection({ pollSlug }: CommentSectionProps) {
  const { isAuthenticated } = useAuth();
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCommentMutation = useCreateComment();

  const { data: commentsData, isLoading } = useListComments(pollSlug, {}, {
    query: { queryKey: getListCommentsQueryKey(pollSlug) }
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(
      { slug: pollSlug, data: { body: newComment.trim() } },
      {
        onSuccess: () => {
          setNewComment("");
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(pollSlug) });
          toast({ title: "Comment posted" });
        },
        onError: () => toast({ title: "Failed to post comment", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex flex-col gap-4" data-testid="comment-section">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageSquare size={15} />
        Discussion
        {commentsData && (
          <span className="text-muted-foreground font-normal">({commentsData.total})</span>
        )}
      </h3>

      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this poll..."
            className="text-sm min-h-[80px]"
            data-testid="input-comment-body"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
              data-testid="button-post-comment"
            >
              {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground text-center">
          <Link href="/login">
            <span className="text-primary cursor-pointer hover:underline font-medium">Sign in</span>
          </Link>
          {" "}to join the discussion
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-7 h-7 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : commentsData?.comments && commentsData.comments.length > 0 ? (
        <div className="flex flex-col gap-4">
          {commentsData.comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} pollSlug={pollSlug} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts.
        </div>
      )}
    </div>
  );
}
