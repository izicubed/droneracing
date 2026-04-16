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

type ScheduleItem = {
  time: string;
  emoji: string;
  ru: LangContent;
  en: LangContent;
};

type ScheduleDay = {
  ru: { label: string; subtitle: string };
  en: { label: string; subtitle: string };
  items: ScheduleItem[];
};

// Shared tag presets
const T = {
  org:    { ru: { label: "Организация",  color: "bg-zinc-700 text-zinc-300"      }, en: { label: "Organisation",  color: "bg-zinc-700 text-zinc-300"      } },
  tech:   { ru: { label: "Техконтроль",  color: "bg-blue-500/20 text-blue-400"   }, en: { label: "Tech Check",    color: "bg-blue-500/20 text-blue-400"   } },
  open:   { ru: { label: "Открытие",     color: "bg-orange-500/20 text-orange-400" }, en: { label: "Opening",     color: "bg-orange-500/20 text-orange-400" } },
  brief:  { ru: { label: "Брифинг",      color: "bg-zinc-700 text-zinc-300"      }, en: { label: "Briefing",      color: "bg-zinc-700 text-zinc-300"      } },
  prac:   { ru: { label: "Тренировка",   color: "bg-green-500/20 text-green-400" }, en: { label: "Practice",      color: "bg-green-500/20 text-green-400" } },
  comp:   { ru: { label: "Соревнование", color: "bg-purple-500/20 text-purple-400" }, en: { label: "Competition", color: "bg-purple-500/20 text-purple-400" } },
  qual:   { ru: { label: "Квалификация", color: "bg-yellow-500/20 text-yellow-400" }, en: { label: "Qualification", color: "bg-yellow-500/20 text-yellow-400" } },
  elim:   { ru: { label: "Отбор",        color: "bg-orange-500/20 text-orange-400" }, en: { label: "Elimination",  color: "bg-orange-500/20 text-orange-400" } },
  final:  { ru: { label: "Финал",        color: "bg-red-500/20 text-red-400"     }, en: { label: "Final",         color: "bg-red-500/20 text-red-400"     } },
  award:  { ru: { label: "Церемония",    color: "bg-yellow-500/20 text-yellow-400" }, en: { label: "Ceremony",   color: "bg-yellow-500/20 text-yellow-400" } },
  close:  { ru: { label: "Закрытие",     color: "bg-zinc-700 text-zinc-300"      }, en: { label: "Closing",       color: "bg-zinc-700 text-zinc-300"      } },
  pause:  { ru: { label: "Перерыв",      color: "bg-zinc-700 text-zinc-300"      }, en: { label: "Break",         color: "bg-zinc-700 text-zinc-300"      } },
  fpv:    { ru: { label: "FPV Racing",   color: "bg-sky-500/20 text-sky-400"     }, en: { label: "FPV Racing",    color: "bg-sky-500/20 text-sky-400"     } },
  whoop:  { ru: { label: "Tiny Whoop",   color: "bg-pink-500/20 text-pink-400"   }, en: { label: "Tiny Whoop",    color: "bg-pink-500/20 text-pink-400"   } },
};

function tags(lang: Lang, ...keys: (keyof typeof T)[]): Tag[] {
  return keys.map(k => T[k][lang]);
}

