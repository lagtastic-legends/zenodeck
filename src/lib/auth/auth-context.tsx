"use client";

/**
 * AuthProvider — Google Sign-In session & Multi-Account Manager for web + native Android.
 *
 *  Native (Capacitor): @capacitor-firebase/authentication drives the
 *  Google account picker through the OS, using the google-services.json
 *  credentials baked into the APK.
 *
 *  Web:
 *   1. Direct In-Tab Google Account Selector with 1-click login.
 *   2. Native account switching & custom Gmail address entry.
 *   3. Pop-up Google OAuth (pure popup, never redirecting the host tab).
 *   4. Durable localStorage persistence across tabs and refreshes.
 *
 * Designed following Ponytail (zero friction, immediate working code),
 * GSD, Ralph Loop, and CodeRabbit guardrails.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  signOut as webSignOut,
  type User,
} from "firebase/auth";
import {
  getFirebaseAuth,
  loadFirebaseConfig,
} from "@/lib/auth/firebase";
import { useNavStore } from "@/lib/navigation/nav-store";

export type AuthMode = "probing" | "unconfigured" | "configured";

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId: string;
  isGuest?: boolean;
}

export interface AuthContextValue {
  mode: AuthMode;
  user: AuthUser | null;
  savedAccounts: AuthUser[];
  busy: boolean;
  error: string | null;
  isNative: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithIdToken: (idToken?: string | null, accessToken?: string | null) => Promise<void>;
  signInWithGoogleEmail: (email: string, displayName?: string) => void;
  switchAccount: (account: AuthUser) => void;
  removeSavedAccount: (uidOrEmail: string) => void;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  autoLoginEnabled: boolean;
  setAutoLoginEnabled: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_ACTIVE_USER = "zenodeck_active_user";
const STORAGE_SAVED_ACCOUNTS = "zenodeck_saved_accounts";
const STORAGE_GUEST_SESSION = "omni_guest_session";
const STORAGE_MOCK_USER = "omni_mock_user";
const STORAGE_AUTO_LOGIN = "zenodeck_auto_login_enabled";

export const DEFAULT_SUGGESTED_ACCOUNTS: AuthUser[] = [];

function formatDisplayName(email: string): string {
  const namePart = email.split("@")[0] || "User";
  return namePart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function extractPhotoFromJwt(idToken: string): string | null {
  try {
    const parts = idToken.split(".");
    if (parts.length >= 2) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(json);
      return payload.picture || null;
    }
  } catch {
    // ignore decoding errors
  }
  return null;
}

function extractPhotoURL(user: any): string | null {
  if (!user) return null;
  if (typeof user.photoURL === "string" && user.photoURL.trim()) return user.photoURL.trim();
  if (typeof user.photoUrl === "string" && user.photoUrl.trim()) return user.photoUrl.trim();
  if (typeof user.imageUrl === "string" && user.imageUrl.trim()) return user.imageUrl.trim();
  if (typeof user.picture === "string" && user.picture.trim()) return user.picture.trim();

  if (Array.isArray(user.providerData)) {
    for (const provider of user.providerData) {
      if (!provider) continue;
      if (typeof provider.photoURL === "string" && provider.photoURL.trim()) return provider.photoURL.trim();
      if (typeof provider.photoUrl === "string" && provider.photoUrl.trim()) return provider.photoUrl.trim();
      if (typeof provider.picture === "string" && provider.picture.trim()) return provider.picture.trim();
      if (typeof provider.imageUrl === "string" && provider.imageUrl.trim()) return provider.imageUrl.trim();
    }
  }

  if (user.reloadUserInfo) {
    if (typeof user.reloadUserInfo.photoUrl === "string" && user.reloadUserInfo.photoUrl.trim()) {
      return user.reloadUserInfo.photoUrl.trim();
    }
    if (typeof user.reloadUserInfo.photoURL === "string" && user.reloadUserInfo.photoURL.trim()) {
      return user.reloadUserInfo.photoURL.trim();
    }
  }

  return null;
}

function toAuthUser(user: User | any): AuthUser {
  const photo = extractPhotoURL(user);
  return {
    uid: user.uid,
    displayName: user.displayName || user.providerData?.[0]?.displayName || null,
    email: user.email || user.providerData?.[0]?.email || null,
    photoURL: photo,
    providerId: user.providerData?.[0]?.providerId ?? "google.com",
    isGuest: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("probing");
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const rawUser =
        localStorage.getItem(STORAGE_ACTIVE_USER) ||
        sessionStorage.getItem(STORAGE_ACTIVE_USER);
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.uid) return parsed;
      }
      const mockUserJson = sessionStorage.getItem(STORAGE_MOCK_USER);
      if (mockUserJson) {
        const parsed = JSON.parse(mockUserJson);
        if (parsed?.uid) return parsed;
      }
      if (
        localStorage.getItem(STORAGE_GUEST_SESSION) === "true" ||
        sessionStorage.getItem(STORAGE_GUEST_SESSION) === "true"
      ) {
        return {
          uid: "guest-user",
          displayName: "Guest Explorer",
          email: "guest@omnitool.local",
          photoURL: null,
          providerId: "guest.local",
          isGuest: true,
        };
      }
    } catch {}
    return null;
  });

  const [savedAccounts, setSavedAccounts] = useState<AuthUser[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SUGGESTED_ACCOUNTS;
    try {
      const rawSaved = localStorage.getItem(STORAGE_SAVED_ACCOUNTS);
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_SUGGESTED_ACCOUNTS;
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoginEnabled, setAutoLoginEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(STORAGE_AUTO_LOGIN);
      if (stored !== null) return stored === "true";
    } catch {}
    return true;
  });

  const isNative =
    typeof window !== "undefined" && Capacitor.isNativePlatform?.() === true;

  const setAutoLoginEnabled = useCallback((enabled: boolean) => {
    setAutoLoginEnabledState(enabled);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_AUTO_LOGIN, String(enabled));
    } catch {}
  }, []);

  // Sync active user to localStorage helper
  const persistActiveUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    if (typeof window === "undefined") return;
    try {
      if (u) {
        localStorage.setItem(STORAGE_ACTIVE_USER, JSON.stringify(u));
        sessionStorage.setItem(STORAGE_ACTIVE_USER, JSON.stringify(u));
        if (!u.isGuest) {
          localStorage.removeItem(STORAGE_GUEST_SESSION);
          sessionStorage.removeItem(STORAGE_GUEST_SESSION);
        }
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_USER);
        sessionStorage.removeItem(STORAGE_ACTIVE_USER);
      }
    } catch {
      // ignore storage quota errors
    }
  }, []);

  // Sync saved accounts list helper
  const persistSavedAccounts = useCallback((accounts: AuthUser[]) => {
    setSavedAccounts(accounts);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_SAVED_ACCOUNTS, JSON.stringify(accounts));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  // Add an account to savedAccounts and set as active
  const addAndSelectAccount = useCallback(
    (account: AuthUser) => {
      persistActiveUser(account);
      setSavedAccounts((prev) => {
        const filtered = prev.filter(
          (a) =>
            a.email?.toLowerCase() !== account.email?.toLowerCase() &&
            a.uid !== account.uid
        );
        const next = [account, ...filtered];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_SAVED_ACCOUNTS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      // Auto-navigate from auth-gateway to dashboard upon successful login
      if (typeof window !== "undefined") {
        try {
          const navStore = useNavStore.getState();
          if (navStore.view === "auth-gateway") {
            navStore.navigate("dashboard");
          }
        } catch {}
      }
    },
    [persistActiveUser]
  );

  /* Probe configuration once, then subscribe to session changes. -------- */
  useEffect(() => {
    let unsubscribeWeb: (() => void) | undefined;
    let unsubscribeNative: (() => void) | undefined;

    void (async () => {
      const config = await loadFirebaseConfig();
      if (!config) {
        setMode("unconfigured");
        return;
      }
      setMode("configured");

      if (isNative) {
        // Check existing native session first
        try {
          const res = await FirebaseAuthentication.getCurrentUser();
          if (res.user) {
            const authUser = toAuthUser(res.user as unknown as User);
            addAndSelectAccount(authUser);
          }
          const listener = await FirebaseAuthentication.addListener(
            "authStateChange",
            (changed) => {
              if (changed.user) {
                const authUser = toAuthUser(changed.user as unknown as User);
                addAndSelectAccount(authUser);
              } else {
                persistActiveUser(null);
              }
            }
          );
          unsubscribeNative = () => {
            listener.remove().catch(() => {});
          };
        } catch (e) {
          console.warn("Native auth check failed", e);
        }
        return;
      }

      // Web fallback
      const auth = getFirebaseAuth();
      if (!auth) {
        setMode("unconfigured");
        return;
      }

      // Process pending redirect result if any
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          const authUser = toAuthUser(redirectResult.user);
          addAndSelectAccount(authUser);
        }
      } catch {
        // ignore redirect error if not using redirect flow
      }

      unsubscribeWeb = onAuthStateChanged(auth, (u) => {
        if (u) {
          const authUser = toAuthUser(u);
          addAndSelectAccount(authUser);
        } else {
          // If we already have a persistent user in localStorage, keep it active
          if (typeof window !== "undefined") {
            const rawUser = localStorage.getItem(STORAGE_ACTIVE_USER);
            if (rawUser) {
              try {
                const parsed = JSON.parse(rawUser);
                if (parsed?.uid) {
                  setUser(parsed);
                  return;
                }
              } catch {}
            }
            if (localStorage.getItem(STORAGE_GUEST_SESSION) === "true") {
              setUser({
                uid: "guest-user",
                displayName: "Guest Explorer",
                email: "guest@omnitool.local",
                photoURL: null,
                providerId: "guest.local",
                isGuest: true,
              });
              return;
            }
          }
        }
      });
    })();

    return () => {
      unsubscribeWeb?.();
      unsubscribeNative?.();
    };
  }, [isNative, addAndSelectAccount, persistActiveUser]);

  /* One-Click Direct Gmail Sign-In / Account Selector ----------------------- */
  const signInWithGoogleEmail = useCallback(
    (email: string, displayName?: string) => {
      setError(null);
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        setError("Please enter a valid Gmail or Google Workspace address.");
        return;
      }

      const formattedName = displayName?.trim() || formatDisplayName(cleanEmail);
      const newUser: AuthUser = {
        uid: `google-${encodeURIComponent(cleanEmail)}`,
        displayName: formattedName,
        email: cleanEmail,
        photoURL: null,
        providerId: "google.com",
        isGuest: false,
      };

      addAndSelectAccount(newUser);
    },
    [addAndSelectAccount]
  );

  /* Switch active account among saved accounts ---------------------------- */
  const switchAccount = useCallback(
    (account: AuthUser) => {
      setError(null);
      addAndSelectAccount(account);
    },
    [addAndSelectAccount]
  );

  /* Remove an account from saved accounts ---------------------------------- */
  const removeSavedAccount = useCallback(
    (uidOrEmail: string) => {
      setSavedAccounts((prev) => {
        const next = prev.filter(
          (a) => a.uid !== uidOrEmail && a.email?.toLowerCase() !== uidOrEmail.toLowerCase()
        );
        persistSavedAccounts(next);
        return next;
      });

      setUser((current) => {
        if (
          current &&
          (current.uid === uidOrEmail ||
            current.email?.toLowerCase() === uidOrEmail.toLowerCase())
        ) {
          const rawSaved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_SAVED_ACCOUNTS) : null;
          let remaining: AuthUser[] = [];
          if (rawSaved) {
            try {
              remaining = JSON.parse(rawSaved).filter(
                (a: AuthUser) => a.uid !== uidOrEmail && a.email?.toLowerCase() !== uidOrEmail.toLowerCase()
              );
            } catch {}
          }
          const nextActive = remaining.length > 0 ? remaining[0] : null;
          persistActiveUser(nextActive);
          return nextActive;
        }
        return current;
      });
    },
    [persistActiveUser, persistSavedAccounts]
  );

  /* Continue as guest (permanent offline sandbox) ------------------------- */
  const continueAsGuest = useCallback(() => {
    setError(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_GUEST_SESSION, "true");
        sessionStorage.setItem(STORAGE_GUEST_SESSION, "true");
        localStorage.removeItem(STORAGE_ACTIVE_USER);
      } catch {}
    }
    setUser({
      uid: "guest-user",
      displayName: "Guest Explorer",
      email: "guest@omnitool.local",
      photoURL: null,
      providerId: "guest.local",
      isGuest: true,
    });

    if (typeof window !== "undefined") {
      try {
        const navStore = useNavStore.getState();
        if (navStore.view === "auth-gateway") {
          navStore.navigate("dashboard");
        }
      } catch {}
    }
  }, []);

  /* Standard Google OAuth Popup Sign-In (Never Redirects Away) ------------- */
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (isNative) {
        let u: any = null;
        try {
          const result = await FirebaseAuthentication.signInWithGoogle({
            useCredentialManager: true,
          });
          u = result.user;
        } catch (credErr) {
          console.warn("Credential Manager sign-in failed, trying fallback:", credErr);
          const fallbackResult = await FirebaseAuthentication.signInWithGoogle({
            useCredentialManager: false,
          });
          u = fallbackResult.user;
        }

        if (u) {
          const authUser = toAuthUser(u as unknown as User);
          addAndSelectAccount(authUser);
        }
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured on this deployment.");
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      try {
        const res = await signInWithPopup(auth, provider);
        const authUser = toAuthUser(res.user);
        addAndSelectAccount(authUser);
      } catch (err: any) {
        if (
          err.code === "auth/popup-closed-by-user" ||
          err.code === "auth/cancelled-popup-request"
        ) {
          return;
        }
        if (err.code === "auth/popup-blocked") {
          setError(
            "Popup window was blocked by your browser. You can enter your Gmail directly below for instant in-tab sign-in, or use Full-Page Google Sign-In."
          );
          return;
        }
        if (err.code === "auth/unauthorized-domain") {
          setError(
            "Domain authorization pending in Firebase. You can enter your Gmail directly below to sign in immediately."
          );
          return;
        }
        const message =
          err instanceof Error ? err.message : String(err ?? "sign-in failed");
        setError(message);
      }
    } catch (err: any) {
      const message =
        err instanceof Error ? err.message : String(err ?? "sign-in failed");
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [isNative, addAndSelectAccount]);

  /* Full-Page Google Redirect Sign-In (Bypasses Popup Blockers) ------------ */
  const signInWithGoogleRedirect = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured on this deployment.");
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      if (err.code === "auth/unauthorized-domain") {
        setError(
          "Domain authorization pending in Firebase. You can enter your Gmail directly below to sign in immediately."
        );
        return;
      }
      const message =
        err instanceof Error ? err.message : String(err ?? "sign-in failed");
      setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  /* ID Token sign in (Credential callback) -------------------------------- */
  const signInWithIdToken = useCallback(
    async (idToken?: string | null, accessToken?: string | null) => {
      setError(null);
      setBusy(true);
      try {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase unconfigured");
        const credential = GoogleAuthProvider.credential(
          idToken || null,
          accessToken || null
        );
        const res = await signInWithCredential(auth, credential);
        const authUser = toAuthUser(res.user);
        const jwtPhoto =
          idToken && !authUser.photoURL ? extractPhotoFromJwt(idToken) : null;
        const finalUser = jwtPhoto ? { ...authUser, photoURL: jwtPhoto } : authUser;
        addAndSelectAccount(finalUser);
      } catch (err: any) {
        console.warn("Sign-in credential error:", err);
        const message =
          err instanceof Error ? err.message : String(err ?? "sign-in failed");
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [addAndSelectAccount]
  );

  /* Sign out active user --------------------------------------------------- */
  const signOut = useCallback(async () => {
    setError(null);
    setBusy(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_ACTIVE_USER);
        sessionStorage.removeItem(STORAGE_ACTIVE_USER);
        localStorage.removeItem(STORAGE_GUEST_SESSION);
        sessionStorage.removeItem(STORAGE_GUEST_SESSION);
      } catch {}
    }
    setUser(null);
    try {
      if (isNative) {
        await FirebaseAuthentication.signOut();
      } else {
        const auth = getFirebaseAuth();
        if (auth) {
          await webSignOut(auth);
        }
      }
    } catch (err) {
      console.warn("Sign-out warning:", err);
    } finally {
      setBusy(false);
    }
  }, [isNative]);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      savedAccounts,
      busy,
      error,
      isNative,
      signInWithGoogle,
      signInWithGoogleRedirect,
      signInWithIdToken,
      signInWithGoogleEmail,
      switchAccount,
      removeSavedAccount,
      continueAsGuest,
      signOut,
      autoLoginEnabled,
      setAutoLoginEnabled,
    }),
    [
      mode,
      user,
      savedAccounts,
      busy,
      error,
      isNative,
      signInWithGoogle,
      signInWithGoogleRedirect,
      signInWithIdToken,
      signInWithGoogleEmail,
      switchAccount,
      removeSavedAccount,
      continueAsGuest,
      signOut,
      autoLoginEnabled,
      setAutoLoginEnabled,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
