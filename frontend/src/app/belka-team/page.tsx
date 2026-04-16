"use client";

import { useState, useEffect } from "react";

const VALID_LOGIN = "belka";
const VALID_PASSWORD = "Belka2026!";
const SESSION_KEY = "belka_team_auth";

type Tab = "schedule" | "expenses";

// ─── Schedule data ────────────────────────────────────────────────────────────
type Tag = { label: string; color: string };
type Lang = "ru" | "en";
type DayKey = "day1" | "day2";

type LangContent = { title: string; desc: string; tags: Tag[] };
type EventSlot = { emoji: string; ru: LangContent; en: LangContent };

// A row is either a single full-width event, or two parallel events side-by-side
type ScheduleRow =
  | { kind: "single";   time: string; event: EventSlot }
  | { kind: "parallel"; time: string; left: EventSlot; right: EventSlot };

type ScheduleDay = {
  ru: { label: string; subtitle: string };
  en: { label: string; subtitle: string };
  rows: ScheduleRow[];
};

// Tag presets
const T = {
  org:   { ru: { label: "Организация",  color: "bg-zinc-700 text-zinc-300"        }, en: { label: "Organisation",  color: "bg-zinc-700 text-zinc-300"        } },
  tech:  { ru: { label: "Техконтроль",  color: "bg-blue-500/20 text-blue-400"     }, en: { label: "Tech Check",    color: "bg-blue-500/20 text-blue-400"     } },
  openv: { ru: { label: "Открытие",     color: "bg-[oklch(69.6%_0.17_162.48)]/20 text-[oklch(69.6%_0.17_162.48)]" }, en: { label: "Opening",       color: "bg-[oklch(69.6%_0.17_162.48)]/20 text-[oklch(69.6%_0.17_162.48)]" } },
  brief: { ru: { label: "Брифинг",      color: "bg-zinc-700 text-zinc-300"        }, en: { label: "Briefing",      color: "bg-zinc-700 text-zinc-300"        } },
  prac:  { ru: { label: "Тренировка",   color: "bg-green-500/20 text-green-400"   }, en: { label: "Practice",      color: "bg-green-500/20 text-green-400"   } },
  qual:  { ru: { label: "Квалификация", color: "bg-yellow-500/20 text-yellow-400" }, en: { label: "Qualification", color: "bg-yellow-500/20 text-yellow-400" } },
  elim:  { ru: { label: "Elimination",  color: "bg-[oklch(69.6%_0.17_162.48)]/20 text-[oklch(69.6%_0.17_162.48)]" }, en: { label: "Elimination",   color: "bg-[oklch(69.6%_0.17_162.48)]/20 text-[oklch(69.6%_0.17_162.48)]" } },
  final: { ru: { label: "Финал",        color: "bg-red-500/20 text-red-400"       }, en: { label: "Final",         color: "bg-red-500/20 text-red-400"       } },
  award: { ru: { label: "Церемония",    color: "bg-yellow-500/20 text-yellow-400" }, en: { label: "Ceremony",      color: "bg-yellow-500/20 text-yellow-400" } },
  close: { ru: { label: "Закрытие",     color: "bg-zinc-700 text-zinc-300"        }, en: { label: "Closing",       color: "bg-zinc-700 text-zinc-300"        } },
  pause: { ru: { label: "Перерыв",      color: "bg-zinc-700 text-zinc-300"        }, en: { label: "Break",         color: "bg-zinc-700 text-zinc-300"        } },
  oc:    { ru: { label: "Open Class",   color: "bg-sky-500/20 text-sky-400"       }, en: { label: "Open Class",    color: "bg-sky-500/20 text-sky-400"       } },
  whoop: { ru: { label: "Tiny Whoop",   color: "bg-pink-500/20 text-pink-400"     }, en: { label: "Tiny Whoop",    color: "bg-pink-500/20 text-pink-400"     } },
};

function t(lang: Lang, ...keys: (keyof typeof T)[]): Tag[] {
  return keys.map(k => T[k][lang]);
}

