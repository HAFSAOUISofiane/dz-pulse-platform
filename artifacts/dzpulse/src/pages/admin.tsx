import { useState, useRef, useEffect } from "react";
import {
  CheckCircle, XCircle, AlertTriangle, BarChart2, Users, Tag, FileText,
  Trash2, PenLine, Plus, Star, TrendingUp, ToggleLeft, Search, RefreshCw, ChevronRight,
  Archive, Send, Pencil, Globe, MessageCircle, Lock
} from "lucide-react";
import { WILAYAS } from "@/lib/wilayas";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  useAdminListSuggestions,
  useAdminReviewSuggestion,
  useAdminListReports,
  useGetAnalyticsSummary,
  useAdminCreatePoll,
  useListCategories,
  getAdminListSuggestionsQueryKey,
  getAdminListReportsQueryKey,
  getGetAnalyticsSummaryQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type AdminTab = "overview" | "polls" | "drafts" | "users" | "categories" | "suggestions" | "reports" | "feedback";

const TABS: { id: AdminTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "polls", label: "Polls", icon: FileText },
  { id: "drafts", label: "Drafts", icon: Archive },
  { id: "users", label: "Users", icon: Users },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "suggestions", label: "Suggestions", icon: CheckCircle },
  { id: "reports", label: "Reports", icon: AlertTriangle },
  { id: "feedback", label: "Feedback", icon: MessageCircle },
];

