import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/language-context";

export default function FeedbackPage() {
  const { toast } = useToast();
  const { t } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "general",
    message: "",
  });

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) {
      toast({ title: "Please enter your message.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          email: form.email.trim() || undefined,
          category: form.category,
          message: form.message.trim(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast({ title: "Failed to send feedback. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-12">
        {submitted ? (
          <div className="text-center py-16 space-y-4">
            <CheckCircle2 size={40} className="mx-auto text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Thank you for your feedback!</h2>
            <p className="text-sm text-muted-foreground">Your message has been received and will be reviewed by our team.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => { setSubmitted(false); setForm({ name: "", email: "", category: "general", message: "" }); }}
            >
              Send another message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={18} className="text-primary" />
                <h1 className="text-lg font-semibold text-foreground">Send Feedback</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Report a bug, suggest a feature, or share any thoughts about DzPulse. All submissions are read by our team.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <Select value={form.category} onValueChange={v => update("category", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="content">Content Issue</SelectItem>
                  <SelectItem value="general">General Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Name (optional)</label>
                <Input
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                  placeholder="Your name"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email (optional)</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => update("email", e.target.value)}
                  placeholder="your@email.com"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Message *</label>
              <Textarea
                value={form.message}
                onChange={e => update("message", e.target.value)}
                placeholder="Describe your feedback in detail..."
                className="text-sm min-h-[120px]"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Feedback"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
