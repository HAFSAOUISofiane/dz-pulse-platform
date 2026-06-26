import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { useGetMe } from "@workspace/api-client-react";

export function AuthSync() {
  const { isAuthenticated, _setUser } = useAuth() as any;
  const { data: user, isError, isSuccess } = useGetMe({
    query: {
      enabled: isAuthenticated,
      retry: false,
    }
  });

  useEffect(() => {
    if (isSuccess && user) {
      _setUser(user);
    } else if (isError) {
      _setUser(null);
      localStorage.removeItem("dzpulse_token");
    }
  }, [user, isSuccess, isError, _setUser]);

  return null;
}
