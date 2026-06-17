import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, LogOut, Check, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/components/ProtectedRoute";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

type PlanName = "tokyo" | "seoul";

interface Plan {
  plan_name: PlanName;
  label: string;
  route: string;
  hint: number; // current cheapest (TWD) — just a hint to pick a sane budget
}

const PLANS: Plan[] = [
  { plan_name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 9325 },
  { plan_name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 5989 },
];

interface Subscription {
  route: string;
  plan_name: string;
  target_price: number;
  currency: string;
  updated_at?: string;
}

const twd = (n: number) => "NT$" + n.toLocaleString("en-US");

export default function Dashboard() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<PlanName, string>>({ tokyo: "", seoul: "" });
  const [saving, setSaving] = useState<PlanName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard · Flight Price Notifier";
  }, []);

  const loadSubs = useCallback(async () => {
    if (!user.email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/subscriptions?email=${encodeURIComponent(user.email)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const map: Record<string, Subscription> = {};
      for (const s of (data.subscriptions ?? []) as Subscription[]) map[s.route] = s;
      setSubs(map);
    } catch (e) {
      setError("無法載入訂閱狀態 / Could not load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  async function handleSubscribe(plan: Plan) {
    const raw = inputs[plan.plan_name].trim();
    const target = Number(raw);
    if (!raw || !Number.isFinite(target) || target <= 0) {
      setError("請輸入有效的目標價（NT$）/ Enter a valid target price.");
      return;
    }
    setSaving(plan.plan_name);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          plan_name: plan.plan_name,
          target_price: target,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInputs((p) => ({ ...p, [plan.plan_name]: "" }));
      await loadSubs();
    } catch (e) {
      setError("儲存失敗，請再試一次 / Save failed, please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Flight Price Notifier</span>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Sign out / 登出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16 fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">Hi {user.email}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          選擇航線並設定目標價，達標時我們會寄 Email 通知你。
          <br />
          Pick a route and set a target price — we'll email you when a fare drops to your budget.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const sub = subs[plan.route];
            const subscribed = Boolean(sub);
            const busy = saving === plan.plan_name;
            return (
              <div
                key={plan.plan_name}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{plan.label}</h2>
                  {subscribed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      <Check className="h-3 w-3" />
                      已訂閱
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  目前最低約 {twd(plan.hint)}（參考）
                </p>

                {subscribed && (
                  <p className="mt-3 text-sm">
                    目前目標價：
                    <span className="font-semibold">{twd(sub.target_price)}</span>
                  </p>
                )}

                <div className="mt-4">
                  <label className="block text-xs font-medium text-muted-foreground">
                    目標價 Target price (NT$)
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder={subscribed ? String(sub.target_price) : String(plan.hint)}
                      value={inputs[plan.plan_name]}
                      onChange={(e) =>
                        setInputs((p) => ({ ...p, [plan.plan_name]: e.target.value }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={busy || loading}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {subscribed ? "更新目標價" : "開始追蹤"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
