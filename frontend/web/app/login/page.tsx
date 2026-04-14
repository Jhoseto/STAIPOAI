"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const callbackUrl = React.useMemo(() => {
    if (typeof window === "undefined") {
      return `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`;
    }
    return new URL("/auth/callback", window.location.origin).toString();
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      toast.error("Грешка при удостоверяване", { description: decodeURIComponent(err) });
    }
  }, []);

  async function doLogin() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Успешен вход");
      router.push("/app");
    } catch (e) {
      toast.error("Неуспешен вход", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  async function doRegister() {
    setBusy(true);
    try {
      const redirectTo =
        callbackUrl;
      if (password !== confirmPassword) {
        throw new Error("Паролите не съвпадат.");
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Профилът е създаден и си логнат");
        router.push("/app");
      } else {
        toast.success("Профилът е създаден", {
          description: "Провери имейла за потвърждение.",
        });
      }
    } catch (e) {
      toast.error("Неуспешна регистрация", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  async function doResetRequest() {
    setBusy(true);
    try {
      const redirectTo =
        (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + "/auth/reset";
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast.success("Изпратихме email за смяна на парола.");
      setMode("login");
    } catch (e) {
      toast.error("Неуспешно изпращане", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    try {
      const redirectTo =
        callbackUrl;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      toast.success("Изпратихме отново email за потвърждение.");
    } catch (e) {
      toast.error("Неуспешно изпращане", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  async function doGoogle() {
    setBusy(true);
    try {
      const redirectTo =
        callbackUrl;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (e) {
      setBusy(false);
      toast.error("Google вход: грешка", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-md glass-premium rounded-xl p-8 border border-border/50">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {mode === "login" ? "Вход" : "Регистрация"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Реален Supabase вход: email/парола + Google OAuth.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn("w-full transition-all duration-200", mode === "login" ? "btn-premium" : "btn-acherno-outline")}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={cn("w-full transition-all duration-200", mode === "register" ? "btn-premium" : "btn-acherno-outline")}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="email@domain.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full"
          />
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Парола"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full"
          />

          {mode === "register" ? (
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Повтори паролата"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full"
            />
          ) : null}

          {mode === "login" ? (
            <button type="button" className="btn-premium w-full mt-4" onClick={doLogin} disabled={busy}>
              {busy ? "Влизане..." : "ВХОД С EMAIL"}
            </button>
          ) : mode === "register" ? (
            <button type="button" className="btn-premium w-full mt-4" onClick={doRegister} disabled={busy}>
              {busy ? "Създаване..." : "СЪЗДАЙ ПРОФИЛ"}
            </button>
          ) : (
            <button type="button" className="btn-premium w-full mt-4" onClick={doResetRequest} disabled={busy}>
              {busy ? "Изпращане..." : "ИЗПРАТИ ЛИНК"}
            </button>
          )}

          {mode === "login" ? (
            <>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                onClick={() => setMode("reset")}
              >
                Забравена парола?
              </button>
              <div className="text-center text-xs text-muted-foreground py-1">или</div>
              <button type="button" className="btn-acherno-outline w-full" onClick={doGoogle} disabled={busy}>
                Вход с Google
              </button>
            </>
          ) : null}

          {mode === "register" ? (
            <Button variant="outline" className="btn-premium" onClick={resendVerification} disabled={busy}>
              Изпрати отново имейл за потвърждение
            </Button>
          ) : null}

          {mode === "reset" ? (
            <Button variant="outline" className="btn-premium" onClick={() => setMode("login")} disabled={busy}>
              Назад към вход
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

