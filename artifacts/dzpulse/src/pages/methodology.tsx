import { Link } from "wouter";
import { Shield, CheckCircle, BarChart2, Globe, Lock, AlertTriangle, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

const SECTIONS = [
  {
    id: "editorial",
    icon: <BookOpen size={16} />,
    title: "Editorial Standards",
    content: [
      {
        heading: "How polls are selected",
        body: "DzPulse polls are proposed, reviewed, and approved by an editorial team before publication. We prioritize questions that are civic-minded, relevant to Algerian public life, factually grounded, and worded in a neutral and fair manner. We reject questions that are partisan, inflammatory, legally sensitive without proper framing, or designed to push a particular viewpoint.",
      },
      {
        heading: "Language and neutrality",
        body: "All poll questions are reviewed for linguistic neutrality. Options are designed to represent a fair range of viewpoints without leading the respondent. We use clear, accessible language in French and Arabic where appropriate.",
      },
      {
        heading: "Topic diversity",
        body: "We maintain a balanced distribution across topic categories including politics, economy, youth, health, environment, sports, and society. No single topic cluster dominates the platform.",
      },
    ],
  },
  {
    id: "voting",
    icon: <CheckCircle size={16} />,
    title: "How Voting Works",
    content: [
      {
        heading: "One vote per account",
        body: "Each registered user may cast exactly one vote per poll. Votes cannot be changed after submission. This prevents vote manipulation and ensures each person's voice counts equally.",
      },
      {
        heading: "Anonymous participation",
        body: "Individual votes are never publicly linked to a user's profile or identity. Results are displayed in aggregate form only. We do not sell or share individual voting data.",
      },
      {
        heading: "Live results",
        body: "Results update in real time as votes come in. You can see the current distribution immediately after casting your vote. Results are not adjusted, weighted, or modeled — what you see is the raw count.",
      },
      {
        heading: "Scientific limitations",
        body: "DzPulse polls are self-selected and open to all registered users. They do not constitute scientific surveys or probability samples. Results reflect the opinions of our registered user base and should be interpreted accordingly.",
      },
    ],
  },
  {
    id: "integrity",
    icon: <Shield size={16} />,
    title: "Vote Integrity",
    content: [
      {
        heading: "Account verification",
        body: "To vote, users must register with a valid email address. Our system tracks vote records by account to prevent duplicate voting.",
      },
      {
        heading: "Abuse prevention",
        body: "We monitor for patterns consistent with coordinated vote manipulation, bot activity, or other forms of abuse. Accounts found to be in violation of our integrity standards may have their votes removed or their accounts suspended.",
      },
      {
        heading: "Transparency",
        body: "We publish the total vote count and option breakdown for every poll. We do not hide, filter, or adjust results after publication. If a poll is closed or archived for integrity reasons, we note this publicly.",
      },
    ],
  },
  {
    id: "guidelines",
    icon: <Globe size={16} />,
    title: "Community Guidelines",
    content: [
      {
        heading: "Discussion standards",
        body: "Comments on DzPulse must be civic, respectful, and relevant to the poll topic. Harassment, hate speech, spam, and disinformation are not permitted. Repeat violations result in account restrictions.",
      },
      {
        heading: "Reporting",
        body: "Users can report polls or comments that violate our guidelines. All reports are reviewed by our moderation team. We aim to respond to all reports within 48 hours.",
      },
      {
        heading: "Suggestions",
        body: "Poll suggestions from users are welcome. They are reviewed for fairness, relevance, and neutrality before any consideration for publication. Submitting a suggestion does not guarantee publication.",
      },
    ],
  },
  {
    id: "privacy",
    icon: <Lock size={16} />,
    title: "Privacy Policy",
    content: [
      {
        heading: "Data we collect",
        body: "We collect your name, username, email address, and optional profile information (wilaya, age range). We store your voting record to enforce the one-vote-per-poll rule. We do not collect financial data or sensitive personal information.",
      },
      {
        heading: "How we use your data",
        body: "Your data is used to operate the platform, enforce voting integrity, and display aggregated analytics. We do not sell your data to third parties. We may use anonymised, aggregated data for research or public reporting purposes.",
      },
      {
        heading: "Data retention",
        body: "You may request deletion of your account and associated data at any time by contacting our team. Vote records are retained in anonymised form for platform integrity purposes.",
      },
    ],
  },
  {
    id: "terms",
    icon: <AlertTriangle size={16} />,
    title: "Terms of Use",
    content: [
      {
        heading: "Eligibility",
        body: "DzPulse is open to all individuals interested in Algerian public opinion. You must be 13 years or older to create an account. By registering, you agree to our terms and community guidelines.",
      },
      {
        heading: "Acceptable use",
        body: "You agree not to use DzPulse to manipulate poll results, spread disinformation, engage in harassment, or use automated tools to interact with the platform.",
      },
      {
        heading: "Platform changes",
        body: "DzPulse reserves the right to modify, suspend, or discontinue any part of the platform at any time. We will make reasonable efforts to notify users of significant changes.",
      },
    ],
  },
  {
    id: "report",
    icon: <AlertTriangle size={16} />,
    title: "Report Abuse",
    content: [
      {
        heading: "How to report",
        body: "If you encounter content that violates our guidelines — including polls, comments, or user behaviour — use the Report button available on each poll or comment. Our moderation team reviews all reports.",
      },
      {
        heading: "What happens after reporting",
        body: "Reported content is flagged for review. If it is found to violate our guidelines, it will be removed or modified. Severe or repeated violations result in account restrictions. You will receive a notification if action is taken on your report.",
      },
    ],
  },
];

export default function MethodologyPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Transparency</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3" data-testid="text-methodology-heading">
            Methodology & Trust
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            DzPulse is built on editorial integrity and transparent methodology. This page explains how polls are selected, how voting works, and how we protect the integrity of the platform.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-10 border-b border-border scrollbar-hide">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="shrink-0 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
              {s.title}
            </a>
          ))}
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-14">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-primary">{section.icon}</span>
                <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              </div>
              <div className="flex flex-col gap-6">
                {section.content.map((item) => (
                  <div key={item.heading} className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{item.heading}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-14 border-t border-border pt-8">
          <h2 className="text-sm font-semibold text-foreground mb-2">Questions or concerns?</h2>
          <p className="text-sm text-muted-foreground">
            For questions about our methodology, editorial decisions, or to report a concern, visit the{" "}
            <Link href="/submit"><span className="text-primary cursor-pointer hover:underline">Submit a Poll</span></Link>{" "}
            page or use the report function on any poll or comment.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
