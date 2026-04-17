"use client";

import { useState } from "react";

const PRODUCTS = [
  {
    category: "RotorHazard",
    items: [
      {
        name: "Собранная плата засечки RotorHazard",
        price: 8000,
        oldPrice: 14000,
        description: "Только собранная плата. Для работы нужны: Raspberry Pi + microSD, приёмники RX5808 (1-8 шт.)",
        link: "https://rdmfpv.ru/product/засечка-rotorhazard/",
      },
      {
        name: "Печатная плата RotorHazard",
        price: 1000,
        oldPrice: 2000,
        description: "Голая PCB плата для самостоятельной сборки засечки",
        link: "https://rdmfpv.ru/product/плата-rotorhazard/",
      },
      {
        name: "Комплект для сборки RotorHazard",
        price: 4000,
        oldPrice: 6000,
        description: "Полный набор компонентов для самостоятельной сборки платы засечки",
        link: "https://rdmfpv.ru/product/комплект-для-сборки-rotorhazard/",
      },
      {
        name: "Карбоновый корпус для RotorHazard",
        price: 2000,
        oldPrice: 3000,
        description: "Защитный корпус из карбона для платы засечки",
        link: "https://rdmfpv.ru/product/карбоновый-корпус-для-rotorhazard/",
      },
      {
        name: "Пластиковый корпус для засечки RotorHazard",
        price: 1000,
        oldPrice: 2000,
        description: "Защитный корпус из пластика для платы засечки",
        link: "https://rdmfpv.ru/product/пластиковый-корпус-для-засечки-rotorhazard/",
      },
      {
        name: "Raspberry Pi 5 8GB (Комплект для RotorHazard)",
        price: 9000,
        oldPrice: 12000,
        description: "Одноплатный компьютер для запуска RotorHazard. Включает microSD карту с предустановленным ПО",
        link: "https://rdmfpv.ru/product/raspberry-pi-5-комплект/",
      },
      {
        name: "Приемник RX5808 Boscam",
        price: 2000,
        oldPrice: 3000,
        description: "Видеоприёмник 5.8 ГГц. Нужен 1 шт. на каждые ворота (до 8 шт. на систему)",
        link: "https://rdmfpv.ru/product/приемник-rx5808/",
      },
    ],
  },
  {
    category: "NuclearHazard",
    items: [
      {
        name: "Засечка NuclearHazard Atom",
        price: 3000,
        oldPrice: 5000,
        description: "Компактная предсобранная засечка. Подключить приёмники и Raspberry Pi — готово",
        link: "https://rdmfpv.ru/product/засечка-nuclearhazard-atom/",
      },
      {
        name: "Засечка NuclearHazard",
        price: 12000,
        oldPrice: 16000,
        description: "Полноразмерная предсобранная заводская засечка на базе RotorHazard. До 8 приёмников",
        link: "https://rdmfpv.ru/product/засечка-nuclearhazard/",
      },
      {
        name: 'Комплект системы управления мероприятием RotorHazard «под ключ»',
        price: 38500,
        oldPrice: 45000,
        description: "Всё что нужно для запуска соревнований: плата + Raspberry Pi + корпус + приёмники + инструкция",
        link: "https://rdmfpv.ru/product/комплект-системы-управления-мероприятием/",
      },
    ],
  },
];

const BENEFITS = [
  "Управление мероприятием: самый быстрый круг, три круга подряд, командные гонки",
  "Адаптивная калибровка — запоминается для каждого пилота",
  "Полная запись статистики полёта, корректировки в любой момент",
  "Поддержка LED-панели для визуализации",
  "На дрон ничего устанавливать не нужно",
  "До 8 ворот одновременно, точность до 1 мс",
];

