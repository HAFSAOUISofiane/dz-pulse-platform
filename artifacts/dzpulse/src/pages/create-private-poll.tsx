import { useState } from "react";
import { Plus, X, Copy, Check, ExternalLink, Globe, Archive, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { WILAYAS } from "@/lib/wilayas";

function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("dzpulse_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  return fetch(`${BASE}/api${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
}

type OptionRow = { label: string; labelAr: string; labelFr: string; imageUrl: string };

export default function CreatePrivatePollPage() {
  const { toast } = useToast();
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

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
    pollLanguage: "en",
    pollMode: "all",
    regionScope: "national",
    wilayaCode: "",
    tags: "",
    closesAt: "",
  });
  const [options, setOptions] = useState<OptionRow[]>([
    { label: "", labelAr: "", labelFr: "", imageUrl: "" },
    { label: "", labelAr: "", labelFr: "", imageUrl: "" },
  ]);
  const [showTranslations, setShowTranslations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<{ slug: string; title: string; status: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const updateOption = (i: number, field: keyof OptionRow, v: string) =>
    setOptions((prev) => { const next = [...prev]; next[i] = { ...next[i], [field]: v }; return next; });
  const addOption = () => setOptions((prev) => [...prev, { label: "", labelAr: "", labelFr: "", imageUrl: "" }]);
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (publishNow: boolean) => {
    const validOptions = options.filter((o) => o.label.trim());
    if (!form.title.trim()) {
      toast({ title: "A poll question is required", variant: "destructive" }); return;
    }
    if (!form.categoryId) {
      toast({ title: "Please select a category", variant: "destructive" }); return;
    }
    if (validOptions.length < 2) {
      toast({ title: "At least 2 answer options are required", variant: "destructive" }); return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/polls/create-private", {
        method: "POST",
        body: JSON.stringify({
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
          wilayaCode: form.regionScope === "wilaya" ? form.wilayaCode || undefined : undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          closesAt: form.closesAt || undefined,
          status: publishNow ? "open" : "draft",
          options: validOptions.map((o) => ({
            label: o.label.trim(),
            labelAr: o.labelAr.trim() || undefined,
            labelFr: o.labelFr.trim() || undefined,
            imageUrl: o.imageUrl.trim() || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Failed to create poll", variant: "destructive" });
        return;
      }
      setCreated({ slug: data.poll.slug, title: data.poll.title, status: data.poll.status });
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollUrl = created
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/polls/${created.slug}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(pollUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setCreated(null);
    setForm({
      pollMode: "all",
      title: "", titleAr: "", titleFr: "", subtitle: "", subtitleAr: "", subtitleFr: "",
      description: "", descriptionAr: "", descriptionFr: "", imageUrl: "",
      categoryId: "", pollType: "multiple_choice", pollLanguage: "en",
      regionScope: "national", wilayaCode: "", tags: "", closesAt: "",
    });
    setOptions([
      { label: "", labelAr: "", labelFr: "", imageUrl: "" },
      { label: "", labelAr: "", labelFr: "", imageUrl: "" },
    ]);
    setShowTranslations(false);
  };

  if (created) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Globe size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            {created.status === "draft" ? "Poll saved as draft!" : "Poll created!"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {created.status === "draft"
              ? "Your poll is saved as a draft and is not yet visible to voters."
              : "Your poll is live. Share the link below to collect responses — no account needed to vote."}
          </p>

          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-muted-foreground mb-1">Poll link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-foreground font-mono break-all">{pollUrl}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                title="Copy link"
              >
                {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} className="text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {created.status === "open" && (
              <a href={pollUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-1.5">
                  <ExternalLink size={14} />
                  Open Poll
                </Button>
              </a>
            )}
            <Button variant="outline" onClick={resetForm}>Create Another</Button>
            <Link href="/polls"><Button variant="ghost">Explore Public Polls</Button></Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Create a Poll</h1>
          <p className="text-sm text-muted-foreground">
            Your poll goes live instantly and is only accessible to people who have the link — it won't appear in any public listing. No account required.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* ── Core Fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Poll Question *</label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. What's the best city in Algeria?"
                data-testid="input-private-poll-title"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Poll Language</label>
              <Select value={form.pollLanguage} onValueChange={(v) => update("pollLanguage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-full gap-1.5 text-xs"
                onClick={() => setShowTranslations((v) => !v)}
              >
                {showTranslations ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showTranslations ? "Hide" : "Add"} Translations (AR / FR)
              </Button>
            </div>

            {showTranslations && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title – Arabic</label>
                  <Input dir="rtl" value={form.titleAr} onChange={(e) => update("titleAr", e.target.value)} placeholder="العنوان بالعربية" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title – French</label>
                  <Input value={form.titleFr} onChange={(e) => update("titleFr", e.target.value)} placeholder="Titre en français" />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Subtitle <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="Optional context line" />
            </div>

            {showTranslations && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subtitle – Arabic</label>
                  <Input dir="rtl" value={form.subtitleAr} onChange={(e) => update("subtitleAr", e.target.value)} placeholder="العنوان الفرعي" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subtitle – French</label>
                  <Input value={form.subtitleFr} onChange={(e) => update("subtitleFr", e.target.value)} placeholder="Sous-titre en français" />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Cover Image <span className="text-muted-foreground font-normal">(optional)</span></label>
              <ImageUploadField
                value={form.imageUrl}
                onChange={(v) => update("imageUrl", v)}
                placeholder="https://... (used in share cards)"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Category *</label>
              <Select value={form.categoryId} onValueChange={(v) => update("categoryId", v)}>
                <SelectTrigger data-testid="select-private-poll-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Poll Type</label>
              <Select value={form.pollType} onValueChange={(v) => update("pollType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="binary">Binary (Yes / No)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Platform Mode</label>
              <Select value={form.pollMode} onValueChange={(v) => update("pollMode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (General)</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Region Scope</label>
              <Select value={form.regionScope} onValueChange={(v) => update("regionScope", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="wilaya">Wilaya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.regionScope === "wilaya" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Wilaya</label>
                <Select value={form.wilayaCode} onValueChange={(v) => update("wilayaCode", v)}>
                  <SelectTrigger><SelectValue placeholder="Select wilaya" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {WILAYAS.map((w) => (
                      <SelectItem key={w.code} value={w.name}>{w.code}. {w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Close Date <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input type="datetime-local" value={form.closesAt} onChange={(e) => update("closesAt", e.target.value)} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(comma-separated, optional)</span></label>
              <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="economy, reform, youth" />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Provide context or background for this poll..."
                className="min-h-[80px]"
              />
            </div>

            {showTranslations && (
              <>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description – Arabic</label>
                  <Textarea dir="rtl" value={form.descriptionAr} onChange={(e) => update("descriptionAr", e.target.value)} placeholder="وصف الاستطلاع" className="min-h-[60px]" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description – French</label>
                  <Textarea value={form.descriptionFr} onChange={(e) => update("descriptionFr", e.target.value)} placeholder="Description en français" className="min-h-[60px]" />
                </div>
              </>
            )}
          </div>

          {/* ── Answer Options ── */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Answer Options * <span className="text-muted-foreground font-normal">(min 2)</span>
            </label>
            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => (
                <div key={idx} className="border border-border/50 rounded-lg p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 h-8 text-sm"
                      data-testid={`input-private-option-${idx}`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                  {showTranslations && (
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <Input
                        dir="rtl"
                        value={opt.labelAr}
                        onChange={(e) => updateOption(idx, "labelAr", e.target.value)}
                        placeholder="خيار بالعربية"
                        className="text-xs h-7"
                      />
                      <Input
                        value={opt.labelFr}
                        onChange={(e) => updateOption(idx, "labelFr", e.target.value)}
                        placeholder="Option en français"
                        className="text-xs h-7"
                      />
                    </div>
                  )}
                  <div className="pl-7">
                    <ImageUploadField
                      value={opt.imageUrl}
                      onChange={(v) => updateOption(idx, "imageUrl", v)}
                      placeholder="Option image URL (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={11} />
                Add option
              </button>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="gap-1.5"
              data-testid="button-create-private-poll"
            >
              <Globe size={14} />
              {isSubmitting ? "Creating..." : "Publish Now"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="gap-1.5 border-dashed"
            >
              <Archive size={14} />
              Save as Draft
            </Button>
            <Link href="/submit">
              <Button variant="ghost" className="text-sm text-muted-foreground">
                Submit for public review instead
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
