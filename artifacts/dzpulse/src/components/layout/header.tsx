import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, Moon, Sun, ChevronDown, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useLogoutUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { DzPulseLogo } from "@/components/ui/dzpulse-logo";
import { useLang, type Lang } from "@/lib/language-context";
import { usePlatformMode, type PlatformMode } from "@/lib/platform-mode-context";

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

interface HeaderProps {
  onThemeToggle: () => void;
  isDark: boolean;
}

const MODE_LABELS: Record<PlatformMode, string> = {
  all: "All",
  professional: "Pro",
  social: "Social",
};

export function Header({ onThemeToggle, isDark }: HeaderProps) {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const { mode, setMode } = usePlatformMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const logoutMutation = useLogoutUser();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
        navigate("/");
        toast({ title: "Signed out" });
      },
      onError: () => {
        logout();
        navigate("/");
      },
    });
    setUserMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/polls?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { href: "/polls", label: t.explore },
    { href: "/topics", label: t.topics },
    { href: "/methodology", label: t.methodology },
    { href: "/submit", label: t.submitPoll },
  ];

  const isActive = (href: string) => location === href || (href !== "/" && location.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" data-testid="link-logo">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0">
            <DzPulseLogo size={26} />
            <span className="font-semibold text-sm tracking-tight text-foreground hidden sm:block">DzPulse</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-400 text-white uppercase">Beta</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} data-testid={`link-nav-${link.href.replace(/\//g, "").replace(/\s+/g, "-")}`}>
              <span className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                isActive(link.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
                {link.label}
              </span>
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link href="/admin" data-testid="link-nav-admin">
              <span className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                isActive("/admin") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
                Admin
              </span>
            </Link>
          )}
        </nav>

        {/* Platform mode toggle — desktop */}
        <div className="hidden md:flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border/40 ml-1">
          {(["all", "professional", "social"] as PlatformMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all leading-none ${
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-2">
          {/* Search */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search polls..."
                className="h-8 w-52 text-sm"
                data-testid="input-header-search"
              />
              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8">
                <Search size={15} />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(false)}>
                <X size={15} />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} data-testid="button-search" className="h-8 w-8">
              <Search size={15} />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onThemeToggle} data-testid="button-theme-toggle" className="h-8 w-8">
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </Button>

          {/* Language switcher */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-1"
              aria-label="Change language"
            >
              {lang.toUpperCase()}
              <ChevronDown size={11} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => { setLang(opt.code); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      lang === opt.code
                        ? "text-primary font-semibold bg-primary/5"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.code === "en" ? "English" : opt.code === "fr" ? "Français" : "العربية"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                data-testid="button-user-menu"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user?.name}</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                  <Link href={`/profile/${user?.username}`} data-testid="link-profile">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors" onClick={() => setUserMenuOpen(false)}>
                      <User size={14} className="text-muted-foreground" />
                      Profile
                    </button>
                  </Link>
                  <button
                    onClick={handleLogout}
                    data-testid="button-logout"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <LogOut size={14} className="text-muted-foreground" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                data-testid="link-login"
                onClick={() => {
                  const skip = ["/login", "/register", "/auth/callback"];
                  if (!skip.some((p) => location.startsWith(p))) {
                    localStorage.setItem("dzpulse_return_to", location);
                  }
                  navigate("/login");
                }}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                data-testid="link-register"
                onClick={() => {
                  const skip = ["/login", "/register", "/auth/callback"];
                  if (!skip.some((p) => location.startsWith(p))) {
                    localStorage.setItem("dzpulse_return_to", location);
                  }
                  navigate("/register");
                }}
              >
                Register
              </Button>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} className="h-8 w-8">
            <Search size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onThemeToggle} data-testid="button-theme-toggle-mobile" className="h-8 w-8">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu" className="h-8 w-8">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search polls..."
              className="h-9 text-sm flex-1"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-9 text-xs">Search</Button>
          </form>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          {/* Platform mode toggle — mobile */}
          <div className="flex gap-1 mb-1 p-0.5 bg-muted/60 rounded-lg border border-border/40">
            {(["all", "professional", "social"] as PlatformMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "all" ? "All" : m === "professional" ? "Professional" : "Social"}
              </button>
            ))}
          </div>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} data-testid={`link-mobile-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <span
                className={`block px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                  isActive(link.href) ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </span>
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link href="/admin">
              <span className="block px-3 py-2 text-sm font-medium text-foreground cursor-pointer rounded-md hover:bg-muted" onClick={() => setMobileOpen(false)}>Admin</span>
            </Link>
          )}
          <div className="border-t border-border pt-2 mt-1">
            {isAuthenticated ? (
              <div className="flex flex-col gap-1">
                <Link href={`/profile/${user?.username}`}>
                  <span className="block px-3 py-2 text-sm text-foreground cursor-pointer rounded-md hover:bg-muted" onClick={() => setMobileOpen(false)}>{user?.name}</span>
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="px-3 py-2 text-sm text-muted-foreground text-left rounded-md hover:bg-muted"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const skip = ["/login", "/register", "/auth/callback"];
                    if (!skip.some((p) => location.startsWith(p))) {
                      localStorage.setItem("dzpulse_return_to", location);
                    }
                    setMobileOpen(false);
                    navigate("/login");
                  }}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const skip = ["/login", "/register", "/auth/callback"];
                    if (!skip.some((p) => location.startsWith(p))) {
                      localStorage.setItem("dzpulse_return_to", location);
                    }
                    setMobileOpen(false);
                    navigate("/register");
                  }}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
