"use client";

import { useState, useEffect } from "react";

const VALID_LOGIN = "belka";
const VALID_PASSWORD = "Belka2026!";
const SESSION_KEY = "belka_team_auth";

type Tab = "schedule" | "expenses";

// ─── Schedule data (DRONECON 2026) ───────────────────────────────────────────
const scheduleData = {
  title: "DRONECON 2026 Participant Schedule",
  subtitle: "May 30–31, 2026 | Ulaanbaatar, Mongolia",
  intro:
    "DRONECON 2026 welcomes all registered pilots, teams, and participants to the International Championship. Please review the participant schedule and key procedures below to ensure smooth registration, technical verification, and competition readiness. The official program includes registration, technical inspection, briefing sessions, preliminary rounds, semi-finals, finals, and the award ceremony across two competition days.",
  days: [
    {
      label: "Day 1 — May 30, 2026",
      sectionTitle:
        "Registration, Technical Verification, Briefing, and Preliminary Competition",
      items: [
        {
          time: "08:00–09:00",
          title: "Participant Registration",
          desc: "All domestic and international participants, teams, and delegates must complete registration during this time. Accreditation badges and participant identification will be issued, and competition materials, including technical requirements, flight sequence, and safety instructions, will be distributed.",
        },
        {
          time: "08:30–09:00",
          title: "Technical Inspection and Verification",
          desc: "All drones, controllers, batteries, and communication equipment will undergo technical inspection. Compliance with category requirements, technical standards, and safety conditions will be verified before confirming eligibility to compete.",
        },
        {
          time: "09:00–09:20",
          title: "General Participant Briefing",
          desc: "Participants will receive an introduction to the competition structure, rules, flight order, safety procedures, emergency protocols, and the responsibilities of pilots, coaches, judges, and technical staff. Attendance is strongly recommended for all competitors.",
        },
        {
          time: "10:00–12:30",
          title: "Preliminary Competition Round",
          desc: "The first stage of the competition will begin, including flight skill challenges, precision tests, and stable control evaluation. Performance will be scored based on timing and execution under official judge supervision.",
        },
        {
          time: "12:30–13:30",
          title: "Lunch Break",
          desc: "Participants may use this time to rest, network, and visit designated activity areas.",
        },
        {
          time: "15:00–16:00",
          title: "Technical Practice Flights",
          desc: "Participants will have the opportunity to conduct familiarization flights within the competition environment, check signals and technical setup, and review the course, obstacles, and landing zones.",
        },
        {
          time: "17:30–18:30",
          title: "Opening Ceremony",
          desc: "The official opening ceremony will be held for all participants, teams, and invited guests. Representatives of the organizing committee and sponsors will address the audience, and the competition draw will be announced.",
        },
        {
          time: "19:00–21:00",
          title: "Welcome Dinner",
          desc: "A welcome dinner is organized for all registered participants and their teams. This is an opportunity to meet fellow competitors and exchange experience in an informal setting.",
        },
      ],
    },
    {
      label: "Day 2 — May 31, 2026",
      sectionTitle: "Semi-Finals, Finals, and Award Ceremony",
      items: [
        {
          time: "08:00–08:30",
          title: "Morning Briefing",
          desc: "Final briefing before the elimination rounds. Judges will confirm flight order, rules for semi-finals and finals, and scoring procedures.",
        },
        {
          time: "09:00–12:00",
          title: "Semi-Final Rounds",
          desc: "The top-ranked pilots from the preliminary round will compete in head-to-head elimination matches. Flight sequences and bracket assignments will be posted at the registration desk.",
        },
        {
          time: "12:00–13:00",
          title: "Lunch Break",
          desc: "Participants and spectators may use this time to rest and visit exhibition areas.",
        },
        {
          time: "13:00–14:00",
          title: "Technical Preparation for Finals",
          desc: "Finalist pilots will have access to the track for final equipment checks and brief practice runs before the championship round.",
        },
        {
          time: "14:30–17:00",
          title: "Final Competition Round",
          desc: "The championship final will take place with all qualified finalists. Spectators are welcome on the designated viewing platforms. Live commentary and real-time scoring will be available.",
        },
        {
          time: "17:30–18:30",
          title: "Award Ceremony",
          desc: "Winners of all categories will be announced and presented with trophies, medals, and prizes. Photographs and interviews with the organizing committee will follow the ceremony.",
        },
        {
          time: "19:00",
          title: "Closing & Farewell",
          desc: "Official closing of DRONECON 2026. Participants are invited to stay for informal networking before departure.",
        },
      ],
    },
  ],
};

