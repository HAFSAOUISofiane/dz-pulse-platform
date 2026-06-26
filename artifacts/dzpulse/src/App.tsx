import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { PlatformModeProvider } from "@/lib/platform-mode-context";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import PollsPage from "@/pages/polls";
import PollDetailPage from "@/pages/poll-detail";
import SubmitPage from "@/pages/submit";
import AdminPage from "@/pages/admin";
import ProfilePage from "@/pages/profile";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AuthCallbackPage from "@/pages/auth-callback";
import TopicsPage from "@/pages/topics";
import MethodologyPage from "@/pages/methodology";
import AboutPage from "@/pages/about";
import FeedbackPage from "@/pages/feedback";
import CreatePrivatePollPage from "@/pages/create-private-poll";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/polls" component={PollsPage} />
      <Route path="/polls/create" component={CreatePrivatePollPage} />
      <Route path="/polls/:slug" component={PollDetailPage} />
      <Route path="/topics" component={TopicsPage} />
      <Route path="/methodology" component={MethodologyPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/submit" component={SubmitPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/profile/:username" component={ProfilePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <PlatformModeProvider>
            <AuthProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </AuthProvider>
          </PlatformModeProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
