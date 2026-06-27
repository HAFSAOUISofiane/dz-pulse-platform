import { useState } from "react";
import { useParams } from "wouter";
import { MapPin, Calendar, Pencil, X, Check, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PollCard, PollCardSkeleton } from "@/components/polls/poll-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetUserProfile,
  useGetMyVotedPolls,
  getGetUserProfileQueryKey,
  getGetMyVotedPollsQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";
import { apiFetch } from "@/lib/api-fetch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { WILAYAS } from "@/lib/wilayas";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { user: currentUser, logout } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWilaya, setEditWilaya] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [pwMode, setPwMode] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

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

  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditBio(profile.bio ?? "");
    setEditWilaya(profile.wilaya ?? "");
    setEditAvatarUrl(profile.avatarUrl ?? "");
    setEditMode(true);
    setPwMode(false);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      const token = localStorage.getItem("dzpulse_token") ?? "";
      const r = await apiFetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          wilaya: editWilaya.trim(),
          avatarUrl: editAvatarUrl.trim(),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast({ title: "Failed to update profile", description: (err as any).error ?? "Unknown error", variant: "destructive" });
        return;
      }
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(username) });
      setEditMode(false);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwNew !== pwConfirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (pwNew.length < 8) {
      toast({ title: "New password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    try {
      const token = localStorage.getItem("dzpulse_token") ?? "";
      const r = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast({ title: "Failed to change password", description: (err as any).error ?? "Unknown error", variant: "destructive" });
        return;
      }
      toast({ title: "Password changed successfully" });
      setPwMode(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  };

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
          {editMode ? (
            /* ── Edit form ── */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>
                <button onClick={() => setEditMode(false)} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Wilaya</label>
                  <select
                    value={editWilaya}
                    onChange={(e) => setEditWilaya(e.target.value)}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— not specified —</option>
                    {WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>{w.code} — {w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
                <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} maxLength={500} rows={2} className="text-sm resize-none" />
                <p className="text-xs text-muted-foreground mt-0.5 text-right">{editBio.length}/500</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Avatar URL (https://…)</label>
                <Input value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} placeholder="https://…" className="h-8 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={editSaving}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={editSaving || !editName.trim()} className="gap-1">
                  <Check size={13} />
                  {editSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          ) : pwMode ? (
            /* ── Change password form ── */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
                <button onClick={() => setPwMode(false)} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
                  <X size={14} />
                </button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
                <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
                <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirm New Password</label>
                <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPwMode(false)} disabled={pwSaving}>Cancel</Button>
                <Button size="sm" onClick={changePassword} disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}>
                  {pwSaving ? "Changing…" : "Change Password"}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Read-only view ── */
            <>
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : null}
                  <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                    {profile.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-foreground" data-testid="text-profile-name">{profile.name}</h1>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    </div>
                    {isOwnProfile && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={openEdit}>
                          <Pencil size={11} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setPwMode(true); setEditMode(false); }}>
                          <Lock size={11} /> Password
                        </Button>
                      </div>
                    )}
                  </div>
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
            </>
          )}
        </div>

        {/* Voted Polls (own profile only) */}
        {isOwnProfile && !editMode && !pwMode && (
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
