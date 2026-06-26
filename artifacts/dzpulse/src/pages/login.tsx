import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLoginUser } from "@workspace/api-client-react";
import { DzPulseLogo } from "@/components/ui/dzpulse-logo";
import { GoogleSignInButton } from "@/components/ui/google-sign-in-button";
import { getGoogleOAuthErrorMessage } from "@/lib/google-oauth-errors";
import { useLang } from "@/lib/language-context";
import { Shield, BarChart2, MessageSquare } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const loginMutation = useLoginUser();

  const SIGNIN_BENEFITS = [
    { icon: <BarChart2 size={13} />, text: t.voteOnLivePolls },
    { icon: <MessageSquare size={13} />, text: t.joinDiscussion },
    { icon: <Shield size={13} />, text: t.oneVoteFair },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      const description = getGoogleOAuthErrorMessage(error);
      toast({ title: "Sign in failed", description, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          toast({ title: "Welcome back, " + data.user.name });
          const returnTo = localStorage.getItem("dzpulse_return_to") ?? "/";
          localStorage.removeItem("dzpulse_return_to");
          navigate(returnTo);
        },
        onError: (err: any) => {
          toast({
            title: "Sign in failed",
            description: err?.message ?? "Invalid email or password",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <AppShell hideFooter>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12" data-testid="page-login">
        <div className="w-full max-w-sm">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <DzPulseLogo size={36} />
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">{t.signInToDzPulse}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.liveOpinionAlgeria}</p>
            </div>
          </div>

          {/* Why sign in */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {SIGNIN_BENEFITS.map((b) => (
              <div key={b.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-primary">{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>

          {/* Google SSO */}
          <div className="mb-4">
            <GoogleSignInButton label={t.continueWithGoogle} />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t.orSignInWithEmail}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="border border-border rounded-xl p-6 bg-card shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                        <Input {...field} type="password" placeholder="••••••••" data-testid="input-password" autoComplete="current-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loginMutation.isPending} className="mt-2" data-testid="button-submit-login">
                  {loginMutation.isPending ? t.signingIn : t.signIn}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t.dontHaveAccount}{" "}
            <Link href="/register" data-testid="link-to-register">
              <span className="text-primary cursor-pointer hover:underline font-medium">{t.createOneFree}</span>
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-3">
            {t.bySigningIn}{" "}
            <Link href="/methodology#terms"><span className="hover:underline cursor-pointer">{t.termsOfUse}</span></Link>
            {" "}&{" "}
            <Link href="/methodology#privacy"><span className="hover:underline cursor-pointer">{t.privacyPolicy}</span></Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
