import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getGoogleOAuthErrorMessage } from "@/lib/google-oauth-errors";

const params = new URLSearchParams(window.location.search);
const callbackToken = params.get("token");
const callbackError = params.get("error");

if (callbackToken) {
  localStorage.setItem("dzpulse_token", callbackToken);
}

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const meQuery = useGetMe({
    query: {
      enabled: !!callbackToken,
      retry: 4,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  });

  useEffect(() => {
    if (callbackError) {
      toast({ title: "Sign in failed", description: getGoogleOAuthErrorMessage(callbackError), variant: "destructive" });
      navigate("/login");
    } else if (!callbackToken) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    if (meQuery.data && callbackToken) {
      login(callbackToken, meQuery.data as any);
      const returnTo = localStorage.getItem("dzpulse_return_to") ?? "/";
      localStorage.removeItem("dzpulse_return_to");
      navigate(returnTo);
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (meQuery.isError) {
      localStorage.removeItem("dzpulse_token");
      toast({ title: "Sign in failed", description: "Could not verify your account.", variant: "destructive" });
      navigate("/login");
    }
  }, [meQuery.isError]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="text-muted-foreground text-sm">
          {meQuery.failureCount > 0
            ? `Retrying… (${meQuery.failureCount}/4)`
            : "Completing sign-in…"}
        </div>
      </div>
    </div>
  );
}
