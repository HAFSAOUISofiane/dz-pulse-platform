import { Link } from "wouter";
import { ArrowRight, Shield, Globe, BarChart2, User, Heart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DzPulseLogo } from "@/components/ui/dzpulse-logo";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Brand block */}
        <div className="flex items-center gap-3 mb-8">
          <DzPulseLogo size={40} />
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-about-heading">About DzPulse</h1>
            <p className="text-sm text-muted-foreground">Opinion intelligence for Algeria</p>
          </div>
        </div>

        {/* One-person project note */}
        <div className="mb-10 border border-primary/20 rounded-xl p-5 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">A one-person project</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            DzPulse was built entirely by one person — with a clear vision: to give Algeria a structured, transparent space where public opinion can be heard, measured, and understood.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The idea is simple but the potential is enormous. Citizens, institutions, journalists, researchers, and decision-makers all benefit when they can see what people genuinely think — not what algorithms promote, not what headlines claim, but the actual distribution of opinion across the country.
          </p>
        </div>

        {/* Vision */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-foreground mb-3">The vision</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Algeria is a country of 46 million people with rich, diverse, and often unheard perspectives. DzPulse exists to give those perspectives a voice — organised by topic, verified for fairness, and open to everyone.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            This platform was built for the greater good of the country. It is not designed for profit, political influence, or entertainment. It is designed to clarify: to cut through noise and show, as clearly as possible, what Algerians actually think about the things that matter.
          </p>
          <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
            <Heart size={14} className="text-primary mt-0.5 shrink-0" />
            <span>Every entity — businesses, media, NGOs, researchers, and public officials — can use DzPulse to understand public sentiment without guessing. When people know where opinion stands, better decisions follow.</span>
          </div>
        </div>

        {/* Principles */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-foreground mb-4">Our principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Shield size={16} className="text-primary" />,
                title: "Integrity first",
                desc: "One vote per person. Anonymous participation. No manipulation. Every voice counts equally.",
              },
              {
                icon: <Globe size={16} className="text-primary" />,
                title: "Algeria-focused",
                desc: "Every poll is grounded in Algerian public life — economy, politics, youth, culture, and society.",
              },
              {
                icon: <BarChart2 size={16} className="text-primary" />,
                title: "Editorial standards",
                desc: "All questions are reviewed for fairness, neutrality, and civic relevance before publication.",
              },
            ].map((p) => (
              <div key={p.title} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  {p.icon}
                  <span className="text-sm font-semibold text-foreground">{p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What DzPulse is not */}
        <div className="mb-10 border border-border rounded-lg p-5 bg-muted/20">
          <h2 className="text-sm font-semibold text-foreground mb-3">What DzPulse is not</h2>
          <ul className="flex flex-col gap-2">
            {[
              "Not a prediction market or trading platform",
              "Not a scientific polling or research organisation",
              "Not affiliated with any political party or government body",
              "Not a social media platform or news source",
              "Not funded by advertising or external investors",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How voting works */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-foreground mb-3">How voting works</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Anyone can vote — no account required. Each person gets one vote per poll, tracked anonymously. If you choose to share your wilaya, your vote contributes to regional breakdowns that help show how opinion varies across Algeria.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To suggest new poll questions or join the discussion, a free account is required. Registering takes under a minute and gives you a full civic profile on the platform.
          </p>
        </div>

        {/* Participate */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-foreground mb-3">Participate</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Voting is open to everyone. Create a free account to join discussions, submit poll ideas, and build your civic profile on the platform. There is no cost, no premium tier, and no advertising.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/polls">
              <Button className="gap-2">
                Explore polls
                <ArrowRight size={14} />
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Create account</Button>
            </Link>
          </div>
        </div>

        {/* Links */}
        <div className="border-t border-border pt-6 flex flex-wrap gap-4">
          <Link href="/methodology"><span className="text-xs text-primary hover:underline cursor-pointer">Methodology</span></Link>
          <Link href="/methodology#editorial"><span className="text-xs text-primary hover:underline cursor-pointer">Editorial Standards</span></Link>
          <Link href="/methodology#voting"><span className="text-xs text-primary hover:underline cursor-pointer">How Voting Works</span></Link>
          <Link href="/methodology#privacy"><span className="text-xs text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>
          <Link href="/methodology#terms"><span className="text-xs text-primary hover:underline cursor-pointer">Terms of Use</span></Link>
        </div>
      </div>
    </AppShell>
  );
}
