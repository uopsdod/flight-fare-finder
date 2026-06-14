import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const UserContext = createContext<User | null>(null);

// Replaces the old TanStack `_authenticated` route guard + route context.
// Client-side only: checks the Supabase session and redirects to /auth.
export function useAuthUser(): User {
  const user = useContext(UserContext);
  if (!user) throw new Error("useAuthUser must be used within a ProtectedRoute");
  return user;
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed">("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setStatus("unauthed");
      } else {
        setUser(data.user);
        setStatus("authed");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return <div className="min-h-screen bg-background" />;
  }
  if (status === "unauthed" || !user) {
    return <Navigate to="/auth" replace />;
  }
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
