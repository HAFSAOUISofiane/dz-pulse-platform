import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useRegisterUser } from "@workspace/api-client-react";
import { DzPulseLogo } from "@/components/ui/dzpulse-logo";
import { GoogleSignInButton } from "@/components/ui/google-sign-in-button";
import { WILAYAS } from "@/lib/wilayas";
import { useLang } from "@/lib/language-context";
import { ChevronDown, ChevronUp } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  wilaya: z.string().optional(),
  ageRange: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
const AGE_RANGES = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"];

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const registerMutation = useRegisterUser();
  const [showOptional, setShowOptional] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", username: "", email: "", password: "", wilaya: "", ageRange: "" },
  });

  const onSubmit = (values: FormValues) => {
    registerMutation.mutate(
      {
        data: {
          name: values.name,
          username: values.username,
          email: values.email,
          password: values.password,
          wilaya: values.wilaya || null,
          ageRange: values.ageRange || null,
        },
      },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          toast({ title: "Welcome to DzPulse, " + data.user.name + "!" });
          const returnTo = localStorage.getItem("dzpulse_return_to") ?? "/";
          localStorage.removeItem("dzpulse_return_to");
          navigate(returnTo);
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err?.message ?? "Please try again",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <AppShell hideFooter>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12" data-testid="page-register">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <DzPulseLogo size={36} />
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">{t.createAccount}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.joinAlgerianOpinion}</p>
            </div>
          </div>

          {/* What you can do */}
          <div className="bg-muted/40 border border-border rounded-lg px-4 py-3 mb-5 text-xs text-muted-foreground flex flex-col gap-1">
            <p className="font-medium text-foreground text-xs mb-1">After signing up you can:</p>
            <div className="flex flex-col gap-0.5">
              <span>• {t.voteOnLivePolls}</span>
              <span>• {t.joinDiscussion}</span>
              <span>• {t.submitaPoll}</span>
            </div>
          </div>

          {/* Google SSO */}
          <div className="mb-4">
            <GoogleSignInButton label={t.continueWithGoogle} />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t.orCreateWithEmail}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="border border-border rounded-xl p-6 bg-card shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Core fields */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.name}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your name" data-testid="input-name" autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.username}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="your_username" data-testid="input-username" autoComplete="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.email}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" data-testid="input-email" autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.password}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Min. 8 characters" data-testid="input-password" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Optional profile fields toggle */}
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {showOptional ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showOptional ? t.hideOptionalDetails : t.showOptionalDetails}
                </button>

                {showOptional && (
                  <>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Sharing your wilaya and age range helps us show you how opinion varies by region and demographic. This is optional and displayed only in aggregated form.
                    </p>
                    <FormField
                      control={form.control}
                      name="wilaya"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.wilayaOptional}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-wilaya">
                                <SelectValue placeholder="Select your wilaya" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WILAYAS.map((w) => (
                                <SelectItem key={w.code} value={w.code}>{w.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ageRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.ageRange} <span className="text-muted-foreground font-normal">({t.optional})</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-age-range">
                                <SelectValue placeholder="Select your age range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AGE_RANGES.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" disabled={registerMutation.isPending} className="mt-2" data-testid="button-submit-register">
                  {registerMutation.isPending ? t.creating : t.createAccount}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t.alreadyHaveAccount}{" "}
            <Link href="/login" data-testid="link-to-login">
              <span className="text-primary cursor-pointer hover:underline font-medium">{t.signIn}</span>
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {t.bySigningIn}{" "}
            <Link href="/methodology#terms"><span className="hover:underline cursor-pointer">{t.termsOfUse}</span></Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