function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("dzpulse_token");
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="flex gap-2">{[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-8 w-24 rounded-lg" />)}</div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-20 text-center" data-testid="section-admin-unauthorized">
          <AlertTriangle size={32} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-base font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">You need admin access to view this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-admin-heading">Admin Hub</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Content, polls, users, and moderation</p>
          </div>
          <Badge variant="secondary" className="text-xs">Admin</Badge>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-border mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "polls" && <PollsTab />}
        {activeTab === "drafts" && <DraftsTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "suggestions" && <SuggestionsTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "feedback" && <FeedbackTab />}
      </div>
    </AppShell>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: summary, isLoading } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  const stats = summary ? [
    { label: "Total Polls", value: summary.totalPolls, color: "text-primary" },
    { label: "Live Polls", value: summary.openPolls, color: "text-green-600" },
    { label: "Total Votes", value: summary.totalVotes.toLocaleString(), color: "text-foreground" },
    { label: "Total Users", value: summary.totalUsers.toLocaleString(), color: "text-foreground" },
    { label: "Comments", value: summary.totalComments.toLocaleString(), color: "text-foreground" },
    { label: "New Polls (7d)", value: summary.newPollsThisWeek, color: "text-amber-600" },
    { label: "New Votes (7d)", value: summary.newVotesThisWeek.toLocaleString(), color: "text-amber-600" },
  ] : [];

  return (
    <div className="space-y-6" data-testid="section-overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? [...Array(7)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : stats.map(stat => (
            <div key={stat.label} className="border border-border rounded-xl p-4 bg-card" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))
        }
      </div>

      <div className="border border-border rounded-xl p-5 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 text-xs h-8">
            <Plus size={13} />
            Create Poll
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
            <Tag size={13} />
            Add Category
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
            <Users size={13} />
            View Users
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Polls Tab ─────────────────────────────────────────────────────────────────
function PollsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editPollId, setEditPollId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const adminPollsQueryKey = ["admin-polls", page, search, statusFilter];
  const { data, isLoading, refetch } = useQuery({
    queryKey: adminPollsQueryKey,
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) qs.set("search", search);
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const res = await adminFetch(`/admin/polls?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch admin polls");
      return res.json() as Promise<{ polls: any[]; total: number; totalPages: number; page: number }>;
    },
  });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-polls"] });

  const handleToggleFeature = async (id: number, current: boolean) => {
    const res = await adminFetch(`/admin/polls/${id}/feature`, {
      method: "POST",
      body: JSON.stringify({ isFeatured: !current }),
    });
    if (res.ok) {
      toast({ title: `Poll ${!current ? "featured" : "unfeatured"}` });
      invalidate();
    } else {
      toast({ title: "Failed to toggle featured", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const res = await adminFetch(`/admin/polls/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (res.ok) {
      toast({ title: `Status updated to ${status}` });
      invalidate();
    } else {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleToggleTrend = async (id: number, current: boolean) => {
    const res = await adminFetch(`/admin/polls/${id}`, { method: "PATCH", body: JSON.stringify({ isTrending: !current }) });
    if (res.ok) {
      toast({ title: `Trending ${!current ? "enabled" : "disabled"}` });
      invalidate();
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete poll: "${title}"? This cannot be undone.`)) return;
    const res = await adminFetch(`/admin/polls/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Poll deleted" });
      invalidate();
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const polls = data?.polls ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusChange2 = (v: string) => { setStatusFilter(v); setPage(1); };

  return (
    <div className="space-y-4" data-testid="section-polls-admin">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search polls..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange2}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Live</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowCreate(true)}>
          <Plus size={13} />
          Create Poll
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => refetch()} title="Refresh">
          <RefreshCw size={13} />
        </Button>
        {!isLoading && (
          <span className="text-xs text-muted-foreground ml-auto">{total} poll{total !== 1 ? "s" : ""}</span>
        )}
      </div>

      {showCreate && <CreatePollForm categories={categories ?? []} onClose={() => setShowCreate(false)} onCreated={() => { invalidate(); setShowCreate(false); }} />}
      {editPollId !== null && <EditPollForm pollId={editPollId} categories={categories ?? []} onClose={() => setEditPollId(null)} onSaved={() => { invalidate(); setEditPollId(null); }} />}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Poll</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Votes</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {polls.map(poll => (
                <tr key={poll.id} className="hover:bg-muted/20 transition-colors" data-testid={`poll-row-${poll.id}`}>
                  <td className="px-4 py-2.5 max-w-[240px]">
                    <p className="font-medium text-foreground truncate">{poll.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {poll.isFeatured && <span className="text-amber-500 text-[10px] flex items-center gap-0.5"><Star size={9} />Featured</span>}
                      {poll.isTrending && <span className="text-blue-500 text-[10px] flex items-center gap-0.5"><TrendingUp size={9} />Trending</span>}
                      {poll.isPrivate && <span className="text-slate-500 text-[10px] flex items-center gap-0.5"><Lock size={9} />Private</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className="text-muted-foreground">{poll.category.name}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select value={poll.status} onValueChange={v => handleStatusChange(poll.id, v)}>
                      <SelectTrigger className="h-6 text-[10px] w-20 border-0 bg-transparent p-0 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Live</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                    {poll.totalVotes.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditPollId(poll.id)} className="p-1 rounded hover:bg-muted transition-colors" title="Edit poll">
                        <Pencil size={13} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => handleToggleFeature(poll.id, poll.isFeatured)} className="p-1 rounded hover:bg-muted transition-colors" title="Toggle featured">
                        <Star size={13} className={poll.isFeatured ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                      </button>
                      <button onClick={() => handleToggleTrend(poll.id, poll.isTrending)} className="p-1 rounded hover:bg-muted transition-colors" title="Toggle trending">
                        <TrendingUp size={13} className={poll.isTrending ? "text-primary" : "text-muted-foreground"} />
                      </button>
                      <button onClick={() => handleDelete(poll.id, poll.title)} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Delete">
                        <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {polls.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">No polls found.</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Prev
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <Button
                  key={pg}
                  size="sm"
                  variant={pg === page ? "default" : "outline"}
                  className="h-7 w-7 text-xs p-0"
                  onClick={() => setPage(pg)}
                >
                  {pg}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Poll Form ──────────────────────────────────────────────────────────
function CreatePollForm({ categories, onClose, onCreated }: { categories: any[]; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const createMutation = useAdminCreatePoll();

  const [form, setForm] = useState({
    title: "",
    titleAr: "",
    titleFr: "",
    subtitle: "",
    subtitleAr: "",
    subtitleFr: "",
    description: "",
    descriptionAr: "",
    descriptionFr: "",
    imageUrl: "",
    categoryId: "",
    pollType: "multiple_choice",
    pollMode: "all",
    regionScope: "national",
    wilayaCode: "",
    closesAt: "",
    tags: "",
    pollLanguage: "en",
  });
  const [options, setOptions] = useState<{ label: string; labelAr: string; labelFr: string; imageUrl: string }[]>([
    { label: "", labelAr: "", labelFr: "", imageUrl: "" },
    { label: "", labelAr: "", labelFr: "", imageUrl: "" },
  ]);
  const [showTranslations, setShowTranslations] = useState(false);

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));
  const updateOptionLabel = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], label: v }; return next; });
  const updateOptionLabelAr = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], labelAr: v }; return next; });
  const updateOptionLabelFr = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], labelFr: v }; return next; });
  const updateOptionImage = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], imageUrl: v }; return next; });
  const addOption = () => setOptions(prev => [...prev, { label: "", labelAr: "", labelFr: "", imageUrl: "" }]);
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (publishNow: boolean) => {
    const validOptions = options.filter(o => o.label.trim());
    if (!form.title.trim() || !form.categoryId || validOptions.length < 2) {
      toast({ title: "Fill in title, category, and at least 2 options.", variant: "destructive" });
      return;
    }

    const body: any = {
      title: form.title.trim(),
      titleAr: form.titleAr.trim() || undefined,
      titleFr: form.titleFr.trim() || undefined,
      subtitle: form.subtitle.trim() || undefined,
      subtitleAr: form.subtitleAr.trim() || undefined,
      subtitleFr: form.subtitleFr.trim() || undefined,
      description: form.description.trim() || undefined,
      descriptionAr: form.descriptionAr.trim() || undefined,
      descriptionFr: form.descriptionFr.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      categoryId: Number(form.categoryId),
      pollType: form.pollType,
      pollLanguage: form.pollLanguage,
      pollMode: form.pollMode,
      regionScope: form.regionScope,
      closesAt: form.closesAt || undefined,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      options: validOptions.map(o => ({
        label: o.label,
        labelAr: o.labelAr.trim() || undefined,
        labelFr: o.labelFr.trim() || undefined,
        imageUrl: o.imageUrl.trim() || undefined,
      })),
      status: publishNow ? "open" : "draft",
    };
    if (form.regionScope === "wilaya" && form.wilayaCode) body.wilayaCode = form.wilayaCode;

    createMutation.mutate(
      { data: body as any },
      {
        onSuccess: () => {
          toast({ title: publishNow ? "Poll published" : "Poll saved to Drafts" });
          onCreated();
        },
        onError: () => toast({ title: "Failed to create poll", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="border border-border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Create New Poll</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Question * (English)</label>
          <Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="What should Algeria do about...?" className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Poll Language</label>
          <Select value={form.pollLanguage} onValueChange={v => update("pollLanguage", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowTranslations(v => !v)} className="text-xs h-9">
            {showTranslations ? "Hide" : "Add"} Translations (AR / FR)
          </Button>
        </div>
        {showTranslations && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Title – Arabic</label>
              <Input dir="rtl" value={form.titleAr} onChange={e => update("titleAr", e.target.value)} placeholder="العنوان بالعربية" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Title – French</label>
              <Input value={form.titleFr} onChange={e => update("titleFr", e.target.value)} placeholder="Titre en français" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Subtitle – Arabic</label>
              <Input dir="rtl" value={form.subtitleAr} onChange={e => update("subtitleAr", e.target.value)} placeholder="العنوان الفرعي" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Subtitle – French</label>
              <Input value={form.subtitleFr} onChange={e => update("subtitleFr", e.target.value)} placeholder="Sous-titre en français" className="text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Description – Arabic</label>
              <Textarea dir="rtl" value={form.descriptionAr} onChange={e => update("descriptionAr", e.target.value)} placeholder="وصف الاستطلاع" className="text-sm min-h-[60px]" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Description – French</label>
              <Textarea value={form.descriptionFr} onChange={e => update("descriptionFr", e.target.value)} placeholder="Description en français" className="text-sm min-h-[60px]" />
            </div>
          </>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Subtitle (English)</label>
          <Input value={form.subtitle} onChange={e => update("subtitle", e.target.value)} placeholder="Optional context" className="text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Cover Image</label>
          <ImageUploadField
            value={form.imageUrl}
            onChange={v => update("imageUrl", v)}
            placeholder="https://... (used in share cards and OG image)"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Category *</label>
          <Select value={form.categoryId} onValueChange={v => update("categoryId", v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Poll Type</label>
          <Select value={form.pollType} onValueChange={v => update("pollType", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="binary">Binary (Yes/No)</SelectItem>
              <SelectItem value="rating">Rating Scale</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Platform Mode</label>
          <Select value={form.pollMode} onValueChange={v => update("pollMode", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (General)</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="social">Social</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Region Scope</label>
          <Select value={form.regionScope} onValueChange={v => update("regionScope", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="national">National</SelectItem>
              <SelectItem value="wilaya">Wilaya</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.regionScope === "wilaya" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Wilaya</label>
            <Select value={form.wilayaCode} onValueChange={v => update("wilayaCode", v)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select wilaya" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {WILAYAS.map(w => (
                  <SelectItem key={w.code} value={w.name}>{w.code}. {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Closes At</label>
          <Input type="datetime-local" value={form.closesAt} onChange={e => update("closesAt", e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Tags (comma-separated)</label>
          <Input value={form.tags} onChange={e => update("tags", e.target.value)} placeholder="economy, reform, youth" className="text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
          <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Context and sourcing for this poll..." className="text-sm min-h-[80px]" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">Options (min 2) *</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="space-y-1.5 border border-border/50 rounded-lg p-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <Input value={opt.label} onChange={e => updateOptionLabel(i, e.target.value)} placeholder={`Option ${i + 1} (English)`} className="text-sm flex-1 h-8" />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
              {showTranslations && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <Input dir="rtl" value={opt.labelAr} onChange={e => updateOptionLabelAr(i, e.target.value)} placeholder="خيار بالعربية" className="text-xs h-7" />
                  <Input value={opt.labelFr} onChange={e => updateOptionLabelFr(i, e.target.value)} placeholder="Option en français" className="text-xs h-7" />
                </div>
              )}
              <div className="pl-6">
                <ImageUploadField
                  value={opt.imageUrl}
                  onChange={v => updateOptionImage(i, v)}
                  placeholder="Image URL (optional)"
                />
              </div>
            </div>
          ))}
        </div>
        {options.length < 8 && (
          <button type="button" onClick={addOption} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={11} />
            Add option
          </button>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">Cancel</Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5 border-dashed"
          disabled={createMutation.isPending}
          onClick={() => handleSubmit(false)}
        >
          <Archive size={13} />
          Save as Draft
        </Button>
        <Button
          type="button"
          size="sm"
          className="text-xs h-8 gap-1.5"
          disabled={createMutation.isPending}
          onClick={() => handleSubmit(true)}
        >
          <Globe size={13} />
          {createMutation.isPending ? "Publishing..." : "Publish Now"}
        </Button>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/users?limit=100");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (id: number, role: string) => {
    const res = await adminFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
    if (res.ok) {
      toast({ title: `Role updated to ${role}` });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } else {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const res = await adminFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (res.ok) {
      toast({ title: `Status updated to ${status}` });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    } else {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4" data-testid="section-users-admin">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={load}>
          <RefreshCw size={13} />
        </Button>
        <span className="text-xs text-muted-foreground shrink-0">{filtered.length} users</span>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="text-muted-foreground text-[10px]">@{u.username}</p>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <Select value={u.role} onValueChange={v => handleRoleChange(u.id, v)}>
                      <SelectTrigger className="h-6 text-[10px] w-20 border-0 bg-transparent p-0 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select value={u.status} onValueChange={v => handleStatusChange(u.id, v)}>
                      <SelectTrigger className="h-6 text-[10px] w-24 border-0 bg-transparent p-0 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                    {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Categories Tab ─────────────────────────────────────────────────────────────
function CategoriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories, isLoading, refetch } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", color: "#059669", icon: "circle", description: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "", description: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.color) { toast({ title: "Fill in all required fields", variant: "destructive" }); return; }
    const res = await adminFetch("/admin/categories", { method: "POST", body: JSON.stringify(form) });
    if (res.ok) {
      toast({ title: "Category created" });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      setShowCreate(false);
      setForm({ name: "", slug: "", color: "#059669", icon: "circle", description: "" });
    } else {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  };

  const handleUpdate = async (id: number) => {
    const res = await adminFetch(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(editForm) });
    if (res.ok) {
      toast({ title: "Category updated" });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      setEditId(null);
    } else {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4" data-testid="section-categories-admin">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground flex-1">Poll Categories</h2>
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowCreate(true)}>
          <Plus size={13} />
          Add Category
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => refetch()}>
          <RefreshCw size={13} />
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border border-border rounded-xl p-4 bg-card space-y-3">
          <h3 className="text-xs font-semibold text-foreground">New Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} className="text-xs h-8" />
            <Input placeholder="Slug *" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="text-xs h-8" />
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-8 w-10 rounded border border-border cursor-pointer" />
              <Input placeholder="Color hex" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="text-xs h-8 flex-1" />
            </div>
            <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-xs h-8" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="text-xs h-7 gap-1"><Plus size={11} />Create</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Slug</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Polls</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories?.map(cat => (
                <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {editId === cat.id ? (
                        <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-6 text-xs w-32" />
                      ) : (
                        <span className="font-medium text-foreground">{cat.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{cat.slug}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{cat.pollCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {editId === cat.id ? (
                        <>
                          <button onClick={() => handleUpdate(cat.id)} className="text-xs text-primary hover:underline px-2">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-muted-foreground hover:underline px-1">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditId(cat.id); setEditForm({ name: cat.name, color: cat.color, description: "" }); }} className="p-1 rounded hover:bg-muted transition-colors">
                          <PenLine size={13} className="text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Suggestions Tab ───────────────────────────────────────────────────────────
function SuggestionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [approving, setApproving] = useState<number | null>(null);

  const params = filter !== "all" ? { status: filter as any } : {};
  const { data: suggestions, isLoading } = useAdminListSuggestions(params, {
    query: { queryKey: getAdminListSuggestionsQueryKey(params) }
  });
  const reviewMutation = useAdminReviewSuggestion();

  const handleReject = (id: number) => {
    reviewMutation.mutate(
      { id, data: { status: "rejected", moderatorNote: reviewNotes[id] || null } },
      {
        onSuccess: () => {
          toast({ title: "Suggestion rejected" });
          queryClient.invalidateQueries({ queryKey: getAdminListSuggestionsQueryKey(params) });
        },
        onError: () => toast({ title: "Review failed", variant: "destructive" }),
      }
    );
  };

  const handleApproveAsPoll = async (id: number, publishNow: boolean) => {
    setApproving(id);
    try {
      const res = await adminFetch(`/admin/suggestions/${id}/approve-as-poll`, {
        method: "POST",
        body: JSON.stringify({
          publishStatus: publishNow ? "open" : "draft",
          moderatorNote: reviewNotes[id] || null,
        }),
      });
      if (res.ok) {
        toast({ title: publishNow ? "Suggestion approved and poll published" : "Suggestion approved — poll saved to Drafts" });
        queryClient.invalidateQueries({ queryKey: getAdminListSuggestionsQueryKey(params) });
      } else {
        toast({ title: "Failed to approve suggestion", variant: "destructive" });
      }
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="section-suggestions">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground flex-1">Poll Suggestions</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-suggestion-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className="border border-border rounded-xl p-4 bg-card" data-testid={`suggestion-${s.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>By {s.submittedBy.name}</span>
                    <span>{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
                    {s.proposedOptions?.length > 0 && (
                      <span>Options: {s.proposedOptions.slice(0, 3).join(", ")}</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border capitalize ${
                  s.moderationStatus === "pending" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                  : s.moderationStatus === "approved" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                }`}>
                  {s.moderationStatus}
                </span>
              </div>
              {s.moderationStatus === "pending" && (
                <div className="mt-3 flex flex-col gap-2">
                  <Textarea
                    placeholder="Moderator note (optional)..."
                    value={reviewNotes[s.id] ?? ""}
                    onChange={e => setReviewNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                    className="text-xs min-h-[56px]"
                    data-testid={`input-moderator-note-${s.id}`}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleApproveAsPoll(s.id, true)}
                      disabled={approving === s.id}
                      className="gap-1.5 text-xs h-7"
                      data-testid={`button-approve-${s.id}`}
                    >
                      <Globe size={11} />Approve & Publish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveAsPoll(s.id, false)}
                      disabled={approving === s.id}
                      className="gap-1.5 text-xs h-7 border-dashed"
                    >
                      <Archive size={11} />Approve as Draft
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(s.id)} disabled={reviewMutation.isPending} className="gap-1.5 text-xs h-7 text-destructive border-destructive/30" data-testid={`button-reject-${s.id}`}>
                      <XCircle size={11} />Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border border-border rounded-xl">
          No suggestions for this filter.
        </div>
      )}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const [filter, setFilter] = useState("pending");
  const params = filter !== "all" ? { status: filter as any } : {};
  const { data: reports, isLoading } = useAdminListReports(params, {
    query: { queryKey: getAdminListReportsQueryKey(params) }
  });

  return (
    <div className="space-y-4" data-testid="section-reports">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground flex-1">Content Reports</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-report-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : reports && reports.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          {reports.map((report, i) => (
            <div key={report.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${i > 0 ? "border-t border-border" : ""}`} data-testid={`report-${report.id}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{report.entityType} #{report.entityId}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{report.reason}</p>
                {report.note && <p className="text-xs text-muted-foreground italic mt-0.5">{report.note}</p>}
                <p className="text-xs text-muted-foreground mt-1">By {report.reportedBy.name} · {format(new Date(report.createdAt), "MMM d, yyyy")}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border capitalize shrink-0">{report.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border border-border rounded-xl">
          No reports for this filter.
        </div>
      )}
    </div>
  );
}

// ── Edit Poll Form ────────────────────────────────────────────────────────────
function EditPollForm({ pollId, categories, onClose, onSaved }: {
  pollId: number;
  categories: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    pollType: "multiple_choice",
    pollMode: "all",
    regionScope: "national",
    wilayaCode: "",
    closesAt: "",
    tags: "",
    status: "open",
  });
  const [options, setOptions] = useState<{ id?: number; label: string; labelAr: string; labelFr: string; imageUrl: string }[]>([]);
  const [showTranslations, setShowTranslations] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await adminFetch(`/admin/polls/${pollId}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          title: data.title ?? "",
          subtitle: data.subtitle ?? "",
          description: data.description ?? "",
          imageUrl: data.imageUrl ?? "",
          categoryId: String(data.categoryId ?? ""),
          pollType: data.pollType ?? "multiple_choice",
          pollMode: data.pollMode ?? "all",
          regionScope: data.regionScope ?? "national",
          wilayaCode: data.wilayaCode ?? "",
          closesAt: data.closesAt ? data.closesAt.slice(0, 16) : "",
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
          status: data.status ?? "open",
        });
        setOptions((data.options ?? []).map((o: any) => ({ id: o.id, label: o.label, labelAr: o.labelAr ?? "", labelFr: o.labelFr ?? "", imageUrl: o.imageUrl ?? "" })));
      } else {
        toast({ title: "Failed to load poll", variant: "destructive" });
        onClose();
      }
      setLoading(false);
    };
    load();
  }, [pollId]);

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));
  const updateOption = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], label: v }; return next; });
  const updateOptionLabelAr = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], labelAr: v }; return next; });
  const updateOptionLabelFr = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], labelFr: v }; return next; });
  const updateOptionImage = (i: number, v: string) => setOptions(prev => { const next = [...prev]; next[i] = { ...next[i], imageUrl: v }; return next; });
  const addOption = () => setOptions(prev => [...prev, { label: "", labelAr: "", labelFr: "", imageUrl: "" }]);
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async (publishNow?: boolean) => {
    const validOptions = options.filter(o => o.label.trim());
    if (!form.title.trim() || !form.categoryId || validOptions.length < 2) {
      toast({ title: "Fill in title, category, and at least 2 options.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body: any = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      categoryId: Number(form.categoryId),
      pollType: form.pollType,
      pollMode: form.pollMode,
      regionScope: form.regionScope,
      wilayaCode: form.regionScope === "wilaya" ? (form.wilayaCode || null) : null,
      closesAt: form.closesAt || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      status: publishNow !== undefined ? (publishNow ? "open" : "draft") : form.status,
      options: validOptions.map(o => ({
        id: o.id,
        label: o.label,
        labelAr: o.labelAr.trim() || undefined,
        labelFr: o.labelFr.trim() || undefined,
        imageUrl: o.imageUrl.trim() || undefined,
      })),
    };
    const res = await adminFetch(`/admin/polls/${pollId}`, { method: "PATCH", body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      toast({ title: publishNow === true ? "Poll published" : publishNow === false ? "Poll saved to Drafts" : "Poll updated" });
      onSaved();
    } else {
      toast({ title: "Failed to save poll", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="border border-border rounded-xl p-5 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Edit Poll</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
        </div>
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 w-full rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Edit Poll</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Question *</label>
          <Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="What should Algeria do about...?" className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Subtitle</label>
          <Input value={form.subtitle} onChange={e => update("subtitle", e.target.value)} placeholder="Optional context" className="text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Cover Image</label>
          <ImageUploadField
            value={form.imageUrl}
            onChange={v => update("imageUrl", v)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Category *</label>
          <Select value={form.categoryId} onValueChange={v => update("categoryId", v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Poll Type</label>
          <Select value={form.pollType} onValueChange={v => update("pollType", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="binary">Binary (Yes/No)</SelectItem>
              <SelectItem value="rating">Rating Scale</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Platform Mode</label>
          <Select value={form.pollMode} onValueChange={v => update("pollMode", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (General)</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="social">Social</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Region Scope</label>
          <Select value={form.regionScope} onValueChange={v => update("regionScope", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="national">National</SelectItem>
              <SelectItem value="wilaya">Wilaya</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.regionScope === "wilaya" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Wilaya</label>
            <Select value={form.wilayaCode} onValueChange={v => update("wilayaCode", v)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select wilaya" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {WILAYAS.map(w => (
                  <SelectItem key={w.code} value={w.name}>{w.code}. {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
          <Select value={form.status} onValueChange={v => update("status", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Live</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Closes At</label>
          <Input type="datetime-local" value={form.closesAt} onChange={e => update("closesAt", e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Tags (comma-separated)</label>
          <Input value={form.tags} onChange={e => update("tags", e.target.value)} placeholder="economy, reform, youth" className="text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
          <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Context and sourcing for this poll..." className="text-sm min-h-[80px]" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">Options (min 2) *</label>
          <button type="button" onClick={() => setShowTranslations(v => !v)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Globe size={11} />
            {showTranslations ? "Hide" : "Add"} Translations (AR / FR)
          </button>
        </div>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="space-y-1.5 border border-border/50 rounded-lg p-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <Input
                  value={opt.label}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1} label`}
                  className="text-sm flex-1 h-8"
                />
                {opt.id && <span className="text-[10px] text-muted-foreground shrink-0">(existing)</span>}
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
              {showTranslations && (
                <div className="flex gap-2 pl-6">
                  <Input dir="rtl" value={opt.labelAr} onChange={e => updateOptionLabelAr(i, e.target.value)} placeholder="خيار بالعربية" className="text-xs h-7" />
                  <Input value={opt.labelFr} onChange={e => updateOptionLabelFr(i, e.target.value)} placeholder="Option en français" className="text-xs h-7" />
                </div>
              )}
              <div className="pl-6">
                <ImageUploadField
                  value={opt.imageUrl}
                  onChange={v => updateOptionImage(i, v)}
                  placeholder="Image URL (optional)"
                />
              </div>
            </div>
          ))}
        </div>
        {options.length < 8 && (
          <button type="button" onClick={addOption} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={11} />
            Add option
          </button>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">Existing options with votes cannot be deleted — they will remain on the poll.</p>
      </div>

      <div className="flex gap-2 justify-end pt-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">Cancel</Button>
        {form.status === "draft" && (
          <Button type="button" size="sm" className="text-xs h-8 gap-1.5" disabled={saving} onClick={() => handleSave(true)}>
            <Globe size={13} />
            {saving ? "Publishing..." : "Publish Now"}
          </Button>
        )}
        <Button type="button" variant={form.status !== "draft" ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1.5" disabled={saving} onClick={() => handleSave()}>
          <PenLine size={13} />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ── Drafts Tab ────────────────────────────────────────────────────────────────
function DraftsTab() {
  const { toast } = useToast();
  const [editPollId, setEditPollId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch("/admin/drafts");
      if (res.ok) setDrafts(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePublish = async (id: number) => {
    const res = await adminFetch(`/admin/polls/${id}`, { method: "PATCH", body: JSON.stringify({ status: "open" }) });
    if (res.ok) {
      toast({ title: "Poll published" });
      load();
    } else {
      toast({ title: "Failed to publish", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete draft: "${title}"? This cannot be undone.`)) return;
    const res = await adminFetch(`/admin/polls/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Draft deleted" });
      load();
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4" data-testid="section-drafts">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Draft Polls</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Polls saved as drafts — not visible to the public</p>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => refetch()}>
          <RefreshCw size={13} />
        </Button>
      </div>

      {editPollId !== null && (
        <EditPollForm
          pollId={editPollId}
          categories={categories ?? []}
          onClose={() => setEditPollId(null)}
          onSaved={() => { load(); setEditPollId(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl text-sm text-muted-foreground">
          <Archive size={28} className="mx-auto mb-3 text-muted-foreground/50" />
          No drafts yet. Create a poll and choose "Save as Draft" to store it here.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Poll</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drafts.map(poll => (
                <tr key={poll.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="font-medium text-foreground truncate">{poll.title}</p>
                    {poll.subtitle && <p className="text-muted-foreground truncate mt-0.5">{poll.subtitle}</p>}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{poll.category.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditPollId(poll.id)} className="p-1 rounded hover:bg-muted transition-colors" title="Edit">
                        <Pencil size={13} className="text-muted-foreground" />
                      </button>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => handlePublish(poll.id)}
                      >
                        <Globe size={10} />Publish
                      </Button>
                      <button onClick={() => handleDelete(poll.id, poll.title)} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Delete">
                        <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────
const FEEDBACK_CATEGORY_COLORS: Record<string, string> = {
  bug: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  feature: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  content: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  general: "text-slate-600 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700",
};

function FeedbackTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const res = await adminFetch("/admin/feedback");
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    } else {
      toast({ title: "Failed to load feedback", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? items : items.filter(f => f.category === filter);

  return (
    <div className="space-y-4" data-testid="section-feedback">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">User Feedback</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} submission{items.length !== 1 ? "s" : ""} received</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="feature">Features</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={load}>
            <RefreshCw size={13} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl text-sm text-muted-foreground">
          <MessageCircle size={28} className="mx-auto mb-3 text-muted-foreground/50" />
          No feedback yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <div key={item.id} className="border border-border rounded-xl p-4 bg-card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide ${FEEDBACK_CATEGORY_COLORS[item.category] ?? FEEDBACK_CATEGORY_COLORS.general}`}>
                    {item.category}
                  </span>
                  {item.name && <span className="text-xs font-medium text-foreground">{item.name}</span>}
                  {item.email && <span className="text-xs text-muted-foreground">&lt;{item.email}&gt;</span>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {item.createdAt ? format(new Date(item.createdAt), "MMM d, HH:mm") : ""}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
