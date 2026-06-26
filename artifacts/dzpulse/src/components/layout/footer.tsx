import { Link } from "wouter";
import { DzPulseLogo } from "@/components/ui/dzpulse-logo";

const PRODUCT_LINKS = [
  { href: "/polls", label: "Explore Polls" },
  { href: "/topics", label: "Topics" },
  { href: "/submit", label: "Submit a Poll" },
];

const TRUST_LINKS = [
  { href: "/methodology", label: "Methodology" },
  { href: "/methodology#editorial", label: "Editorial Standards" },
  { href: "/methodology#voting", label: "How Voting Works" },
  { href: "/methodology#guidelines", label: "Community Guidelines" },
];

const LEGAL_LINKS = [
  { href: "/methodology#privacy", label: "Privacy Policy" },
  { href: "/methodology#terms", label: "Terms of Use" },
  { href: "/methodology#report", label: "Report Abuse" },
];

const ABOUT_LINKS = [
  { href: "/about", label: "About DzPulse" },
  { href: "/methodology", label: "Our Approach" },
  { href: "/submit", label: "Contribute" },
  { href: "/feedback", label: "Send Feedback" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer mb-3">
                <DzPulseLogo size={24} />
                <span className="font-semibold text-sm text-foreground">DzPulse</span>
              </div>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Opinion intelligence for Algeria. Civic, transparent, editorially reviewed.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Product</h4>
            <ul className="flex flex-col gap-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Trust</h4>
            <ul className="flex flex-col gap-2">
              {TRUST_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Legal</h4>
            <ul className="flex flex-col gap-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">About</h4>
            <ul className="flex flex-col gap-2">
              {ABOUT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DzPulse. Public opinion, organized.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Algeria-focused · Non-partisan · Editorially reviewed</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