const scheduleDays: Record<DayKey, ScheduleDay> = {
  day1: {
    ru: { label: "День 1 — 30 мая", subtitle: "Тренировки и квалификация" },
    en: { label: "Day 1 — May 30",  subtitle: "Practice & Qualification"  },
    rows: [
      { kind: "single", time: "10:00 – 11:00", event: {
        emoji: "📋",
        ru: { title: "Прибытие и регистрация", tags: t("ru", "org", "tech"),
          desc: "Прибытие участников Open Class и Tiny Whoop. Регистрация пилотов и команд, выдача аккредитации. Работа мандатной комиссии: проверка дронов, контроллеров, аккумуляторов и оборудования на соответствие техническим требованиям категорий." },
        en: { title: "Arrival & Registration", tags: t("en", "org", "tech"),
          desc: "Arrival of Open Class and Tiny Whoop participants. Pilot and team check-in, accreditation badges issued. Technical committee inspects all drones, controllers, batteries, and equipment for compliance with category requirements." },
      }},
      { kind: "single", time: "11:00 – 11:15", event: {
        emoji: "📣",
        ru: { title: "Общий брифинг и открытие соревнований", tags: t("ru", "openv", "brief"),
          desc: "Приветственное слово организаторов. Объяснение регламента для Open Class и Tiny Whoop, порядка вылетов, правил безопасности и процедуры судейства. Официальное открытие. Обязательно для всех пилотов." },
        en: { title: "General Briefing & Opening Ceremony", tags: t("en", "openv", "brief"),
          desc: "Welcome from the organising committee. Full briefing on regulations for Open Class and Tiny Whoop — flight order, safety rules, and judging procedures. Official opening of DRONECON 2026. Mandatory for all pilots." },
      }},
      { kind: "single", time: "11:15 – 13:30", event: {
        emoji: "🛸",
        ru: { title: "Тренировочные вылеты", tags: t("ru", "prac", "oc", "whoop"),
          desc: "Расширенный блок тренировочных вылетов для обеих дисциплин. Пилоты поочерёдно облетают трассу, проверяют сигнал, настройки видео и параметры квада. Результаты не засчитываются. Достаточно времени для полноценной подготовки." },
        en: { title: "Practice Flights", tags: t("en", "prac", "oc", "whoop"),
          desc: "Extended practice block for both disciplines. Pilots take turns on track to survey the course, verify video signal, OSD settings, and tune their quads. No results recorded. Ample time for full preparation." },
      }},
      { kind: "single", time: "13:30 – 14:00", event: {
        emoji: "🍽️",
        ru: { title: "Перерыв — обед", tags: t("ru", "pause"),
          desc: "Технический перерыв. Пилоты могут зарядить аккумуляторы, провести обслуживание оборудования и пообедать перед квалификацией." },
        en: { title: "Break — Lunch", tags: t("en", "pause"),
          desc: "Technical break. Pilots can charge batteries, perform maintenance, and have lunch before qualification begins." },
      }},
      { kind: "parallel", time: "14:00 – 17:30",
        left: {
          emoji: "🎯",
          ru: { title: "Квалификация — Open Class", tags: t("ru", "qual", "oc"),
            desc: "Квалификационные раунды Open Class. Каждый пилот выполняет несколько заходов, лучшее время идёт в зачёт. По результатам формируется сетка отборочных раундов второго дня." },
          en: { title: "Qualification — Open Class", tags: t("en", "qual", "oc"),
            desc: "Open Class qualification rounds. Each pilot completes multiple runs; best times feed into the standings and seed the Day 2 elimination bracket." },
        },
        right: {
          emoji: "🐝",
          ru: { title: "Квалификация — Tiny Whoop", tags: t("ru", "qual", "whoop"),
            desc: "Квалификационные раунды Tiny Whoop на отдельной трассе. Пилоты выполняют несколько заходов, лучшее время определяет позицию в сетке второго дня." },
          en: { title: "Qualification — Tiny Whoop", tags: t("en", "qual", "whoop"),
            desc: "Tiny Whoop qualification rounds on a separate course. Pilots complete multiple runs; best times determine bracket seeding for Day 2." },
        },
      },
      { kind: "single", time: "17:30 – 18:00", event: {
        emoji: "📊",
        ru: { title: "Итоги дня", tags: t("ru", "org"),
          desc: "Подведение итогов первого дня. Публикация промежуточных таблиц квалификации Open Class и Tiny Whoop. Информация об организации второго дня." },
        en: { title: "End of Day 1", tags: t("en", "org"),
          desc: "Preliminary Day 1 results published. Intermediate qualification standings for both Open Class and Tiny Whoop. Organisational info for Day 2." },
      }},
    ],
  },
  day2: {
    ru: { label: "День 2 — 31 мая", subtitle: "Квалификация, Elimination и финалы" },
    en: { label: "Day 2 — May 31",  subtitle: "Qualification, Elimination & Finals" },
    rows: [
      { kind: "single", time: "09:00 – 09:15", event: {
        emoji: "📣",
        ru: { title: "Утренний брифинг", tags: t("ru", "brief"),
          desc: "Брифинг перед Elimination раундами. Судьи подтверждают результаты квалификации, объясняют сетку и порядок отборочных и финальных заездов для обеих дисциплин." },
        en: { title: "Morning Briefing", tags: t("en", "brief"),
          desc: "Briefing before elimination rounds. Judges confirm qualification results, explain the bracket, and outline the schedule for both disciplines." },
      }},
      { kind: "parallel", time: "09:15 – 11:00",
        left: {
          emoji: "🎯",
          ru: { title: "Квалификация — Open Class (финальные раунды)", tags: t("ru", "qual", "oc"),
            desc: "Последние квалификационные раунды Open Class. Последний шанс улучшить позицию в таблице перед финальной сеткой Elimination." },
          en: { title: "Qualification — Open Class (final rounds)", tags: t("en", "qual", "oc"),
            desc: "Final Open Class qualification rounds. Last chance for pilots to improve their bracket position before the elimination draw is locked." },
        },
        right: {
          emoji: "🐝",
          ru: { title: "Квалификация — Tiny Whoop (финальные раунды)", tags: t("ru", "qual", "whoop"),
            desc: "Завершающие квалификационные заезды Tiny Whoop. По окончании формируется финальная сетка отборочного этапа." },
          en: { title: "Qualification — Tiny Whoop (final rounds)", tags: t("en", "qual", "whoop"),
            desc: "Final Tiny Whoop qualification heats. Elimination bracket is locked on completion." },
        },
      },
      { kind: "single", time: "11:00 – 11:30", event: {
        emoji: "📊",
        ru: { title: "Объявление сеток Elimination", tags: t("ru", "org"),
          desc: "Официальное объявление финальных таблиц квалификации и сеток Elimination для Open Class и Tiny Whoop. Публикация на стендах и в официальных каналах." },
        en: { title: "Elimination Bracket Announcement", tags: t("en", "org"),
          desc: "Official announcement of final qualification standings and elimination brackets for Open Class and Tiny Whoop. Published on notice boards and official channels." },
      }},
      { kind: "single", time: "11:30 – 12:00", event: {
        emoji: "🍽️",
        ru: { title: "Перерыв — обед", tags: t("ru", "pause"),
          desc: "Технический перерыв перед Elimination. Зарядка аккумуляторов, финальная настройка оборудования, обед." },
        en: { title: "Break — Lunch", tags: t("en", "pause"),
          desc: "Technical break before elimination. Battery charging, final equipment tuning, lunch." },
      }},
      { kind: "parallel", time: "12:00 – 14:30",
        left: {
          emoji: "⚡",
          ru: { title: "Elimination — Open Class", tags: t("ru", "elim", "oc"),
            desc: "Отборочные гонки Open Class на выбывание. Пилоты соревнуются по сетке, победители проходят в следующий раунд. Высокий темп, прямые дуэли, максимальная конкуренция." },
          en: { title: "Elimination — Open Class", tags: t("en", "elim", "oc"),
            desc: "Open Class head-to-head knockout rounds. Pilots race in bracketed groups; winners advance. High pace, direct duels, maximum competition intensity." },
        },
        right: {
          emoji: "🐝",
          ru: { title: "Elimination — Tiny Whoop", tags: t("ru", "elim", "whoop"),
            desc: "Отборочный этап Tiny Whoop на отдельной трассе. Гонки на выбывание по сетке квалификации, победители проходят в финал." },
          en: { title: "Elimination — Tiny Whoop", tags: t("en", "elim", "whoop"),
            desc: "Tiny Whoop knockout elimination on a separate course. Races seeded by qualification results; winners advance to the final." },
        },
      },
      { kind: "single", time: "14:30 – 15:00", event: {
        emoji: "🔧",
        ru: { title: "Техническая подготовка к финалу", tags: t("ru", "pause"),
          desc: "Финалисты обеих дисциплин проводят финальную проверку оборудования и краткие тестовые вылеты перед решающими заездами." },
        en: { title: "Technical Preparation for Finals", tags: t("en", "pause"),
          desc: "Finalists in both disciplines complete final equipment checks and brief test runs before the decisive heats." },
      }},
      { kind: "parallel", time: "15:00 – 16:30",
        left: {
          emoji: "🏁",
          ru: { title: "Финал — Open Class", tags: t("ru", "final", "oc"),
            desc: "Финальные заезды Open Class — решающие гонки между лучшими пилотами чемпионата. Определяются победитель и призёры. Прямая трансляция, комментаторы, максимальный накал." },
          en: { title: "Final — Open Class", tags: t("en", "final", "oc"),
            desc: "Open Class finals — decisive races between the top pilots of the championship. Winner and podium finishers determined. Live coverage, commentary, peak atmosphere." },
        },
        right: {
          emoji: "🐝",
          ru: { title: "Финал — Tiny Whoop", tags: t("ru", "final", "whoop"),
            desc: "Финальные гонки Tiny Whoop на отдельной трассе. Определяются победитель и призёры категории." },
          en: { title: "Final — Tiny Whoop", tags: t("en", "final", "whoop"),
            desc: "Tiny Whoop finals on a separate course. Winner and podium of the Tiny Whoop category are determined." },
        },
      },
      { kind: "single", time: "17:00 – 17:45", event: {
        emoji: "🏆",
        ru: { title: "Награждение победителей и призёров", tags: t("ru", "award"),
          desc: "Торжественное награждение победителей и призёров Open Class и Tiny Whoop — кубки, медали, призы. Слово организаторов и почётных гостей. Общее фото участников." },
        en: { title: "Award Ceremony", tags: t("en", "award"),
          desc: "Presentation of trophies, medals, and prizes to Open Class and Tiny Whoop winners and podium finishers. Closing remarks from organisers. Group photo of all participants." },
      }},
      { kind: "single", time: "17:45 – 18:00", event: {
        emoji: "🎉",
        ru: { title: "Закрытие соревнований", tags: t("ru", "close"),
          desc: "Официальное закрытие DRONECON 2026. Участники приглашаются к неформальному общению и обмену опытом." },
        en: { title: "Closing of DRONECON 2026", tags: t("en", "close"),
          desc: "Official closing of DRONECON 2026. Participants are invited to stay for informal networking and experience sharing." },
      }},
    ],
  },
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
  { name: "Коля (Cubed)", paid: 85.7, color: "text-[oklch(69.6%_0.17_162.48)]" },
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
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 font-mono">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em] mb-1">Закрытый раздел</p>
          <h1 className="text-2xl font-black text-white tracking-tight">belka<span className="text-[oklch(69.6%_0.17_162.48)]">-team</span></h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Логин</label>
            <input
              type="text"
              autoComplete="username"
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[oklch(69.6%_0.17_162.48)] transition"
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
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[oklch(69.6%_0.17_162.48)] transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-xl bg-[oklch(69.6%_0.17_162.48)]/15 text-[oklch(69.6%_0.17_162.48)] border border-[oklch(69.6%_0.17_162.48)]/30 hover:bg-[oklch(69.6%_0.17_162.48)]/25 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Проверка..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ─── Event card (reusable) ────────────────────────────────────────────────────
function EventCard({ event, lang, border }: { event: EventSlot; lang: Lang; border?: string }) {
  const c = event[lang];
  return (
    <div className={`flex-1 bg-zinc-900 border rounded-xl px-3 py-3 min-w-0 ${border ?? "border-zinc-800"}`}>
      <div className="flex items-center gap-2 mb-2 text-xl leading-none">{event.emoji}</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {c.tags.map(tag => (
          <span key={tag.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tag.color}`}>
            {tag.label}
          </span>
        ))}
      </div>
      <p className="text-white text-sm font-bold mb-1 leading-snug">{c.title}</p>
      <p className="text-zinc-500 text-xs leading-relaxed">{c.desc}</p>
    </div>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────
function ScheduleTab() {
  const [lang, setLang] = useState<Lang>("en");
  const [day, setDay] = useState<DayKey>("day1");

  const currentDay = scheduleDays[day];
  const dayMeta = currentDay[lang];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-1">DRONECON 2026</p>
          <h2 className="text-xl font-black text-white mb-0.5">
            {lang === "ru" ? "Программа соревнований" : "Competition Schedule"}
          </h2>
          <p className="text-zinc-500 text-xs">
            {lang === "ru" ? "Улан-Батор, Монголия · 30–31 мая 2026" : "Ulaanbaatar, Mongolia · May 30–31, 2026"}
          </p>
        </div>
        <div className="flex shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {(["ru", "en"] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition ${lang === l ? "bg-[oklch(69.6%_0.17_162.48)] text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 mb-6">
        {(["day1", "day2"] as DayKey[]).map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-left transition ${
              day === d
                ? "bg-[oklch(69.6%_0.17_162.48)]/15 border-[oklch(69.6%_0.17_162.48)]/40 text-[oklch(69.6%_0.17_162.48)]"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}>
            <div className="text-xs font-black">{scheduleDays[d][lang].label}</div>
            <div className={`text-[10px] font-normal mt-0.5 ${day === d ? "text-[oklch(69.6%_0.17_162.48)]/70" : "text-zinc-600"}`}>
              {scheduleDays[d][lang].subtitle}
            </div>
          </button>
        ))}
      </div>

      {/* Discipline legend (shown only when parallel events exist) */}
      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-sky-500/40 border border-sky-500/60" />
          <span className="text-[10px] text-zinc-500">Open Class</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-pink-500/40 border border-pink-500/60" />
          <span className="text-[10px] text-zinc-500">Tiny Whoop</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-4">
        {currentDay.rows.map((row, i) => (
          <div key={i}>
            {/* Time label */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[oklch(69.6%_0.17_162.48)] text-xs font-mono font-bold tabular-nums whitespace-nowrap">
                {row.time}
              </span>
              {row.kind === "parallel" && (
                <span className="text-[10px] text-zinc-700 italic">
                  {lang === "ru" ? "параллельно" : "parallel"}
                </span>
              )}
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {row.kind === "single" ? (
              <EventCard event={row.event} lang={lang} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <EventCard event={row.left}  lang={lang} border="border-sky-500/30"  />
                <EventCard event={row.right} lang={lang} border="border-pink-500/30" />
              </div>
            )}
          </div>
        ))}
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
          <p className="text-[oklch(69.6%_0.17_162.48)] font-black text-lg tabular-nums">
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
    <main className="min-h-screen bg-zinc-950 flex flex-col font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em]">Закрытый раздел</p>
          <h1 className="text-lg font-black italic text-white leading-tight tracking-wide">
            BELKA TEAM
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
                  ? "border-[oklch(69.6%_0.17_162.48)] text-[oklch(69.6%_0.17_162.48)]"
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
