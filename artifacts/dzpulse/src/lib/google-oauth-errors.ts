export const GOOGLE_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_no_code: "Google sign-in was cancelled.",
  google_no_email: "Could not retrieve your email from Google.",
  google_failed: "Google sign-in failed. Please try again.",
  suspended: "Your account has been suspended.",
};

export function getGoogleOAuthErrorMessage(errorCode: string): string {
  return GOOGLE_OAUTH_ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again.";
}
