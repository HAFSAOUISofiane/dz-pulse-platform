import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Share2, Copy, Check, Download, ImageDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareMenuProps {
  slug: string;
  title: string;
  totalVotes?: number;
  triggerClassName?: string;
  triggerLabel?: string;
  compact?: boolean;
}

function getShareUrl(slug: string): string {
  return `${window.location.origin}/api/share/${slug}`;
}

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#0088cc">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#0a66c2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

async function downloadBlobAs(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export function ShareMenu({
  slug,
  title,
  totalVotes = 0,
  triggerClassName,
  triggerLabel,
  compact = false,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<"og" | "story" | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const shareUrl = getShareUrl(slug);
  const text = encodeURIComponent(`${title} — Vote on DzPulse, Algeria's live opinion platform`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handleClose = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    const handleScroll = () => updatePos();
    document.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const openX = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodedUrl}`, "_blank", "noopener");
    setOpen(false);
  };

  const openFacebook = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank", "noopener");
    setOpen(false);
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`https://wa.me/?text=${text}%20${encodedUrl}`, "_blank", "noopener");
    setOpen(false);
  };

  const openTelegram = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${text}`, "_blank", "noopener");
    setOpen(false);
  };

  const openLinkedIn = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank", "noopener");
    setOpen(false);
  };

  const downloadOgImage = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDownloading("og");
    setOpen(false);
    try {
      await downloadBlobAs(`/api/share/${slug}/image`, `dzpulse-${slug}.png`);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadStory = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDownloading("story");
    setOpen(false);
    try {
      await downloadBlobAs(`/api/share/${slug}/story`, `dzpulse-${slug}-story.png`);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const buttonClass = triggerClassName ??
    (compact
      ? "p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
      : "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors");

  const isDownloading = downloading !== null;

  const dropdown = open && dropdownPos
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
          }}
          className="w-56 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Share poll</p>
            <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">{title}</p>
            {totalVotes > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{totalVotes.toLocaleString()} votes</p>
            )}
          </div>

          <div className="py-1">
            <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
              {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy link"}
            </button>

            <button onClick={openX} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
              <TwitterXIcon />
              Share on X
            </button>

            <button onClick={openFacebook} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
              <FacebookIcon />
              Share on Facebook
            </button>

            <button onClick={openWhatsApp} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
              <WhatsAppIcon />
              Share on WhatsApp
            </button>

            <button onClick={openTelegram} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
              <TelegramIcon />
              Share on Telegram
            </button>

            <button onClick={openLinkedIn} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
              <LinkedInIcon />
              Share on LinkedIn
            </button>

            <div className="my-1 border-t border-border/60" />

            <button onClick={downloadOgImage} disabled={isDownloading} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-60">
              <Download size={14} />
              {downloading === "og" ? "Generating…" : "Download image (1200×630)"}
            </button>

            <button onClick={downloadStory} disabled={isDownloading} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-60">
              <ImageDown size={14} />
              {downloading === "story" ? "Generating…" : "Download story (1080×1920)"}
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          setOpen(!open);
        }}
        className={buttonClass}
        aria-label="Share poll"
        data-testid="button-share"
        disabled={isDownloading}
      >
        <Share2 size={compact ? 11 : 13} />
        {!compact && (isDownloading ? "Preparing…" : (triggerLabel ?? "Share"))}
      </button>
      {dropdown}
    </>
  );
}
