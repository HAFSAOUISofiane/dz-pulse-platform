import { Link } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="text-center" data-testid="page-not-found">
          <p className="text-7xl font-bold text-primary/20 mb-4">404</p>
          <h1 className="text-xl font-bold text-foreground mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
          <Link href="/" data-testid="link-back-home">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
