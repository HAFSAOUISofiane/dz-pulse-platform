import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/language-context";
import { Link } from "wouter";
import {
  useListCategories,
  useSubmitSuggestion,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";

const formSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  categoryId: z.string().min(1, "Please select a category"),
  regionRelevance: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const POLL_TEMPLATES = [
  {
    emoji: "🎓",
    label: "Education",
    title: "How would you rate the quality of Algeria's public university system?",
    description: "Higher education standards, access, and graduate employment outcomes in Algeria today.",
    options: ["Excellent", "Good", "Needs improvement", "Poor", "Very poor"],
    category: "society",
  },
  {
    emoji: "📊",
    label: "Economic",
    title: "How would you rate Algeria's current economic situation?",
    description: "Public sentiment about wages, inflation, and living standards in Algeria today.",
    options: ["Very good", "Good", "Fair", "Poor", "Very poor"],
    category: "economy",
  },
  {
    emoji: "🏆",
    label: "Best of DZ",
    title: "What is Algeria's greatest natural landmark?",
    description: "Celebrating Algeria's natural beauty and cultural pride.",
    options: ["Sahara Desert", "Kabylie mountains", "Ahaggar National Park", "Mediterranean coast"],
    category: "society",
  },
  {
    emoji: "⚽",
    label: "Sports",
    title: "Can the Fennec Foxes qualify for the 2026 World Cup?",
    description: "Algerian football sentiment ahead of the qualification campaign.",
    options: ["Yes, definitely", "Yes, but it will be hard", "Unlikely", "No chance"],
    category: "sports",
  },
  {
    emoji: "✅",
    label: "Yes / No",
    title: "Do you support privatization of state enterprises in Algeria?",
    description: "A classic agree/disagree on a major policy debate.",
    options: ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"],
    category: "economy",
  },
];

export default function SubmitPage() {
  const { toast } = useToast();
  const { t } = useLang();
  const [options, setOptions] = useState(["", ""]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sourceLinks, setSourceLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pollMode, setPollMode] = useState<"all" | "professional" | "social">("all");
  const [showTemplates, setShowTemplates] = useState(true);

  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const submitMutation = useSubmitSuggestion();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", categoryId: "", regionRelevance: "" },
  });

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) setTags([...tags, trimmedTag]);
    setTagInput("");
  };

  const addLink = () => {
    const l = linkInput.trim();
    if (l && !sourceLinks.includes(l)) setSourceLinks([...sourceLinks, l]);
    setLinkInput("");
  };

  const onSubmit = (values: FormValues) => {
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      toast({ title: "At least 2 options are required", variant: "destructive" });
      return;
    }

    submitMutation.mutate(
      {
        data: {
          title: values.title,
          description: values.description,
          categoryId: Number(values.categoryId),
          proposedOptions: validOptions,
          tags,
          sourceLinks,
          regionRelevance: values.regionRelevance || null,
          pollMode,
        } as any,
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err: any) => {
          toast({
            title: "Submission failed",
            description: err?.message ?? "Please try again",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (submitted) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-20 text-center" data-testid="section-submit-success">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-primary text-xl font-bold">✓</span>
          </div>
          <h2 className="text-base font-semibold text-foreground mb-2">{t.submitPoll} submitted</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your suggestion is under review by our moderators. We'll add it to DzPulse if it meets our editorial standards.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/polls"><Button data-testid="link-explore-polls">{t.explorePolls}</Button></Link>
            <Button variant="outline" onClick={() => { setSubmitted(false); form.reset(); setOptions(["", ""]); setTags([]); setSourceLinks([]); }} data-testid="button-submit-another">
              Submit Another
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-submit-heading">{t.submitaPoll}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Have a question you'd like Algerians to weigh in on? Submit it for review.
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            All suggestions are reviewed by our moderation team before publication. We prioritize polls that are civic, relevant, fair, and non-partisan.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 mb-6">
          <Lock size={15} className="text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Want a private poll instead?</p>
            <p className="text-xs text-muted-foreground">No review needed — goes live instantly, only accessible via a shareable link.</p>
          </div>
          <Link href="/polls/create">
            <Button size="sm" variant="outline" className="shrink-0 text-xs h-7">Create Private Poll</Button>
          </Link>
        </div>

        {/* ── Poll templates ── */}
        <div className="mb-6">
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-foreground group"
            onClick={() => setShowTemplates(v => !v)}
          >
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              Start from a template
            </span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              {showTemplates ? "Hide" : "Show"}
            </span>
          </button>
          {showTemplates && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POLL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    form.setValue("title", tpl.title);
                    form.setValue("description", tpl.description);
                    setOptions(tpl.options);
                    setShowTemplates(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    toast({ title: `Template "${tpl.label}" loaded`, description: "Edit the question and options as needed." });
                  }}
                  className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-lg">{tpl.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{tpl.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{tpl.title}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border border-dashed border-border bg-transparent hover:border-primary/30 transition-all text-left"
              >
                <span className="text-lg">✏️</span>
                <span className="text-xs font-semibold text-foreground">Start blank</span>
                <span className="text-[10px] text-muted-foreground">Write your own poll from scratch</span>
              </button>
            </div>
          )}
          {!showTemplates && (
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              ← Choose a different template
            </button>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poll Question</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Should Algeria invest more in renewable energy?" data-testid="input-poll-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context & Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Provide background context for this poll..." className="min-h-[100px]" data-testid="input-poll-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.category}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-poll-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform Mode */}
            <div>
              <label className="mb-2 block text-sm font-medium">Platform Mode</label>
              <div className="flex gap-2">
                {(["all", "professional", "social"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPollMode(m)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      pollMode === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {m === "all" ? "All (General)" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {pollMode === "professional" && "Economy, business, technology & startups."}
                {pollMode === "social" && "Society, health, youth & sports."}
                {pollMode === "all" && "Visible in all platform modes."}
              </p>
            </div>

            {/* Poll Options */}
            <div>
              <label className="mb-2 block text-sm font-medium">Answer Options <span className="text-muted-foreground font-normal">(min 2)</span></label>
              <div className="flex flex-col gap-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      data-testid={`input-option-${idx}`}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-option-${idx}`}
                        className="shrink-0"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 8 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOptions([...options, ""])}
                    className="w-full gap-1 text-xs"
                    data-testid="button-add-option"
                  >
                    <Plus size={13} />
                    Add option
                  </Button>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-sm font-medium">Tags <span className="text-muted-foreground font-normal">({t.optional})</span></label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag and press Enter"
                  data-testid="input-tag"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag} data-testid="button-add-tag">Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md border border-border">
                      {tag}
                      <button type="button" onClick={() => setTags(tags.filter(item => item !== tag))} data-testid={`button-remove-tag-${tag}`}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Source Links */}
            <div>
              <label className="mb-2 block text-sm font-medium">Source Links <span className="text-muted-foreground font-normal">({t.optional})</span></label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://..."
                  data-testid="input-source-link"
                />
                <Button type="button" variant="outline" size="sm" onClick={addLink} data-testid="button-add-link">Add</Button>
              </div>
              {sourceLinks.map((link) => (
                <div key={link} className="flex items-center justify-between text-xs text-primary bg-muted rounded px-2 py-1 mb-1">
                  <span className="truncate">{link}</span>
                  <button type="button" onClick={() => setSourceLinks(sourceLinks.filter(l => l !== link))}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={submitMutation.isPending} data-testid="button-submit-suggestion">
              {submitMutation.isPending ? "Submitting..." : t.submitPoll}
            </Button>
          </form>
        </Form>
      </div>
    </AppShell>
  );
}
