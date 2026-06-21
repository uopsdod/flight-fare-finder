import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, LogOut, Check, Loader2, Clock, XCircle, CreditCard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/components/ProtectedRoute";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

type PlanName = "tokyo" | "seoul" | "london";

interface Plan {
  plan_name: PlanName;
  label: string;
  route: string;
  hint: number;
}

const PLANS: Plan[] = [
  { plan_name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 9325 },
  { plan_name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 5989 },
  { plan_name: "london", label: "台北 ✈ 倫敦", route: "TPE-LON", hint: 30924 },
];

type SubStatus = "active" | "pending_payment" | "cancelled" | "expired";

interface Subscription {
  route: string;
  plan_name: string;
  target_price: number;
  currency: string;
  subscription_status?: SubStatus;
  current_period_end_date?: string;
  updated_at?: string;
}

const twd = (n: number) => "NT$" + n.toLocaleString("en-US");

export default function Dashboard() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<PlanName, string>>({ tokyo: "", seoul: "", london: "" });
  const [saving, setSaving] = useState<PlanName | null>(null);
  const [cancelling, setCancelling] = useState<PlanName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "success" | "failed"; msg: string } | null>(null);

  useEffect(() => {
    document.title = "Dashboard · Flight Price Notifier";
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get("purchase");
    if (purchase === "success") {
      setBanner({
        kind: "success",
        msg: "付款完成！訂閱啟用中，稍待片刻狀態即會更新。Payment received — your subscription is being activated.",
      });
    } else if (purchase === "failed") {
      setBanner({
        kind: "failed",
        msg: "付款未完成，請再試一次。Payment was not completed. Please try again.",
      });
    }
    if (purchase) {
      window.history.replaceState({}, "", "/app");
    }
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

  // Backend /subscribe returns:
  //  - text/html  -> ECPay auto-submit cashier form (new / pending / expired) -> hand off to ECPay.
  //  - application/json -> in-place target update (active / cancelled-in-grace) -> just refresh.
  async function handleSubscribe(plan: Plan, explicitTarget?: number) {
    const target = explicitTarget ?? Number(inputs[plan.plan_name].trim());
    if (!Number.isFinite(target) || target <= 0) {
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
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html")) {
        const html = await res.text();
        document.open();
        document.write(html);
        document.close();
        return;
      }
      setInputs((p) => ({ ...p, [plan.plan_name]: "" }));
      await loadSubs();
    } catch (e) {
      setError("操作失敗，請再試一次 / Action failed, please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function handleCancel(plan: Plan) {
    if (
      !window.confirm(
        "確定要取消訂閱嗎？你在本期到期前仍會收到通知。\nCancel this subscription? You'll keep alerts until the current period ends."
      )
    ) {
      return;
    }
    setCancelling(plan.plan_name);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email, route: plan.route }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadSubs();
    } catch (e) {
      setError("取消失敗，請再試一次 / Cancel failed, please try again.");
    } finally {
      setCancelling(null);
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
          選擇航線並設定目標價，月費 NT$300 訂閱後，達標時我們會寄 Email 通知你。
          <br />
          Pick a route, set a target price, and subscribe (NT$300/month) — we'll email you when a fare drops to your budget.
        </p>

        {banner && (
          <div
            className={
              "mt-6 rounded-lg border px-4 py-3 text-sm " +
              (banner.kind === "success"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-destructive/40 bg-destructive/10 text-destructive")
            }
          >
            {banner.msg}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const sub = subs[plan.route];
            const status: SubStatus | undefined = sub?.subscription_status;
            const busy = saving === plan.plan_name;
            const busyCancel = cancelling === plan.plan_name;

            let badge: React.ReactNode = null;
            if (status === "active") {
              badge = (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                  <Check className="h-3 w-3" /> 已訂閱（有效）
                </span>
              );
            } else if (status === "pending_payment") {
              badge = (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-600">
                  <Clock className="h-3 w-3" /> 未完成付款
                </span>
              );
            } else if (status === "cancelled") {
              badge = (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" /> 已取消
                </span>
              );
            } else if (status === "expired") {
              badge = (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <XCircle className="h-3 w-3" /> 已結束
                </span>
              );
            }

            const primaryLabel =
              status === "active" || status === "cancelled"
                ? "更新目標價"
                : status === "pending_payment"
                ? "完成付款 / Pay"
                : status === "expired"
                ? "重新訂閱"
                : "訂閱並付款";

            return (
              <div
                key={plan.plan_name}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{plan.label}</h2>
                  {badge}
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  目前最低約 {twd(plan.hint)}（參考）
                </p>

                {sub && (
                  <p className="mt-3 text-sm">
                    目前目標價：<span className="font-semibold">{twd(sub.target_price)}</span>
                  </p>
                )}

                {status === "cancelled" && sub?.current_period_end_date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    已取消，有效至 {sub.current_period_end_date}（在此之前仍會收到通知）
                  </p>
                )}

                {status === "pending_payment" && (
                  <p className="mt-1 text-xs text-amber-600">
                    尚未完成付款，點「完成付款」前往綠界結帳。
                  </p>
                )}

                {status !== "pending_payment" && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-muted-foreground">
                      目標價 Target price (NT$)
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder={sub ? String(sub.target_price) : String(plan.hint)}
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
                        {primaryLabel}
                      </button>
                    </div>
                  </div>
                )}

                {status === "pending_payment" && (
                  <button
                    onClick={() => handleSubscribe(plan, sub?.target_price)}
                    disabled={busy}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    完成付款 / Pay NT$300
                  </button>
                )}

                {(status === "active" || status === "cancelled") && (
                  <button
                    onClick={() => handleCancel(plan)}
                    disabled={busyCancel || status === "cancelled"}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {busyCancel && <Loader2 className="h-3 w-3 animate-spin" />}
                    {status === "cancelled" ? "已取消訂閱" : "取消訂閱 / Cancel"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
