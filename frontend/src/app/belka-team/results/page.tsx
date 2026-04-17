"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────

type ResultAPI = {
  id: number;
  pilot: string;
  event_date: string; // YYYY-MM-DD
  competition_level: string;
  drone_class: string;
  qualification_place: number | null;
  final_place: number;
  race_name: string;
  venue: string | null;
  link: string | null;
};

// ── Static seed data (43 entries) ─────────────────────────────────────────────

type StaticEntry = {
  pilot: string;
  date: string; // M/D/YYYY
  level: string;
  droneClass: string;
  qual: number | null;
  place: number;
  competition: string;
  location: string;
  link: string | null;
};

const RAW_STATIC: StaticEntry[] = [
  { pilot: "LuckyNemo",  date: "2/22/2026",  level: "Всероссийский",   droneClass: "Аналоговый",          qual: null, place: 1,  competition: "Открытое небо по беспилотным авиационным системам",                                   location: "Воронежская область, г. Россошь",              link: "https://nover.ru/contests/otkrytenebo" },
  { pilot: "LuckyNemo",  date: "1/3/2026",   level: "Региональный",    droneClass: "Аналоговый",          qual: 1,    place: 1,  competition: "Challengers #3 - Eurus. EreaDrone Challengers",                                       location: "Петербург",                                    link: "https://ereadrone.com" },
  { pilot: "Smoyki",     date: "9/13/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 1,    place: 1,  competition: "Чемпионат Нижегородской области",                                                     location: "Нижний Новгород",                              link: null },
  { pilot: "Smoyki",     date: "9/13/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 1,    place: 1,  competition: "Открытый Нижегородской области",                                                      location: "Нижний Новгород",                              link: null },
  { pilot: "Lebedav10",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 1,    place: 1,  competition: "Уральский открытый кубок",                                                            location: "Уральский кубок",                              link: null },
  { pilot: "Sevendays",  date: "3/28/2026",  level: "Региональный",    droneClass: "5\" Акро",            qual: 1,    place: 1,  competition: "Kazakhstan Drone Championship",                                                       location: "Казахстан, г. Алматы",                         link: null },
  { pilot: "Smoyki",     date: "2/20/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 2,    place: 2,  competition: "РДР, 3 тур",                                                                          location: "НГТУ им. Р.Е.Алексеева",                       link: null },
  { pilot: "Teodron",    date: "2/26/2026",  level: "Районный",        droneClass: "Whoop Акро",          qual: 1,    place: 2,  competition: "Кубок КФК 3 тур",                                                                     location: "Питер клубный",                                link: null },
  { pilot: "LuckyNemo",  date: "7/3/2026",   level: "Всероссийский",   droneClass: "Аналоговый",          qual: null, place: 2,  competition: "Кубок FPV40 по Белым землям",                                                         location: "г. Шадринск, кубок FPV40",                     link: "https://vk.com/wall-227435476_92" },
  { pilot: "LuckyNemo",  date: "12/3/2026",  level: "Всероссийский",   droneClass: "Аналоговый",          qual: null, place: 2,  competition: "Открытый кубок Волгоградской области",                                                location: "Волгоградская область",                        link: null },
  { pilot: "Lebedav10",  date: "3/28/2026",  level: "Районный",        droneClass: "Whoop Акро",          qual: 1,    place: 2,  competition: "Redsheep Cup",                                                                        location: "Drone Tech Club",                              link: null },
  { pilot: "Lebedav10",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Открытый Акро", qual: 1,    place: 2,  competition: "Уральский открытый кубок",                                                            location: "Уральский кубок",                              link: null },
  { pilot: "LuckyNemo",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 4,    place: 2,  competition: "Уральский открытый кубок (Whoop Акро 75мм)",                                          location: "Уральский кубок",                              link: null },
  { pilot: "LuckyNemo",  date: "3/29/2026",  level: "Всероссийский",   droneClass: "Whoop Открытый Акро", qual: 2,    place: 2,  competition: "Уральский открытый кубок (Whoop Открытый Акро 75мм)",                                 location: "Уральский кубок",                              link: null },
  { pilot: "LuckyNemo",  date: "4/11/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 4,    place: 2,  competition: "Чемпионат открытый кубок высокоскоростных гонок Ф-9U",                                location: "г. Кемь, МАС Кемский",                         link: null },
  { pilot: "Lebedav10",  date: "2/21/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 3,    place: 3,  competition: "RDR открытый кубок",                                                                  location: "ТКЦ",                                          link: null },
  { pilot: "Smoyki",     date: "12/18/2025", level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 3,    place: 3,  competition: "РДР, 2 тур",                                                                          location: "Нижний Новгород",                              link: null },
  { pilot: "LuckyNemo",  date: "7/3/2026",   level: "Всероссийский",   droneClass: "Whoop Акро",          qual: null, place: 3,  competition: "Кубок FPV40 по Белым землям",                                                         location: "г. Шадринск, кубок FPV40",                     link: null },
  { pilot: "Smoyki",     date: "5/17/2025",  level: "Всероссийский",   droneClass: "5\" Акро",            qual: 10,   place: 4,  competition: "RDR",                                                                                 location: "Нижний Новгород",                              link: null },
  { pilot: "Smoyki",     date: "6/28/2025",  level: "Всероссийский",   droneClass: "5\" Акро",            qual: 8,    place: 5,  competition: "RDR",                                                                                 location: "Красный бор",                                  link: null },
  { pilot: "Smoyki",     date: "2/26/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 3,    place: 5,  competition: "РДР, 3 тур",                                                                          location: "Нижний Новгород",                              link: null },
  { pilot: "Smoyki",     date: "11/29/2025", level: "Всероссийский",   droneClass: "Whoop Открытый Акро", qual: 5,    place: 5,  competition: "РДАК",                                                                                location: "Санкт-Петербург",                              link: null },
  { pilot: "Smoyki",     date: "2/22/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 10,   place: 5,  competition: "MultiGP Prospec Wild Card",                                                           location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "9/27/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 8,    place: 6,  competition: "Чемпионат Ленинградской Нижегородской области",                                       location: "Суздаль",                                      link: null },
  { pilot: "Smoyki",     date: "2/22/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 6,    place: 6,  competition: "World Drone Tour",                                                                    location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "3/1/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 6,    place: 6,  competition: "World Drone Tour",                                                                    location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "9/27/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 9,    place: 7,  competition: "Открытый Чемпионат Нижегородской области",                                            location: "Суздаль",                                      link: null },
  { pilot: "Smoyki",     date: "11/29/2025", level: "Всероссийский",   droneClass: "5\" Акро",            qual: 10,   place: 7,  competition: "РДАК",                                                                                location: "Санкт-Петербург",                              link: null },
  { pilot: "Teodron",    date: "3/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 7,    place: 8,  competition: "EdroneBattle s5r5",                                                                   location: "—",                                            link: null },
  { pilot: "Lebedav10",  date: "2/28/2026",  level: "Региональный",    droneClass: "Whoop Акро",          qual: 6,    place: 9,  competition: "WhoopMania s2t1",                                                                     location: "ТКЦ",                                          link: null },
  { pilot: "Smoyki",     date: "2/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 9,    place: 9,  competition: "eDroneBattle s5r4",                                                                   location: "—",                                            link: null },
  { pilot: "Teodron",    date: "3/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 4,    place: 9,  competition: "EdroneBattle s5r6",                                                                   location: "ТКЦ",                                          link: null },
  { pilot: "Smoyki",     date: "2/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 8,    place: 11, competition: "eDroneBattle s5r3",                                                                   location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "3/29/2025",  level: "Всероссийский",   droneClass: "5\" Акро",            qual: 20,   place: 14, competition: "RDR",                                                                                 location: "г. Ижевск, Удмуртский университет",            link: null },
  { pilot: "Teodron",    date: "2/28/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 9,    place: 15, competition: "WhoopMania s2t1",                                                                     location: "Санкт-Петербург",                              link: null },
  { pilot: "Smoyki",     date: "10/8/2025",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 16,   place: 16, competition: "Открытый кубок",                                                                      location: "Санкт-Петербург",                              link: null },
  { pilot: "Smoyki",     date: "1/22/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 22,   place: 21, competition: "eDroneBattle s5r2",                                                                   location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "3/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 13,   place: 21, competition: "eDroneBattle s5r6",                                                                   location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "3/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 27,   place: 23, competition: "eDroneBattle s5r5",                                                                   location: "—",                                            link: null },
  { pilot: "Lebedav10",  date: "3/19/2026",  level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 23,   place: 23, competition: "Edronebattle s5r6",                                                                   location: "—",                                            link: null },
  { pilot: "Lebedav10",  date: "3/5/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 21,   place: 25, competition: "Edronebattle s5r5",                                                                   location: "—",                                            link: null },
  { pilot: "Smoyki",     date: "2/28/2026",  level: "Всероссийский",   droneClass: "Whoop Акро",          qual: 27,   place: 27, competition: "Открытый кубок",                                                                      location: "Санкт-Петербург",                              link: null },
  { pilot: "Smoyki",     date: "1/9/2026",   level: "Мульти-Этапный",  droneClass: "Аналоговый",          qual: 26,   place: 28, competition: "eDroneBattle s5r1",                                                                   location: "—",                                            link: null },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function staticToAPI(s: StaticEntry, id: number): ResultAPI {
  const [m, d, y] = s.date.split("/");
  const event_date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return {
    id,
    pilot: s.pilot,
    event_date,
    competition_level: s.level,
    drone_class: s.droneClass,
    qualification_place: s.qual,
    final_place: s.place,
    race_name: s.competition,
    venue: s.location === "—" ? null : s.location,
    link: s.link,
  };
}

const STATIC_RESULTS: ResultAPI[] = RAW_STATIC.map((s, i) =>
  staticToAPI(s, -(i + 1))
);

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PILOTS = ["LuckyNemo", "Smoyki", "Teodron", "Lebedav10", "Sevendays"];

const LEVELS = [
  "Всероссийский",
  "Региональный",
  "Районный",
  "Мульти-Этапный",
];

const DRONE_CLASSES = [
  "Whoop Акро",
  "5\" Акро",
  "Аналоговый",
  "Whoop Открытый Акро",
];

const LEVEL_COLORS: Record<string, string> = {
  "Всероссийский":  "bg-yellow-500/20 text-yellow-400",
  "Региональный":   "bg-blue-500/20 text-blue-400",
  "Районный":       "bg-zinc-700 text-zinc-400",
  "Мульти-Этапный": "bg-purple-500/20 text-purple-400",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PlaceBadge({ place }: { place: number }) {
  if (place === 1)
    return <span className="inline-flex items-center gap-1 font-black text-yellow-400 text-sm">🥇 1</span>;
  if (place === 2)
    return <span className="inline-flex items-center gap-1 font-black text-slate-300 text-sm">🥈 2</span>;
  if (place === 3)
    return <span className="inline-flex items-center gap-1 font-black text-amber-600 text-sm">🥉 3</span>;
  return <span className="font-bold text-zinc-500 text-sm">{place}</span>;
}

// ── Add Modal ─────────────────────────────────────────────────────────────────

type AddModalProps = {
  onClose: () => void;
  onSaved: (r: ResultAPI) => void;
};

function AddModal({ onClose, onSaved }: AddModalProps) {
  const [pilot, setPilot] = useState("LuckyNemo");
  const [customPilot, setCustomPilot] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState(LEVELS[0]);
  const [droneClass, setDroneClass] = useState(DRONE_CLASSES[0]);
  const [qualPlace, setQualPlace] = useState("");
  const [finalPlace, setFinalPlace] = useState("");
  const [raceName, setRaceName] = useState("");
  const [venue, setVenue] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!eventDate || !finalPlace || !raceName) {
      setError("Заполни обязательные поля: дата, финальное место, название");
      return;
    }
    const resolvedPilot = useCustom ? customPilot.trim() : pilot;
    if (!resolvedPilot) {
      setError("Укажи пилота");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilot: resolvedPilot,
          event_date: eventDate,
          competition_level: competitionLevel,
          drone_class: droneClass,
          qualification_place: qualPlace ? parseInt(qualPlace, 10) : null,
          final_place: parseInt(finalPlace, 10),
          race_name: raceName,
          venue: venue.trim() || null,
          link: link.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: ResultAPI = await res.json();
      onSaved(created);
    } catch {
      setError("Ошибка сохранения. Проверь подключение к API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-black text-white">Добавить результат</h2>

        {/* Pilot */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Пилот</label>
          <div className="flex gap-2">
            <select
              value={useCustom ? "__custom__" : pilot}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setUseCustom(true);
                } else {
                  setUseCustom(false);
                  setPilot(e.target.value);
                }
              }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            >
              {PILOTS.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value="__custom__">Другой...</option>
            </select>
            {useCustom && (
              <input
                type="text"
                placeholder="Имя пилота"
                value={customPilot}
                onChange={(e) => setCustomPilot(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
              />
            )}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Дата соревнования *</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
          />
        </div>

        {/* Level + Class */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest">Уровень</label>
            <select
              value={competitionLevel}
              onChange={(e) => setCompetitionLevel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            >
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest">Класс дрона</label>
            <select
              value={droneClass}
              onChange={(e) => setDroneClass(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            >
              {DRONE_CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Qual + Final */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest">Место в квалификации</label>
            <input
              type="number"
              min="1"
              placeholder="необязательно"
              value={qualPlace}
              onChange={(e) => setQualPlace(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 placeholder-gray-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest">Финальное место *</label>
            <input
              type="number"
              min="1"
              placeholder="обязательно"
              value={finalPlace}
              onChange={(e) => setFinalPlace(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 placeholder-gray-600"
            />
          </div>
        </div>

        {/* Race name */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Название соревнования *</label>
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
          />
        </div>

        {/* Venue */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Площадка</label>
          <input
            type="text"
            placeholder="необязательно"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 placeholder-gray-600"
          />
        </div>

        {/* Link */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Ссылка</label>
          <input
            type="url"
            placeholder="необязательно"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 placeholder-gray-600"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 hover:text-white transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-bold bg-yellow-400 text-gray-950 rounded-lg hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BelkaTeamResultsPage() {
  const [results, setResults] = useState<ResultAPI[]>(STATIC_RESULTS);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [filterPilot, setFilterPilot] = useState("Все");
  const [filterPlace, setFilterPlace] = useState("Все");
  const [search, setSearch] = useState("");

  // Load from API
  const loadResults = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/results`);
      if (!res.ok) throw new Error("not ok");
      const data: ResultAPI[] = await res.json();
      setApiAvailable(true);

      // Seed if empty
      if (data.length === 0 && typeof window !== "undefined") {
        const seeded = localStorage.getItem("results_seeded");
        if (!seeded) {
          await seedData();
          localStorage.setItem("results_seeded", "1");
          const res2 = await fetch(`${API_URL}/results`);
          const data2: ResultAPI[] = await res2.json();
          setResults(data2);
          return;
        }
      }

      setResults(data.length > 0 ? data : STATIC_RESULTS);
    } catch {
      // API unavailable — keep static data
      setApiAvailable(false);
      setResults(STATIC_RESULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  async function seedData() {
    const payloads = RAW_STATIC.map((s) => {
      const [m, d, y] = s.date.split("/");
      return {
        pilot: s.pilot,
        event_date: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        competition_level: s.level,
        drone_class: s.droneClass,
        qualification_place: s.qual,
        final_place: s.place,
        race_name: s.competition,
        venue: s.location === "—" ? null : s.location,
        link: s.link,
      };
    });
    await Promise.all(
      payloads.map((p) =>
        fetch(`${API_URL}/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        })
      )
    );
  }

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  async function handleDelete(id: number) {
    if (!confirm("Удалить результат?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setResults((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Ошибка удаления. Попробуй снова.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleAdded(r: ResultAPI) {
    setResults((prev) => {
      const next = [...prev, r];
      next.sort((a, b) => {
        if (a.final_place !== b.final_place) return a.final_place - b.final_place;
        return b.event_date.localeCompare(a.event_date);
      });
      return next;
    });
    setShowAddModal(false);
  }

  const stats = useMemo(() => {
    const total = results.length;
    const wins = results.filter((r) => r.final_place === 1).length;
    const top3 = results.filter((r) => r.final_place <= 3).length;
    const pilots = new Set(results.map((r) => r.pilot)).size;
    return { total, wins, top3, pilots };
  }, [results]);

  const filtered = useMemo(() => {
    let data = [...results];
    if (filterPilot !== "Все") data = data.filter((r) => r.pilot === filterPilot);
    if (filterPlace === "1 место") data = data.filter((r) => r.final_place === 1);
    else if (filterPlace === "Топ-3") data = data.filter((r) => r.final_place <= 3);
    else if (filterPlace === "Топ-10") data = data.filter((r) => r.final_place <= 10);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (r) =>
          r.race_name.toLowerCase().includes(q) ||
          (r.venue ?? "").toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      if (a.final_place !== b.final_place) return a.final_place - b.final_place;
      return b.event_date.localeCompare(a.event_date);
    });
    return data;
  }, [results, filterPilot, filterPlace, search]);

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
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">
                🏁 Результаты команды
              </h1>
              <p className="text-xs text-yellow-400 mt-0.5 tracking-widest uppercase">
                Belka Team • FPV Racing
                {!apiAvailable && !loading && (
                  <span className="ml-2 text-gray-600">(offline режим)</span>
                )}
              </p>
            </div>
            {apiAvailable && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-gray-950 text-sm font-bold rounded-lg hover:bg-yellow-300 transition whitespace-nowrap"
              >
                ➕ Добавить результат
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Всего результатов", value: stats.total },
            { label: "🥇 Побед (1 место)",  value: stats.wins, accent: true },
            { label: "🥈 Топ-3 результатов", value: stats.top3 },
            { label: "Пилотов в команде",    value: stats.pilots },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 leading-tight">
                {s.label}
              </p>
              <p className={`text-2xl font-black tabular-nums ${s.accent ? "text-yellow-400" : "text-white"}`}>
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
            {PILOTS.map((p) => <option key={p}>{p}</option>)}
          </select>

          <select
            value={filterPlace}
            onChange={(e) => setFilterPlace(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 transition cursor-pointer"
          >
            {["Все", "1 место", "Топ-3", "Топ-10"].map((v) => <option key={v}>{v}</option>)}
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
              onClick={() => { setFilterPilot("Все"); setFilterPlace("Все"); setSearch(""); }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-white border border-gray-800 rounded-lg hover:border-gray-600 transition"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Counter */}
        <p className="text-xs text-gray-600">
          {loading ? "Загрузка..." : `Показано: ${filtered.length} из ${results.length}`}
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-900 sticky top-0 z-10">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">Место 🏆</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">Пилот</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">Дата</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800 min-w-[200px]">Соревнование</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">Класс</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">Уровень</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">Квал.</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800 min-w-[140px]">Площадка</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800">🔗</th>
                {apiAvailable && (
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest font-bold whitespace-nowrap border-b border-gray-800 w-8"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isPodium = r.final_place <= 3;
                return (
                  <tr
                    key={r.id}
                    className={`group border-b border-gray-800 last:border-0 transition-colors hover:bg-gray-800 ${
                      isPodium ? "bg-yellow-500/5" : "bg-gray-900"
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PlaceBadge place={r.final_place} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-white">{r.pilot}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs tabular-nums">
                      {formatDate(r.event_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-200 text-xs leading-snug">
                      {r.race_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                      {r.drone_class}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_COLORS[r.competition_level] ?? "bg-gray-700 text-gray-400"}`}>
                        {r.competition_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums text-gray-400">
                      {r.qualification_place !== null ? r.qualification_place : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 leading-snug">
                      {r.venue ? r.venue : <span className="text-gray-700">—</span>}
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
                    {apiAvailable && (
                      <td className="px-2 py-3 whitespace-nowrap">
                        {r.id > 0 && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition text-xs px-1 py-0.5 rounded disabled:opacity-30"
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={apiAvailable ? 10 : 9}
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

      {showAddModal && (
        <AddModal onClose={() => setShowAddModal(false)} onSaved={handleAdded} />
      )}
    </main>
  );
}
