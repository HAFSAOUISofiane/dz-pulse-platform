const KEY = "dzpulse_anon_id";

export function getAnonId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getVotedPollsKey(slug: string) {
  return `dzpulse_voted_${slug}`;
}

export function markVoted(slug: string, optionId: number) {
  localStorage.setItem(getVotedPollsKey(slug), String(optionId));
}

export function getLocalVote(slug: string): number | null {
  const v = localStorage.getItem(getVotedPollsKey(slug));
  return v ? parseInt(v, 10) : null;
}
