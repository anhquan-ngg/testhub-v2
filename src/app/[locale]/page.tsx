import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  FileQuestion,
  GraduationCap,
  LineChart,
  LockKeyhole,
  Menu,
  MonitorCheck,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Testhub">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b63ce] text-sm font-black text-white shadow-sm shadow-blue-600/25">
        T
      </span>
      <span className="text-lg font-extrabold tracking-normal text-slate-950">
        TESTHUB
      </span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-normal text-[#0b63ce]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal text-slate-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function Header() {
  const t = useTranslations("landing");
  const navItems = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.workflow"), href: "#workflow" },
    { label: t("nav.roles"), href: "#roles" },
    { label: t("nav.about"), href: "#about" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-[#0b63ce]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Button
            asChild
            variant="ghost"
            className="rounded-xl px-5 font-bold text-slate-700 hover:bg-blue-50 hover:text-[#0b63ce]"
          >
            <Link href="/login">{t("nav.login")}</Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-[#0b63ce] px-5 font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-[#0858bb]"
          >
            <Link href="/signup">{t("nav.signup")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <details className="group relative">
            <summary aria-label={t("nav.menu")} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
              <nav className="grid gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0b63ce]"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-xl font-bold text-slate-700"
                >
                  <Link href="/login">{t("nav.login")}</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-xl bg-[#0b63ce] font-bold text-white hover:bg-[#0858bb]"
                >
                  <Link href="/signup">{t("nav.signup")}</Link>
                </Button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function DashboardMockup() {
  const t = useTranslations("landing");
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_50%_35%,rgba(11,99,206,0.26),transparent_62%)] blur-2xl" />
      <div className="relative rounded-2xl bg-gradient-to-br from-white via-white to-blue-50 p-px shadow-md shadow-blue-900/10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
              {t("mockup.preview")}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[230px_1fr]">
            <aside className="hidden border-r border-slate-200 bg-slate-50/60 p-4 lg:block">
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <ShieldCheck className="h-5 w-5 text-[#0b63ce]" />
                <div>
                  <p className="text-xs font-black text-slate-950">
                    {t("mockup.room")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t("mockup.monitored")}
                  </p>
                </div>
              </div>
              {[
                t("mockup.overview"),
                t("mockup.students"),
                t("mockup.alerts"),
                t("mockup.connection"),
              ].map((item, index) => (
                <div
                  key={item}
                  className={`mb-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-[#0b63ce] text-white"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {item}
                </div>
              ))}
            </aside>

            <div className="p-4 sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase text-[#0b63ce]">
                    {t("mockup.ongoing")}
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {t("mockup.exam")}
                  </h3>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t("mockup.active")}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [t("mockup.online"), "48", "bg-blue-600"],
                  [t("mockup.submitted"), "12", "bg-emerald-500"],
                  [t("mockup.offline"), "3", "bg-amber-500"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {label}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="text-2xl font-black text-slate-950">
                        {value}
                      </p>
                      <span className={`h-8 w-8 rounded-xl ${color}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">
                      {t("mockup.status")}
                    </p>
                    <BarChart3 className="h-4 w-4 text-[#0b63ce]" />
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: t("mockup.online"), count: 48, color: "bg-blue-600" },
                      { label: t("mockup.submitted"), count: 12, color: "bg-emerald-500" },
                      { label: t("mockup.offline"), count: 3, color: "bg-amber-500" },
                    ].map((status) => (
                      <div key={status.label}>
                        <div className="mb-2 flex justify-between gap-2 text-xs font-semibold text-slate-600">
                          <span>{status.label}</span>
                          <span>{status.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${status.color}`}
                            style={{ width: `${(status.count / 63) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">
                      {t("mockup.newAlerts")}
                    </p>
                    <LockKeyhole className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="space-y-3">
                    {[
                      t("mockup.tabSwitch"),
                      t("mockup.fullscreenExit"),
                      t("mockup.disconnected"),
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-slate-600">
                          {item}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ type }: { type: "library" | "schedule" | "security" | "analytics" | "ai" | "documents" }) {
  const t = useTranslations("landing");
  if (type === "analytics") {
    return (
      <div className="mt-8 flex h-28 items-end gap-3">
        {[52, 78, 44, 92, 68, 84, 58].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-xl bg-gradient-to-t from-[#0b63ce] to-sky-300"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (type === "ai" || type === "documents") {
    const labels = type === "ai"
      ? [t("visual.matrix"), t("visual.evidence"), t("visual.approval")]
      : [t("visual.pdfPptx"), t("visual.versions"), t("visual.retrieval")];
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        {labels.map((label) => (
          <span key={label} className="rounded-xl border border-blue-100 bg-white/75 px-4 py-3 text-sm font-bold text-slate-700">
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (type === "security") {
    return (
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[t("visual.tabEvents"), t("visual.oneDevice"), t("visual.eventLog")].map(
          (item) => (
            <div
              key={item}
              className="rounded-xl border border-blue-100 bg-white/75 p-3 text-center text-xs font-bold text-slate-600"
            >
              <LockKeyhole className="mx-auto mb-2 h-4 w-4 text-[#0b63ce]" />
              {item}
            </div>
          ),
        )}
      </div>
    );
  }

  if (type === "schedule") {
    return (
      <div className="mt-8 space-y-3">
        {[
          t("visual.schedule"),
          t("visual.duration"),
          t("visual.practice"),
        ].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-white/75 px-4 py-3"
          >
            <span className="text-sm font-bold text-slate-700">{item}</span>
            <Timer className="h-4 w-4 text-[#0b63ce]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      {[
        t("visual.multipleChoice"),
        t("visual.essay"),
        t("visual.multipleAnswers"),
        t("visual.importFiles"),
      ].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-blue-100 bg-white/75 px-4 py-3 text-sm font-bold text-slate-700"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const t = useTranslations("landing");
  const highlights = [
    { value: t("highlights.bank.value"), label: t("highlights.bank.label") },
    { value: t("highlights.ai.value"), label: t("highlights.ai.label") },
    { value: t("highlights.results.value"), label: t("highlights.results.label") },
  ];
  const roles = [
    { title: t("roles.lecturer.title"), description: t("roles.lecturer.description"), icon: BookOpen },
    { title: t("roles.student.title"), description: t("roles.student.description"), icon: GraduationCap },
    { title: t("roles.admin.title"), description: t("roles.admin.description"), icon: Users },
  ];
  const features = [
    {
      title: t("features.library.title"),
      description: t("features.library.description"),
      icon: FileQuestion,
      className: "lg:col-span-2",
      accent: "from-blue-600/12 to-sky-400/8",
      visual: "library",
    },
    {
      title: t("features.schedule.title"),
      description: t("features.schedule.description"),
      icon: Timer,
      className: "",
      accent: "from-cyan-500/12 to-blue-600/8",
      visual: "schedule",
    },
    {
      title: t("features.security.title"),
      description: t("features.security.description"),
      icon: ShieldCheck,
      className: "",
      accent: "from-indigo-500/12 to-blue-600/8",
      visual: "security",
    },
    {
      title: t("features.analytics.title"),
      description: t("features.analytics.description"),
      icon: LineChart,
      className: "lg:col-span-2",
      accent: "from-blue-600/12 to-emerald-400/8",
      visual: "analytics",
    },
    {
      title: t("features.ai.title"),
      description: t("features.ai.description"),
      icon: Sparkles,
      className: "lg:col-span-2",
      accent: "from-blue-600/12 to-cyan-400/8",
      visual: "ai",
    },
    {
      title: t("features.documents.title"),
      description: t("features.documents.description"),
      icon: BookOpen,
      className: "",
      accent: "from-cyan-500/12 to-blue-600/8",
      visual: "documents",
    },
  ] as const;
  const steps = [
    {
      title: t("steps.create.title"),
      description: t("steps.create.description"),
      icon: FileQuestion,
    },
    {
      title: t("steps.invite.title"),
      description: t("steps.invite.description"),
      icon: Users,
    },
    {
      title: t("steps.take.title"),
      description: t("steps.take.description"),
      icon: MonitorCheck,
    },
    {
      title: t("steps.report.title"),
      description: t("steps.report.description"),
      icon: BarChart3,
    },
  ];
  return (
    <main className="min-h-screen bg-[#bdd9ea] text-slate-950">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(189,217,234,0.7)_46%,rgba(189,217,234,1))]" />
        <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-28 lg:pt-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-bold text-[#0b63ce] shadow-sm">
              <Sparkles className="h-4 w-4" />
              {t("hero.eyebrow")}
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.12] tracking-normal text-slate-950 md:text-7xl md:leading-[1.08]">
              {t("hero.title")}
              <span className="block pb-2 bg-gradient-to-r from-[#0b63ce] to-[#04a3d8] bg-clip-text text-transparent">
                {t("hero.highlight")}
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              {t("hero.description")}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-[#0b63ce] px-6 font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-[#0858bb]"
              >
                <Link href="/signup">
                  {t("hero.start")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white/85 px-6 font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0b63ce]"
              >
                <a href="#features">
                  <BookOpen className="h-4 w-4" /> {t("hero.explore")}
                </a>
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {highlights.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur"
                >
                  <p className="text-2xl font-black text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 lg:pl-4">
            <DashboardMockup />
            <p className="relative mt-4 text-center text-xs leading-5 text-slate-600">
              {t("mockup.disclaimer")}
            </p>
          </div>
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t("roles.eyebrow")} title={t("roles.title")} description={t("roles.description")} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <article key={role.title} className="rounded-2xl border border-slate-200 bg-white/75 p-6 shadow-sm">
                <Icon className="h-7 w-7 text-[#0b63ce]" />
                <h3 className="mt-5 text-xl font-black text-slate-950">{role.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{role.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"
      >
        <SectionHeading
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          description={t("features.description")}
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={`group rounded-2xl border border-slate-200 bg-gradient-to-br ${feature.accent} p-px shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md ${feature.className}`}
              >
                <div className="h-full rounded-2xl bg-white/82 p-6 backdrop-blur">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b63ce] text-white shadow-sm shadow-blue-600/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-normal text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    {feature.description}
                  </p>
                  <FeatureVisual type={feature.visual} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t("steps.eyebrow")}
          title={t("steps.title")}
          description={t("steps.description")}
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-white/78 p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#0b63ce]">
                    0{index + 1}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0b63ce]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-8 text-xl font-black text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="get-started"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-blue-200 bg-[#0b63ce] p-8 text-white shadow-md shadow-blue-900/10 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-blue-100">
                {t("cta.eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-normal md:text-4xl">
                {t("cta.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                {t("cta.description")}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-white px-6 font-black text-[#0b63ce] hover:bg-blue-50"
            >
              <Link href="/signup">
                {t("nav.signup")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer id="about" className="mt-16 scroll-mt-24 border-t border-slate-200 bg-white/86">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">{t("footer.description")}</p>
          </div>
          <div>
            <h3 className="font-black text-slate-950">{t("footer.product")}</h3>
            <ul className="mt-5 space-y-3">
              {[
                { label: t("nav.features"), href: "#features" },
                { label: t("nav.workflow"), href: "#workflow" },
                { label: t("nav.roles"), href: "#roles" },
              ].map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm font-medium text-slate-600 hover:text-[#0b63ce]">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-black text-slate-950">{t("footer.access")}</h3>
            <ul className="mt-5 space-y-3">
              <li><Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#0b63ce]">{t("nav.login")}</Link></li>
              <li><Link href="/signup" className="text-sm font-medium text-slate-600 hover:text-[#0b63ce]">{t("nav.signup")}</Link></li>
            </ul>
            <p className="mt-5 text-sm leading-6 text-slate-600">{t("footer.roleNote")}</p>
          </div>
        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
            <p>© 2026 Testhub. {t("footer.rights")}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
