import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPollBySlugQueryKey } from "@workspace/api-client-react";

interface LiveOption {
  id: number;
  voteCount: number;
  percentageCache: string;
}

interface PollLiveUpdate {
  totalVotes: number;
  options: LiveOption[];
}

function applyUpdate(old: any, update: PollLiveUpdate): any {
  if (!old) return old;
  const updatedOptions = old.options.map((opt: any) => {
    const fresh = update.options.find((o) => o.id === opt.id);
    if (!fresh) return opt;
    return { ...opt, voteCount: fresh.voteCount, percentageCache: fresh.percentageCache };
  });
  return { ...old, totalVotes: update.totalVotes, options: updatedOptions };
}

export function usePollLive(slug: string | undefined) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!slug) return;

    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${base}/api/polls/${slug}/live`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const update: PollLiveUpdate = JSON.parse(event.data);
        const baseKey = getGetPollBySlugQueryKey(slug);

        queryClient.setQueriesData(
          { queryKey: baseKey, exact: false },
          (old: any) => applyUpdate(old, update)
        );
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // Let EventSource handle auto-reconnect natively
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [slug, queryClient]);
}
