import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Plane, BellRing, XCircle } from "lucide-react";

export default function Landing() {
  useEffect(() => {
    document.title = "Flight Price Notifier — 機票降價通知";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Flight Price Notifier</span>
          </div>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
          >
            Sign in / 登入
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, oklch(0.53 0.12 260 / 0.30), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-4xl px-6 pt-24 pb-28 text-center fade-in-up">
            <span className="inline-block rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              From Taipei · 東京 · 首爾
            </span>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
              Flight Price{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-hero)" }}
              >
                Notifier
              </span>
            </h1>
            <p className="mt-6 text-xl font-medium text-foreground sm:text-2xl">
              設定航線與目標價，機票降價就通知你
            </p>
            <p className="mt-3 text-base text-muted-foreground">
              Set a route and a target price — we email you when the fare drops.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
              >
                Sign in / 登入
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Plane className="h-5 w-5" />}
              titleZh="盯緊熱門航線"
              titleEn="Always-on route watching"
              body="持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。"
            />
            <FeatureCard
              icon={<BellRing className="h-5 w-5" />}
              titleZh="達標自動通知"
              titleEn="Target-price email alerts"
              body="低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。"
            />
            <FeatureCard
              icon={<XCircle className="h-5 w-5" />}
              titleZh="隨時取消"
              titleEn="Cancel anytime"
              body="月訂閱制，不想用隨時停，沒有綁約。"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          © 2026 Flight Price Notifier
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon, titleZh, titleEn, body,
}: { icon: React.ReactNode; titleZh: string; titleEn: string; body: string }) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card p-6 transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)] fade-in-up">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{titleZh}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{titleEn}</p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/80">{body}</p>
    </div>
  );
}
