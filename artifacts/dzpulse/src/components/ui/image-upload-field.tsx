import { useState, useRef } from "react";
import { Upload, X, Link, Image as ImageIcon, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  adminToken?: string;
}

/** Resolves a storage objectPath to a full serving URL. */
function toServingUrl(objectPath: string): string {
  if (objectPath.startsWith("http")) return objectPath;
  return `/api/storage${objectPath}`;
}

export function ImageUploadField({
  value,
  onChange,
  placeholder = "https://... (optional)",
  className,
  adminToken,
}: ImageUploadFieldProps) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayValue = value && !value.startsWith("http") ? toServingUrl(value) : value;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Step 1: Get presigned URL
      const token = adminToken || localStorage.getItem("dzpulse_token") || "";
      const metaRes = await apiFetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();

      // Step 2: Upload directly to GCS
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // objectPath is like /objects/uploads/uuid — store it as-is
      onChange(objectPath);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed, please try again.");
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearImage() {
    onChange("");
    setUploadError(null);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors",
            mode === "url"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Link size={10} />
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors",
            mode === "upload"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Upload size={10} />
          Upload
        </button>
      </div>

      {mode === "url" ? (
        <div className="flex gap-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="text-sm h-8 flex-1"
          />
          {value && (
            <button
              type="button"
              onClick={clearImage}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div
            className="border border-dashed border-border rounded-md p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            ) : (
              <Upload size={18} className="text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground text-center">
              {isUploading ? "Uploading…" : "Click to select an image (max 5 MB)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="relative inline-flex items-center gap-2 mt-0.5">
          <img
            src={displayValue}
            alt="Preview"
            className="h-12 w-auto rounded border border-border object-cover max-w-[120px]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <button
            type="button"
            onClick={clearImage}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
