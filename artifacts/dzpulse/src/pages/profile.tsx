import { useParams } from "wouter";
import { MapPin, Calendar, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PollCard, PollCardSkeleton } from "@/components/polls/poll-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useGetUserProfile,
  useGetMyVotedPolls,
  getGetUserProfileQueryKey,
  getGetMyVotedPollsQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { user: currentUser } = useAuth();
  const { t } = useLang();

  const { data: profile, isLoading } = useGetUserProfile(username, {
    query: { queryKey: getGetUserProfileQueryKey(username) }
  });

  const isOwnProfile = currentUser?.username === username;

  const { data: votedPolls, isLoading: loadingVoted } = useGetMyVotedPolls({}, {
    query: {
      queryKey: getGetMyVotedPollsQueryKey({}),
      enabled: isOwnProfile,
    }
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">{t.userNotFound}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="border border-border rounded-xl p-6 bg-card mb-6" data-testid="section-profile-header">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                {profile.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground" data-testid="text-profile-name">{profile.name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-foreground mt-2">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                {profile.wilaya && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {t.wilayaLabel} {profile.wilaya}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {t.joined} {format(new Date(profile.createdAt), "MMMM yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground" data-testid="text-total-votes">{profile.totalVotes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{t.pollsVoted}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{profile.totalSuggestions}</p>
              <p className="text-xs text-muted-foreground">{t.pollsSuggested}</p>
            </div>
          </div>
        </div>

        {/* Voted Polls (own profile only) */}
        {isOwnProfile && (
          <div data-testid="section-voted-polls">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t.yourVotedPolls}</h2>
            {loadingVoted ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => <PollCardSkeleton key={i} />)}
              </div>
            ) : votedPolls?.polls && votedPolls.polls.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {votedPolls.polls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground border border-border rounded-lg">
                {t.noPollsVotedYet}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
