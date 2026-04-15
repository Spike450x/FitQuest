"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Sync a presence cookie so the middleware can gate protected routes.
      // Firebase Auth is client-side only; the cookie is not the auth token —
      // it's just a signal for the Edge middleware to decide whether to redirect.
      if (firebaseUser) {
        document.cookie = "__session=1; path=/; max-age=86400; SameSite=Lax";
      } else {
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