const FAQ = [
  {
    q: "Что такое RotorHazard?",
    a: "RotorHazard — это open-source система хронометража для FPV гонок дронов. Работает на Raspberry Pi, использует видеоприёмники RX5808 для фиксации прохождения ворот пилотами.",
  },
  {
    q: "Чем NuclearHazard отличается от RotorHazard?",
    a: "NuclearHazard — развитие идеи RotorHazard с улучшенной точностью и дополнительными функциями. Atom — компактная версия для небольших трасс, полная — для официальных соревнований.",
  },
  {
    q: "Сколько ворот поддерживает система?",
    a: "RotorHazard поддерживает до 8 ворот одновременно. Для большего количества можно каскадировать несколько систем.",
  },
  {
    q: "Нужны ли специальные знания для сборки?",
    a: "Базовые навыки пайки и работы с Linux. Мы предоставляем подробную инструкцию. Если не хотите возиться — берите собранную плату или комплект под ключ.",
  },
  {
    q: "Какая точность хронометража?",
    a: "Точность до 1 мс. Система работает в реальном времени и показывает результаты сразу на экране.",
  },
  {
    q: "Совместима ли система с FPVTrackside/LiveTime?",
    a: "Да, RotorHazard поддерживает интеграцию с популярными системами управления гонками через API.",
  },
];

function formatPrice(price: number) {
  return price.toLocaleString("ru-RU") + " ₽";
}

export default function RotorHazardPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", contact: "", message: "" });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
          ← Назад
        </a>
        <h1 className="text-xl font-bold text-white">RotorHazard / NuclearHazard</h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">

        {/* Hero */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Система хронометража для FPV гонок</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            <strong className="text-white">RotorHazard</strong> и <strong className="text-white">NuclearHazard</strong> —
            профессиональные системы хронометража для соревнований по FPV-гонкам дронов.
            Работают на базе Raspberry Pi и видеоприёмников 5.8 ГГц.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-300 text-sm bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <span className="text-orange-400 mt-0.5 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Каталог */}
        <section>
          <h2 className="text-2xl font-bold mb-8 text-white">Товары и цены</h2>
          {PRODUCTS.map((cat) => (
            <div key={cat.category} className="mb-12">
              <h3 className="text-lg font-semibold text-orange-400 mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" />
                {cat.category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.items.map((item) => (
                  <div
                    key={item.name}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 hover:bg-gray-900/80 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-white text-sm leading-snug">{item.name}</h4>
                      <span className="shrink-0 text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/25 rounded-full px-2 py-0.5 uppercase tracking-wide">
                        Sale
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed flex-1">{item.description}</p>
                    <div className="flex items-end justify-between gap-2 mt-auto pt-2 border-t border-gray-800">
                      <div>
                        <span className="block text-gray-500 text-xs line-through">{formatPrice(item.oldPrice)}</span>
                        <span className="text-orange-400 font-bold text-xl">{formatPrice(item.price)}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          Подробнее
                        </a>
                        <a
                          href="#contact"
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-3 py-1.5 transition-colors"
                        >
                          Заказать
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-white">Вопросы и ответы</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 bg-gray-900 hover:bg-gray-800 transition-colors flex items-center justify-between gap-4"
                >
                  <span className="font-medium text-white">{item.q}</span>
                  <span className="text-orange-400 text-xl flex-shrink-0 leading-none">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 py-4 bg-gray-950 text-gray-300 leading-relaxed text-sm">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Контактная форма */}
        <section id="contact">
          <h2 className="text-2xl font-bold mb-6 text-white">Связаться / Заказать</h2>
          {sent ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl px-6 py-10 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-300 text-lg font-semibold">Сообщение отправлено!</p>
              <p className="text-gray-400 mt-2 text-sm">Свяжемся с вами в ближайшее время.</p>
              <button
                onClick={() => setSent(false)}
                className="mt-5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Отправить ещё
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Имя</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Telegram / телефон</label>
                <input
                  type="text"
                  required
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                  placeholder="@username или +7..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Что интересует?</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
                  placeholder="Укажите товар или опишите задачу..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Отправить заявку
              </button>
            </form>
          )}
        </section>

      </div>

      <footer className="border-t border-gray-800 mt-16 px-6 py-6 text-center text-gray-600 text-sm">
        RotorHazard / NuclearHazard — системы хронометража для FPV гонок
      </footer>
    </main>
  );
}
