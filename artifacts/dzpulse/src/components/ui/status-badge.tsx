interface StatusBadgeProps {
  status: "open" | "closed" | "upcoming" | "archived" | "draft";
  size?: "sm" | "xs";
}

const CONFIG = {
  open: { label: "Live", dot: true, className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" },
  closed: { label: "Closed", dot: false, className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700" },
  upcoming: { label: "Upcoming", dot: false, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  archived: { label: "Archived", dot: false, className: "bg-muted text-muted-foreground border-border" },
  draft: { label: "Draft", dot: false, className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status, size = "xs" }: StatusBadgeProps) {
  const c = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${size === "xs" ? "text-xs" : "text-xs"} ${c.className}`}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {c.label}
    </span>
  );
}
