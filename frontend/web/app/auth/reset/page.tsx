"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [tokenReady, setTokenReady] = React.useState(false);

  React.useEffect(() => {
    async function verifyRecovery() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (!tokenHash || type !== "recovery") {
        toast.error("Невалиден reset линк.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });
      if (error) {
        toast.error("Reset линкът е невалиден или изтекъл.", {
          description: error.message,
        });
        return;
      }

      setTokenReady(true);
    }

    verifyRecovery();
  }, []);

  async function submit() {
    setBusy(true);
    try {
      if (!tokenReady) throw new Error("Токенът за възстановяване още не е валидиран.");
      if (password.length < 6) throw new Error("Паролата трябва да е поне 6 символа.");
      if (password !== confirmPassword) throw new Error("Паролите не съвпадат.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Паролата е сменена.");
      router.replace("/login");
    } catch (e) {
      toast.error("Неуспешна смяна на парола", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-md glass-premium rounded-xl p-8 border border-border/50">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
          Нова парола
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Въведи нова парола за профила си.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            placeholder="Нова парола"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Повтори новата парола"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button className="btn-premium" onClick={submit} disabled={busy || !tokenReady}>
            {busy ? "Записване..." : "Смени паролата"}
          </Button>
        </div>
      </div>
    </div>
  );
}

