import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

interface CaptchaDialogProps {
  question: string;
  onConfirm: (answer: number) => void;
  onClose: () => void;
  error?: string;
}

export function CaptchaDialog({ question, onConfirm, onClose, error }: CaptchaDialogProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    const num = parseInt(answer, 10);
    if (!isNaN(num)) onConfirm(num);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-xs p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Quick Verification</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          You've voted quickly on several polls. Please solve this to continue.
        </p>

        <div className="bg-muted rounded-lg px-4 py-3 mb-4 text-center">
          <p className="text-base font-mono font-bold text-foreground">
            What is {question} ?
          </p>
        </div>

        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Your answer"
          className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />

        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="w-full text-sm bg-primary text-primary-foreground rounded-lg py-2 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Verify &amp; Vote
        </button>
      </div>
    </div>
  );
}