const scheduleDays: Record<DayKey, ScheduleDay> = {
  day1: {
    ru: { label: "День 1 — 30 мая", subtitle: "Тренировки и квалификация" },
    en: { label: "Day 1 — May 30", subtitle: "Practice & Qualification" },
    items: [
      {
        time: "10:00 – 11:00",
        emoji: "📋",
        ru: { title: "Прибытие и регистрация", tags: tags("ru", "org", "tech"),
          desc: "Прибытие участников соревнований FPV Racing и Tiny Whoop. Регистрация пилотов и команд, выдача аккредитации. Работа мандатной комиссии: проверка дронов, контроллеров, аккумуляторов и оборудования на соответствие техническим требованиям категорий." },
        en: { title: "Arrival & Registration", tags: tags("en", "org", "tech"),
          desc: "Arrival of FPV Racing and Tiny Whoop participants. Pilot and team check-in, accreditation badges issued. Technical committee inspects all drones, controllers, batteries, and equipment for compliance with category requirements." },
      },
      {
        time: "11:00 – 11:15",
        emoji: "📣",
        ru: { title: "Общий брифинг и открытие соревнований", tags: tags("ru", "open", "brief"),
          desc: "Приветственное слово организаторов. Объяснение регламента для обеих дисциплин — FPV Racing и Tiny Whoop, порядка вылетов, правил безопасности и процедуры судейства. Официальное открытие. Обязательно для всех пилотов." },
        en: { title: "General Briefing & Opening Ceremony", tags: tags("en", "open", "brief"),
          desc: "Welcome from the organising committee. Full briefing on regulations for both disciplines — FPV Racing and Tiny Whoop — flight order, safety rules, and judging procedures. Official opening of DRONECON 2026. Mandatory for all pilots." },
      },
      {
        time: "11:15 – 13:30",
        emoji: "🛸",
        ru: { title: "Тренировочные вылеты", tags: tags("ru", "prac", "fpv", "whoop"),
          desc: "Расширенный блок тренировочных вылетов для обеих дисциплин. FPV-пилоты и Tiny Whoop пилоты поочерёдно облетают трассу, проверяют сигнал, настройки видео и параметры квада. Результаты не засчитываются. Достаточно времени для полноценной подготовки." },
        en: { title: "Practice Flights", tags: tags("en", "prac", "fpv", "whoop"),
          desc: "Extended practice block for both disciplines. FPV Racing and Tiny Whoop pilots take turns on track to survey the course, verify video signal, OSD settings, and tune their quads. No results recorded. Ample time for proper preparation." },
      },
      {
        time: "13:30 – 14:00",
        emoji: "🍽️",
        ru: { title: "Перерыв — обед", tags: tags("ru", "pause"),
          desc: "Технический перерыв. Пилоты могут зарядить аккумуляторы, провести обслуживание оборудования и пообедать перед квалификацией." },
        en: { title: "Break — Lunch", tags: tags("en", "pause"),
          desc: "Technical break. Pilots can charge batteries, perform maintenance, and have lunch before qualification begins." },
      },
      {
        time: "14:00 – 16:00",
        emoji: "🎯",
        ru: { title: "Квалификация — FPV Racing", tags: tags("ru", "qual", "fpv"),
          desc: "Первый зачётный этап FPV Racing. Каждый пилот выполняет несколько квалификационных раундов, лучшее время идёт в зачёт. По результатам формируется сетка отборочных раундов второго дня. Параллельно — квалификация Tiny Whoop." },
        en: { title: "Qualification — FPV Racing", tags: tags("en", "qual", "fpv"),
          desc: "First scored stage for FPV Racing. Each pilot completes multiple qualification rounds; best times feed into the standings. Bracket seeding for Day 2 elimination is determined here. Tiny Whoop qualification runs in parallel." },
      },
      {
        time: "14:00 – 16:00",
        emoji: "🐝",
        ru: { title: "Квалификация — Tiny Whoop", tags: tags("ru", "qual", "whoop"),
          desc: "Квалификационные раунды Tiny Whoop проводятся параллельно с FPV Racing на отдельной трассе. Пилоты выполняют несколько заходов, лучшее время определяет позицию в сетке на второй день." },
        en: { title: "Qualification — Tiny Whoop", tags: tags("en", "qual", "whoop"),
          desc: "Tiny Whoop qualification rounds run in parallel with FPV Racing on a separate course. Pilots complete multiple runs; best times determine bracket seeding for Day 2." },
      },
      {
        time: "16:00 – 17:30",
        emoji: "🎯",
        ru: { title: "Квалификация — FPV Racing (продолжение)", tags: tags("ru", "qual", "fpv"),
          desc: "Продолжение квалификационных раундов FPV Racing. Дополнительные попытки для улучшения позиции в общем зачёте. По окончании — предварительное подведение итогов дня." },
        en: { title: "Qualification — FPV Racing (continued)", tags: tags("en", "qual", "fpv"),
          desc: "Continuation of FPV Racing qualification rounds. Additional attempts for pilots to improve their standings. Preliminary day results announced at the end." },
      },
      {
        time: "17:30 – 18:00",
        emoji: "📊",
        ru: { title: "Итоги дня", tags: tags("ru", "org"),
          desc: "Подведение предварительных итогов первого дня. Публикация промежуточных таблиц квалификации FPV Racing и Tiny Whoop. Информация об организации второго дня соревнований." },
        en: { title: "End of Day 1", tags: tags("en", "org"),
          desc: "Preliminary results of Day 1 announced. Intermediate qualification standings published for both FPV Racing and Tiny Whoop. Organisational information for Day 2." },
      },
    ],
  },
  day2: {
    ru: { label: "День 2 — 31 мая", subtitle: "Квалификация, Elimination и финалы" },
    en: { label: "Day 2 — May 31", subtitle: "Qualification, Elimination & Finals" },
    items: [
      {
        time: "09:00 – 09:15",
        emoji: "📣",
        ru: { title: "Утренний брифинг", tags: tags("ru", "brief"),
          desc: "Брифинг перед Elimination раундами. Судьи подтверждают окончательные результаты квалификации, объясняют сетку и порядок проведения отборочных и финальных заездов." },
        en: { title: "Morning Briefing", tags: tags("en", "brief"),
          desc: "Briefing before elimination rounds. Judges confirm final qualification results, explain the bracket, and outline the schedule for elimination and final heats." },
      },
      {
        time: "09:15 – 11:00",
        emoji: "🎯",
        ru: { title: "Квалификация — FPV Racing (финальные раунды)", tags: tags("ru", "qual", "fpv"),
          desc: "Последние квалификационные раунды FPV Racing. Последний шанс пилотов улучшить позицию в таблице перед формированием финальной сетки Elimination." },
        en: { title: "Qualification — FPV Racing (final rounds)", tags: tags("en", "qual", "fpv"),
          desc: "Final qualification rounds for FPV Racing. Last chance for pilots to improve their bracket position before the elimination draw is finalised." },
      },
      {
        time: "09:15 – 11:00",
        emoji: "🐝",
        ru: { title: "Квалификация — Tiny Whoop (финальные раунды)", tags: tags("ru", "qual", "whoop"),
          desc: "Завершающие квалификационные заезды Tiny Whoop параллельно с FPV Racing. По окончании формируется финальная сетка отборочного этапа." },
        en: { title: "Qualification — Tiny Whoop (final rounds)", tags: tags("en", "qual", "whoop"),
          desc: "Final Tiny Whoop qualification heats running in parallel with FPV Racing. Elimination bracket is finalised on completion." },
      },
      {
        time: "11:00 – 11:15",
        emoji: "📊",
        ru: { title: "Объявление сетки Elimination", tags: tags("ru", "org"),
          desc: "Официальное объявление финальных таблиц квалификации и сеток Elimination для FPV Racing и Tiny Whoop. Публикация на информационных стендах и в официальных каналах мероприятия." },
        en: { title: "Elimination Bracket Announcement", tags: tags("en", "org"),
          desc: "Official announcement of final qualification standings and elimination brackets for both FPV Racing and Tiny Whoop. Published on notice boards and official event channels." },
      },
      {
        time: "11:15 – 12:00",
        emoji: "🍽️",
        ru: { title: "Перерыв — обед", tags: tags("ru", "pause"),
          desc: "Технический перерыв перед Elimination раундами. Зарядка аккумуляторов, финальная настройка оборудования, обед." },
        en: { title: "Break — Lunch", tags: tags("en", "pause"),
          desc: "Technical break before elimination rounds. Battery charging, final equipment tuning, lunch." },
      },
      {
        time: "12:00 – 14:30",
        emoji: "⚡",
        ru: { title: "Elimination — FPV Racing", tags: tags("ru", "elim", "fpv"),
          desc: "Отборочные гонки FPV Racing на выбывание. Пилоты соревнуются в группах по сетке, победители проходят в следующий раунд. Высокий темп, прямые дуэли, максимальная конкуренция. Финалисты определяются по итогам всех раундов." },
        en: { title: "Elimination — FPV Racing", tags: tags("en", "elim", "fpv"),
          desc: "FPV Racing head-to-head knockout rounds. Pilots race in bracketed groups; winners advance. High pace, direct duels, maximum competition. Finalists are confirmed after all elimination rounds." },
      },
      {
        time: "12:00 – 14:30",
        emoji: "🐝",
        ru: { title: "Elimination — Tiny Whoop", tags: tags("ru", "elim", "whoop"),
          desc: "Отборочный этап Tiny Whoop проходит параллельно с FPV Racing на отдельной трассе. Гонки на выбывание по сетке квалификации, победители проходят в финал." },
        en: { title: "Elimination — Tiny Whoop", tags: tags("en", "elim", "whoop"),
          desc: "Tiny Whoop elimination rounds run in parallel with FPV Racing on a separate course. Knockout races seeded by qualification; winners advance to the final." },
      },
      {
        time: "14:30 – 15:00",
        emoji: "🔧",
        ru: { title: "Техническая подготовка к финалу", tags: tags("ru", "pause"),
          desc: "Финалисты обеих дисциплин проводят финальную проверку оборудования и краткие тестовые вылеты перед решающими заездами." },
        en: { title: "Technical Preparation for Finals", tags: tags("en", "pause"),
          desc: "Finalists in both disciplines complete final equipment checks and brief test runs before the decisive heats." },
      },
      {
        time: "15:00 – 16:30",
        emoji: "🏁",
        ru: { title: "Финал — FPV Racing", tags: tags("ru", "final", "fpv"),
          desc: "Финальные заезды FPV Racing — решающие гонки между лучшими пилотами чемпионата. Определяются победитель и призёры. Прямая трансляция, комментаторы, максимальный накал." },
        en: { title: "Final — FPV Racing", tags: tags("en", "final", "fpv"),
          desc: "FPV Racing finals — decisive races between the top pilots of the championship. Winner and podium finishers determined. Live coverage, commentary, peak atmosphere." },
      },
      {
        time: "15:00 – 16:30",
        emoji: "🐝",
        ru: { title: "Финал — Tiny Whoop", tags: tags("ru", "final", "whoop"),
          desc: "Финальные гонки Tiny Whoop параллельно с FPV Racing на отдельной трассе. Определяются победитель и призёры категории Tiny Whoop." },
        en: { title: "Final — Tiny Whoop", tags: tags("en", "final", "whoop"),
          desc: "Tiny Whoop finals run in parallel with FPV Racing on a separate course. Winner and podium of the Tiny Whoop category are determined." },
      },
      {
        time: "17:00 – 17:45",
        emoji: "🏆",
        ru: { title: "Награждение победителей и призёров", tags: tags("ru", "award"),
          desc: "Торжественное награждение победителей и призёров FPV Racing и Tiny Whoop — кубки, медали, призы. Слово организаторов и почётных гостей. Общее фото участников." },
        en: { title: "Award Ceremony", tags: tags("en", "award"),
          desc: "Presentation of trophies, medals, and prizes to FPV Racing and Tiny Whoop winners and podium finishers. Closing remarks from organisers and honoured guests. Group photo of all participants." },
      },
      {
        time: "17:45 – 18:00",
        emoji: "🎉",
        ru: { title: "Закрытие соревнований", tags: tags("ru", "close"),
          desc: "Официальное закрытие DRONECON 2026. Участники приглашаются к неформальному общению и обмену опытом после окончания программы." },
        en: { title: "Closing of DRONECON 2026", tags: tags("en", "close"),
          desc: "Official closing of DRONECON 2026. Participants are invited to stay for informal networking and experience sharing." },
      },
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
  const [day, setDay] = useState<DayKey>("day1");

  const currentDay = scheduleDays[day];
  const dayMeta = currentDay[lang];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header row */}
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
        {/* Language toggle */}
        <div className="flex shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {(["ru", "en"] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition ${lang === l ? "bg-orange-500 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 mb-6">
        {(["day1", "day2"] as DayKey[]).map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
              day === d
                ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}>
            <div className="font-black">{scheduleDays[d][lang].label}</div>
            <div className={`text-[10px] font-normal mt-0.5 ${day === d ? "text-orange-500/70" : "text-zinc-600"}`}>
              {scheduleDays[d][lang].subtitle}
            </div>
          </button>
        ))}
      </div>

      {/* Active day label */}
      <div className="border-b border-zinc-800 pb-3 mb-5">
        <p className="text-orange-400 text-sm font-black">{dayMeta.label}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{dayMeta.subtitle}</p>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-0">
        <div className="absolute left-[19px] top-5 bottom-5 w-px bg-zinc-800 z-0" />

        {currentDay.items.map((item, i) => {
          const t = item[lang];
          return (
            <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
              <div className="shrink-0 z-10 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg">
                {item.emoji}
              </div>
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
