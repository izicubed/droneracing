"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Result = {
  pilot: string;
  date: string;        // MM/DD/YYYY
  level: string;
  droneClass: string;
  qual: number | null;
  place: number;
  competition: string;
  location: string;
  link: string | null;
};

const RAW_DATA: Result[] = [
  { pilot: "LuckyNemo",  date: "2/22/2026",  level: "Всероссийский",   droneClass: "Аналоговый",         qual: null, place: 1,  competition: "Открытое небо по беспилотным авиационным системам",                                    location: "Воронежская область, г. Россошь",                       link: "https://nover.ru/contests/otkrytenebo" },
  { pilot: "LuckyNemo",  date: "1/3/2026",   level: "Региональный",    droneClass: "Аналоговый",         qual: 1,    place: 1,  competition: "Challengers #3 - Eurus. EreaDrone Challengers",                                        location: "Петербург",                                             link: "https://ereadrone.com" },
  { pilot: "Smoyki",     date: "9/13/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 1,    place: 1,  competition: "Чемпионат Нижегородской области",                                                      location: "Нижний Новгород",                                       link: null },
  { pilot: "Smoyki",     date: "9/13/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 1,    place: 1,  competition: "Открытый Нижегородской области",                                                       location: "Нижний Новгород",                                       link: null },
  { pilot: "Lebedav10",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 1,    place: 1,  competition: "Уральский открытый кубок",                                                             location: "Уральский кубок",                                       link: null },
  { pilot: "Sevendays",  date: "3/28/2026",  level: "Региональный",    droneClass: "5\" Акро",           qual: 1,    place: 1,  competition: "Kazakhstan Drone Championship",                                                        location: "Казахстан, г. Алматы",                                  link: null },
  { pilot: "Smoyki",     date: "2/20/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 2,    place: 2,  competition: "РДР, 3 тур",                                                                           location: "НГТУ им. Р.Е.Алексеева",                                link: null },
  { pilot: "Teodron",    date: "2/26/2026",  level: "Районный",        droneClass: "Whoop Акро",         qual: 1,    place: 2,  competition: "Кубок КФК 3 тур",                                                                      location: "Питер клубный",                                         link: null },
  { pilot: "LuckyNemo",  date: "7/3/2026",   level: "Всероссийский",   droneClass: "Аналоговый",         qual: null, place: 2,  competition: "Кубок FPV40 по Белым землям",                                                          location: "г. Шадринск, кубок FPV40",                              link: "https://vk.com/wall-227435476_92" },
  { pilot: "LuckyNemo",  date: "12/3/2026",  level: "Всероссийский",   droneClass: "Аналоговый",         qual: null, place: 2,  competition: "Открытый кубок Волгоградской области",                                                 location: "Волгоградская область",                                 link: null },
  { pilot: "Lebedav10",  date: "3/28/2026",  level: "Районный",        droneClass: "Whoop Акро",         qual: 1,    place: 2,  competition: "Redsheep Cup",                                                                         location: "Drone Tech Club",                                       link: null },
  { pilot: "Lebedav10",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Открытый Акро",qual: 1,    place: 2,  competition: "Уральский открытый кубок",                                                             location: "Уральский кубок",                                       link: null },
  { pilot: "LuckyNemo",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 4,    place: 2,  competition: "Уральский открытый кубок (Whoop Акро 75мм)",                                           location: "Уральский кубок",                                       link: null },
  { pilot: "LuckyNemo",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Открытый Акро",qual: 2,    place: 2,  competition: "Уральский открытый кубок (Whoop Открытый Акро 75мм)",                                  location: "Уральский кубок",                                       link: null },
  { pilot: "LuckyNemo",  date: "4/11/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 4,    place: 2,  competition: "Чемпионат открытый кубок высокоскоростных гонок Ф-9U",                                 location: "г. Кемь, МАС Кемский",                                  link: null },
  { pilot: "Lebedav10",  date: "2/21/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 3,    place: 3,  competition: "RDR открытый кубок",                                                                   location: "ТКЦ",                                                   link: null },
  { pilot: "Smoyki",     date: "12/18/2025", level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 3,    place: 3,  competition: "РДР, 2 тур",                                                                           location: "Нижний Новгород",                                       link: null },
  { pilot: "LuckyNemo",  date: "7/3/2026",   level: "Всероссийский",   droneClass: "Whoop Акро",         qual: null, place: 3,  competition: "Кубок FPV40 по Белым землям",                                                          location: "г. Шадринск, кубок FPV40",                              link: null },
  { pilot: "Smoyki",     date: "5/17/2025",  level: "Всероссийский",   droneClass: "5\" Акро",           qual: 10,   place: 4,  competition: "RDR",                                                                                  location: "Нижний Новгород",                                       link: null },
  { pilot: "Smoyki",     date: "6/28/2025",  level: "Всероссийский",   droneClass: "5\" Акро",           qual: 8,    place: 5,  competition: "RDR",                                                                                  location: "Красный бор",                                           link: null },
  { pilot: "Smoyki",     date: "2/26/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 3,    place: 5,  competition: "РДР, 3 тур",                                                                           location: "Нижний Новгород",                                       link: null },
  { pilot: "Smoyki",     date: "11/29/2025", level: "Всероссийский",   droneClass: "Whoop Открытый Акро",qual: 5,    place: 5,  competition: "РДАК",                                                                                 location: "Санкт-Петербург",                                       link: null },
  { pilot: "Smoyki",     date: "2/22/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 10,   place: 5,  competition: "MultiGP Prospec Wild Card",                                                            location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "9/27/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 8,    place: 6,  competition: "Чемпионат Ленинградской Нижегородской области",                                        location: "Суздаль",                                               link: null },
  { pilot: "Smoyki",     date: "2/22/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 6,    place: 6,  competition: "World Drone Tour",                                                                     location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "3/1/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 6,    place: 6,  competition: "World Drone Tour",                                                                     location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "9/27/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 9,    place: 7,  competition: "Открытый Чемпионат Нижегородской области",                                             location: "Суздаль",                                               link: null },
  { pilot: "Smoyki",     date: "11/29/2025", level: "Всероссийский",   droneClass: "5\" Акро",           qual: 10,   place: 7,  competition: "РДАК",                                                                                 location: "Санкт-Петербург",                                       link: null },
  { pilot: "Teodron",    date: "3/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 7,    place: 8,  competition: "EdroneBattle s5r5",                                                                    location: "—",                                                     link: null },
  { pilot: "Lebedav10",  date: "2/28/2026",  level: "Региональный",    droneClass: "Whoop Акро",         qual: 6,    place: 9,  competition: "WhoopMania s2t1",                                                                      location: "ТКЦ",                                                   link: null },
  { pilot: "Smoyki",     date: "2/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 9,    place: 9,  competition: "eDroneBattle s5r4",                                                                    location: "—",                                                     link: null },
  { pilot: "Teodron",    date: "3/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 4,    place: 9,  competition: "EdroneBattle s5r6",                                                                    location: "ТКЦ",                                                   link: null },
  { pilot: "Smoyki",     date: "2/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 8,    place: 11, competition: "eDroneBattle s5r3",                                                                    location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "3/29/2025",  level: "Всероссийский",   droneClass: "5\" Акро",           qual: 20,   place: 14, competition: "RDR",                                                                                  location: "г. Ижевск, Удмуртский университет",                     link: null },
  { pilot: "Teodron",    date: "2/28/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 9,    place: 15, competition: "WhoopMania s2t1",                                                                      location: "Санкт-Петербург",                                       link: null },
  { pilot: "Smoyki",     date: "10/8/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 16,   place: 16, competition: "Открытый кубок",                                                                       location: "Санкт-Петербург",                                       link: null },
  { pilot: "Smoyki",     date: "1/22/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 22,   place: 21, competition: "eDroneBattle s5r2",                                                                    location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "3/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 13,   place: 21, competition: "eDroneBattle s5r6",                                                                    location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "3/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 27,   place: 23, competition: "eDroneBattle s5r5",                                                                    location: "—",                                                     link: null },
  { pilot: "Lebedav10",  date: "3/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 23,   place: 23, competition: "Edronebattle s5r6",                                                                    location: "—",                                                     link: null },
  { pilot: "Lebedav10",  date: "3/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 21,   place: 25, competition: "Edronebattle s5r5",                                                                    location: "—",                                                     link: null },
  { pilot: "Smoyki",     date: "2/28/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",         qual: 27,   place: 27, competition: "Открытый кубок",                                                                       location: "Санкт-Петербург",                                       link: null },
  { pilot: "Smoyki",     date: "1/9/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",         qual: 26,   place: 28, competition: "eDroneBattle s5r1",                                                                    location: "—",                                                     link: null },
];

const PILOTS = ["LuckyNemo", "Smoyki", "Teodron", "Lebedav10", "Sevendays"];

const LEVEL_COLORS: Record<string, string> = {
  "Всероссийский":  "bg-yellow-500/20 text-yellow-400",
  "Региональный":   "bg-blue-500/20 text-blue-400",
  "Районный":       "bg-zinc-700 text-zinc-400",
  "Мульти-Этапный": "bg-purple-500/20 text-purple-400",
};

function parseDateToTimestamp(d: string): number {
  const [m, day, y] = d.split("/").map(Number);
  return new Date(y, m - 1, day).getTime();
}

function formatDate(d: string): string {
  const [m, day, y] = d.split("/");
  return `${day.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
}

function PlaceBadge({ place }: { place: number }) {
  if (place === 1)
    return (
      <span className="inline-flex items-center gap-1 font-black text-yellow-400 text-sm">
        🥇 1
      </span>
    );
  if (place === 2)
    return (
      <span className="inline-flex items-center gap-1 font-black text-slate-300 text-sm">
        🥈 2
      </span>
    );
  if (place === 3)
    return (
      <span className="inline-flex items-center gap-1 font-black text-amber-600 text-sm">
        🥉 3
      </span>
    );
  return <span className="font-bold text-zinc-500 text-sm">{place}</span>;
}

export default function BelkaTeamResultsPage() {
  const [filterPilot, setFilterPilot] = useState("Все");
  const [filterPlace, setFilterPlace] = useState("Все");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const total = RAW_DATA.length;
    const wins = RAW_DATA.filter((r) => r.place === 1).length;
    const top3 = RAW_DATA.filter((r) => r.place <= 3).length;
    const pilots = new Set(RAW_DATA.map((r) => r.pilot)).size;
    return { total, wins, top3, pilots };
  }, []);

  const filtered = useMemo(() => {
    let data = [...RAW_DATA];

    if (filterPilot !== "Все") {
      data = data.filter((r) => r.pilot === filterPilot);
    }
    if (filterPlace === "1 место") {
      data = data.filter((r) => r.place === 1);
    } else if (filterPlace === "Топ-3") {
      data = data.filter((r) => r.place <= 3);
    } else if (filterPlace === "Топ-10") {
      data = data.filter((r) => r.place <= 10);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (r) =>
          r.competition.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      if (a.place !== b.place) return a.place - b.place;
      return parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date);
    });

    return data;
  }, [filterPilot, filterPlace, search]);

  return (
    <main className="min-h-screen bg-gray-950 text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/belka-team"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-yellow-400 transition mb-3"
          >
            ← Назад
          </Link>
          <div className="flex items-end gap-3">
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">
                🏁 Результаты команды
              </h1>
              <p className="text-xs text-yellow-400 mt-0.5 tracking-widest uppercase">
                Belka Team • FPV Racing
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Всего результатов", value: stats.total },
            { label: "🥇 Побед (1 место)", value: stats.wins, accent: true },
            { label: "🥈 Топ-3 результатов", value: stats.top3 },
            { label: "Пилотов в команде",   value: stats.pilots },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            >
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 leading-tight">
                {s.label}
              </p>
              <p
                className={`text-2xl font-black tabular-nums ${
                  s.accent ? "text-yellow-400" : "text-white"
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterPilot}
            onChange={(e) => setFilterPilot(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 transition cursor-pointer"
          >
            <option>Все</option>
            {PILOTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select
            value={filterPlace}
            onChange={(e) => setFilterPlace(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 transition cursor-pointer"
          >
            {["Все", "1 место", "Топ-3", "Топ-10"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500 transition"
          />

          {(filterPilot !== "Все" || filterPlace !== "Все" || search) && (
            <button
              onClick={() => {
                setFilterPilot("Все");
                setFilterPlace("Все");
                setSearch("");
              }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-white border border-gray-800 rounded-lg hover:border-gray-600 transition"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Counter */}
        <p className="text-xs text-gray-600">
          Показано: {filtered.length} из {RAW_DATA.length}
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-900 sticky top-0 z-10">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  Место 🏆
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  Пилот
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  Дата
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800 min-w-[200px]">
                  Соревнование
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  Класс
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  Уровень
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  Квал.
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800 min-w-[140px]">
                  Площадка
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">
                  🔗
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isPodium = r.place <= 3;
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-800 last:border-0 transition-colors hover:bg-gray-800 ${
                      isPodium ? "bg-yellow-500/5" : "bg-gray-900"
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PlaceBadge place={r.place} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-white">{r.pilot}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs tabular-nums">
                      {formatDate(r.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-200 text-xs leading-snug">
                      {r.competition}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                      {r.droneClass}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          LEVEL_COLORS[r.level] ?? "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {r.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums text-gray-400">
                      {r.qual !== null ? r.qual : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 leading-snug">
                      {r.location !== "—" ? r.location : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.link ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 transition text-base"
                          title={r.link}
                        >
                          🔗
                        </a>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-gray-600 text-sm bg-gray-900"
                  >
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
