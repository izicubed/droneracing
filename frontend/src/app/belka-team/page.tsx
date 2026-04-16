"use client";

import { useState, useEffect } from "react";

const VALID_LOGIN = "belka";
const VALID_PASSWORD = "Belka2026!";
const SESSION_KEY = "belka_team_auth";

type Tab = "schedule" | "expenses";

// ─── Schedule data ────────────────────────────────────────────────────────────
type Tag = { label: string; color: string };
type Lang = "ru" | "en";

type LangContent = { title: string; desc: string; tags: Tag[] };

type ScheduleItem = {
  time: string;
  emoji: string;
  ru: LangContent;
  en: LangContent;
};



const scheduleItems: ScheduleItem[] = [
  {
    time: "10:00 – 11:00",
    emoji: "📋",
    ru: {
      title: "Прибытие и регистрация",
      desc: "Прибытие участников соревнований. Регистрация пилотов и команд, выдача аккредитации. Работа мандатной комиссии: проверка дронов, контроллеров, аккумуляторов и оборудования на соответствие техническим требованиям категорий.",
      tags: [
        { label: "Организация", color: "bg-zinc-700 text-zinc-300" },
        { label: "Техконтроль", color: "bg-blue-500/20 text-blue-400" },
      ],
    },
    en: {
      title: "Arrival & Registration",
      desc: "Participant arrival and team check-in. Pilots receive accreditation badges and competition materials. The technical committee inspects drones, controllers, batteries, and all equipment for compliance with category requirements.",
      tags: [
        { label: "Organisation", color: "bg-zinc-700 text-zinc-300" },
        { label: "Tech Check", color: "bg-blue-500/20 text-blue-400" },
      ],
    },
  },
  {
    time: "11:00 – 11:15",
    emoji: "📣",
    ru: {
      title: "Общий брифинг и открытие",
      desc: "Приветственное слово организаторов. Объяснение регламента соревнований, порядка вылетов, правил безопасности и процедуры судейства. Официальное открытие соревнований. Обязательно для всех пилотов и членов команд.",
      tags: [
        { label: "Открытие", color: "bg-orange-500/20 text-orange-400" },
        { label: "Брифинг", color: "bg-zinc-700 text-zinc-300" },
      ],
    },
    en: {
      title: "General Briefing & Opening",
      desc: "Welcome address from the organising committee. Full briefing on competition regulations, flight order, safety rules, and judging procedures. Official opening of DRONECON 2026. Attendance is mandatory for all pilots and team members.",
      tags: [
        { label: "Opening", color: "bg-orange-500/20 text-orange-400" },
        { label: "Briefing", color: "bg-zinc-700 text-zinc-300" },
      ],
    },
  },
  {
    time: "11:15 – 12:00",
    emoji: "🛸",
    ru: {
      title: "Тренировочные вылеты",
      desc: "Ознакомительные полёты для всех участников. Возможность облететь трассу, проверить сигнал, настройки видео и курсовые параметры квада. Судьи фиксируют готовность пилотов — результаты не засчитываются.",
      tags: [
        { label: "Тренировка", color: "bg-green-500/20 text-green-400" },
        { label: "Соревнование", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
    en: {
      title: "Practice Flights",
      desc: "Familiarisation laps for all participants. Pilots can survey the course, verify video signal, OSD settings, and tune their quads before racing begins. Judges note pilot readiness — no results are recorded.",
      tags: [
        { label: "Practice", color: "bg-green-500/20 text-green-400" },
        { label: "Competition", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
  },
  {
    time: "12:00 – 14:30",
    emoji: "🎯",
    ru: {
      title: "Квалификация",
      desc: "Первый зачётный этап. Каждый пилот выполняет установленное количество раундов, результаты идут в общий зачёт. По итогам квалификации формируется сетка отборочного этапа. Лучшее время каждого раунда учитывается в финальном рейтинге.",
      tags: [
        { label: "Квалификация", color: "bg-yellow-500/20 text-yellow-400" },
        { label: "Соревнование", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
    en: {
      title: "Qualification",
      desc: "First scored stage. Each pilot completes a set number of rounds; times count toward the overall standings. Qualification results determine the bracket seeding for the elimination round. Best lap per round feeds into the final ranking.",
      tags: [
        { label: "Qualification", color: "bg-yellow-500/20 text-yellow-400" },
        { label: "Competition", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
  },
  {
    time: "14:30 – 15:00",
    emoji: "🍽️",
    ru: {
      title: "Перерыв — обед",
      desc: "Технический перерыв. Пилоты могут зарядить аккумуляторы, провести обслуживание оборудования, пообедать и отдохнуть перед отборочным этапом.",
      tags: [
        { label: "Перерыв", color: "bg-zinc-700 text-zinc-300" },
      ],
    },
    en: {
      title: "Break — Lunch",
      desc: "Technical break. Pilots can charge batteries, perform equipment maintenance, grab lunch, and rest before the elimination rounds begin.",
      tags: [
        { label: "Break", color: "bg-zinc-700 text-zinc-300" },
      ],
    },
  },
  {
    time: "15:00 – 17:00",
    emoji: "⚡",
    ru: {
      title: "Отборочный этап",
      desc: "Гонки на выбывание по результатам квалификации. Пилоты соревнуются в группах, лучшие проходят в финал. Высокий темп, прямые столкновения, максимальная интенсивность. Состав финальных групп определяется по итогам этого этапа.",
      tags: [
        { label: "Отбор", color: "bg-orange-500/20 text-orange-400" },
        { label: "Соревнование", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
    en: {
      title: "Elimination Round",
      desc: "Head-to-head knockout races seeded by qualification results. Pilots compete in groups; top finishers advance to the final. High pace, direct battles, maximum intensity — finalists are determined here.",
      tags: [
        { label: "Elimination", color: "bg-orange-500/20 text-orange-400" },
        { label: "Competition", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
  },
  {
    time: "17:00 – 17:45",
    emoji: "🏁",
    ru: {
      title: "Финальный этап",
      desc: "Решающие гонки между лучшими пилотами соревнований. Финал определяет победителей и призёров во всех категориях. Прямая трансляция, комментаторы, максимальный накал — лучший момент дня для зрителей и участников.",
      tags: [
        { label: "Финал", color: "bg-red-500/20 text-red-400" },
        { label: "Соревнование", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
    en: {
      title: "Final Round",
      desc: "The decisive races between the top pilots of the day. The final crowns the winners and podium finishers across all categories. Live coverage, commentary, and maximum atmosphere — the highlight of the event.",
      tags: [
        { label: "Final", color: "bg-red-500/20 text-red-400" },
        { label: "Competition", color: "bg-purple-500/20 text-purple-400" },
      ],
    },
  },
  {
    time: "17:45 – 18:00",
    emoji: "🏆",
    ru: {
      title: "Награждение и закрытие",
      desc: "Торжественное награждение победителей и призёров соревнований — кубки, медали, призы. Слово организаторов и почётных гостей. Официальное закрытие соревнований DRONECON 2026.",
      tags: [
        { label: "Церемония", color: "bg-yellow-500/20 text-yellow-400" },
        { label: "Закрытие", color: "bg-zinc-700 text-zinc-300" },
      ],
    },
    en: {
      title: "Award Ceremony & Closing",
      desc: "Presentation of trophies, medals, and prizes to the winners and podium finishers. Closing remarks from organisers and honoured guests. Official closing of DRONECON 2026.",
      tags: [
        { label: "Ceremony", color: "bg-yellow-500/20 text-yellow-400" },
        { label: "Closing", color: "bg-zinc-700 text-zinc-300" },
      ],
    },
  },
];

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
  const [lang, setLang] = useState<Lang>("en");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-1">DRONECON 2026</p>
          <h2 className="text-xl font-black text-white mb-1">
            {lang === "ru" ? "Программа соревнований" : "Competition Schedule"}
          </h2>
          <p className="text-orange-400 text-sm font-semibold">
            {lang === "ru" ? "Улан-Батор, Монголия · 30 мая 2026" : "Ulaanbaatar, Mongolia · May 30, 2026"}
          </p>
        </div>

        {/* Language toggle */}
        <div className="flex shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {(["ru", "en"] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition ${
                lang === l
                  ? "bg-orange-500 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-0">
        <div className="absolute left-[19px] top-5 bottom-5 w-px bg-zinc-800 z-0" />

        {scheduleItems.map((item, i) => {
          const t = item[lang];
          return (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Emoji bubble */}
              <div className="shrink-0 z-10 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg">
                {item.emoji}
              </div>

              {/* Card */}
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-orange-500 text-xs font-mono font-bold tabular-nums whitespace-nowrap">
                    {item.time}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map(tag => (
                      <span key={tag.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tag.color}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-white text-sm font-bold mb-1">{t.title}</p>
                <p className="text-zinc-500 text-xs leading-relaxed">{t.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
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