// ─── Expenses data (Монголия.md, 16.04.2026) ─────────────────────────────────
const expensesData = [
  {
    id: 1,
    category: "Оборудование",
    description: "Raspberry Pi 4",
    paidBy: "Женя (Alias)",
    amount: 250,
    currency: "BYN",
  },
  {
    id: 2,
    category: "Оборудование",
    description: "Комплект для сборки засечки",
    paidBy: "Коля (Cubed)",
    amount: 85.7,
    currency: "BYN",
    note: "~3000 RUB по курсу 35 RUB/BYN",
  },
  {
    id: 3,
    category: "Доставка",
    description: "Отправка засечки в Алма-Аты",
    paidBy: "Женя (Alias)",
    amount: 60,
    currency: "BYN",
  },
];

const balance = [
  { name: "Женя (Alias)", paid: 310, color: "text-blue-400" },
  { name: "Коля (Cubed)", paid: 85.7, color: "text-orange-400" },
  { name: "Андрей (Tisha)", paid: 0, color: "text-zinc-400" },
];

const categoryColors: Record<string, string> = {
  Оборудование: "bg-yellow-500/20 text-yellow-400",
  Доставка: "bg-blue-500/20 text-blue-400",
};

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (login.trim() === VALID_LOGIN && password === VALID_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, "1");
        onSuccess();
      } else {
        setError("Неверный логин или пароль");
      }
      setLoading(false);
    }, 400);
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em] mb-1">Закрытый раздел</p>
          <h1 className="text-2xl font-black text-white tracking-tight">belka<span className="text-orange-500">-team</span></h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Логин</label>
            <input
              type="text"
              autoComplete="username"
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500 transition"
              placeholder="логин"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Пароль</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Проверка..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────
function ScheduleTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-black text-white mb-1">{scheduleData.title}</h2>
        <p className="text-orange-400 text-sm font-semibold mb-3">{scheduleData.subtitle}</p>
        <p className="text-zinc-400 text-sm leading-relaxed">{scheduleData.intro}</p>
      </div>

      {scheduleData.days.map((day, di) => (
        <div key={di} className="mb-8">
          <div className="border-b border-zinc-800 pb-2 mb-4">
            <h3 className="text-lg font-black text-orange-400">{day.label}</h3>
            <p className="text-zinc-400 text-xs mt-0.5">{day.sectionTitle}</p>
          </div>

          <div className="flex flex-col gap-4">
            {day.items.map((item, ii) => (
              <div key={ii} className="flex gap-3">
                <div className="shrink-0 pt-0.5">
                  <span className="text-orange-500 text-xs font-mono font-bold tabular-nums whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
                <div className="flex-1 border-l border-zinc-800 pl-3">
                  <p className="text-white text-sm font-bold mb-0.5">{item.title}</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Expenses tab ─────────────────────────────────────────────────────────────
function ExpensesTab() {
  const totalBYN = expensesData.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white">Расходы — Монголия</h2>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Итого</p>
          <p className="text-orange-400 font-black text-lg tabular-nums">
            {totalBYN.toFixed(1)} BYN
          </p>
        </div>
      </div>

      {/* Expense list */}
      <div className="flex flex-col gap-2 mb-8">
        {expensesData.map(e => (
          <div
            key={e.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[e.category] ?? "bg-zinc-700 text-zinc-400"}`}>
                  {e.category}
                </span>
                <span className="text-zinc-500 text-[10px]">оплатил: {e.paidBy}</span>
              </div>
              <p className="text-white text-sm">{e.description}</p>
              {e.note && <p className="text-zinc-600 text-[10px] mt-0.5">{e.note}</p>}
            </div>
            <span className="text-white font-black tabular-nums text-sm whitespace-nowrap">
              {e.amount.toFixed(1)} BYN
            </span>
          </div>
        ))}
      </div>

      {/* Balance */}
      <div className="border-t border-zinc-800 pt-6">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Баланс участников</p>
        <div className="flex flex-col gap-2">
          {balance.map(p => (
            <div key={p.name} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <span className="text-white text-sm font-bold">{p.name}</span>
              <span className={`font-black tabular-nums text-sm ${p.paid > 0 ? p.color : "text-zinc-600"}`}>
                {p.paid > 0 ? `${p.paid.toFixed(1)} BYN` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("schedule");

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em]">Закрытый раздел</p>
          <h1 className="text-lg font-black text-white leading-tight">
            belka<span className="text-orange-500">-team</span>
          </h1>
        </div>
        <button
          onClick={onLogout}
          className="text-[10px] text-zinc-600 uppercase tracking-widest hover:text-red-400 transition"
        >
          Выйти
        </button>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 px-6">
        <div className="flex gap-6">
          {(["schedule", "expenses"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition ${
                tab === t
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t === "schedule" ? "Расписание" : "Расходы"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        {tab === "schedule" ? <ScheduleTab /> : <ExpensesTab />}
      </div>
    </main>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function BelkaTeamPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }

  // Avoid flash of login screen on authed reload
  if (authed === null) return null;

  return authed
    ? <Dashboard onLogout={logout} />
    : <LoginScreen onSuccess={() => setAuthed(true)} />;
}
