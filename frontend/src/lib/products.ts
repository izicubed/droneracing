export type Product = {
  slug: string;
  name: string;
  category: "RotorHazard" | "NuclearHazard";
  price: number;
  oldPrice: number;
  image: string;
  images?: string[];
  shortDesc: string;
  description: string;
  features: string[];
  requires?: string[];
};

export const PRODUCTS: Product[] = [
  {
    slug: "rh-board-assembled",
    name: "Собранная плата засечки RotorHazard",
    category: "RotorHazard",
    price: 8000,
    oldPrice: 14000,
    image: "/products/rh-board.jpg",
    shortDesc: "Готовая собранная и протестированная плата засечки",
    features: [
      "Управление мероприятием",
      "Самый быстрый круг / три круга подряд",
      "Командные гонки",
      "Адаптивная калибровка для каждого пилота",
      "Полная статистика полёта",
      "Поддержка LED-панели",
      "До 8 приёмников RX5808",
    ],
    requires: ["Raspberry Pi 5 8GB + microSD", "Приёмники RX5808 (1-8 шт.)"],
    description:
      "Только собранная плата засечки RotorHazard — без корпуса и периферии. Система управления мероприятием для дронрейсинга. Адаптивная калибровка запоминается для каждого пилота. На дрон ничего устанавливать не нужно.",
  },
  {
    slug: "rh-pcb",
    name: "Печатная плата RotorHazard",
    category: "RotorHazard",
    price: 1000,
    oldPrice: 2000,
    image: "/products/rh-pcb.jpg",
    shortDesc: "Голая PCB плата для самостоятельной сборки",
    features: [
      "Оригинальная схемотехника RotorHazard",
      "Совместима со всеми версиями ПО",
      "Для опытных радиолюбителей",
    ],
    description:
      "Печатная плата без компонентов. Для самостоятельной пайки и сборки засечки RotorHazard. Требует навыков пайки SMD компонентов.",
  },
  {
    slug: "rh-kit",
    name: "Комплект для сборки RotorHazard",
    category: "RotorHazard",
    price: 4000,
    oldPrice: 6000,
    image: "/products/kit-assembly.jpg",
    shortDesc: "Полный набор компонентов для самостоятельной сборки",
    features: [
      "Все необходимые компоненты",
      "Инструкция по сборке",
      "Базовые навыки пайки",
    ],
    requires: [
      "Raspberry Pi 5 8GB + microSD",
      "Приёмники RX5808 (1-8 шт.)",
      "Корпус (опционально)",
    ],
    description:
      "Полный комплект для самостоятельной сборки платы засечки RotorHazard. Включает все необходимые компоненты и инструкцию.",
  },
  {
    slug: "rh-carbon-case",
    name: "Карбоновый корпус для RotorHazard",
    category: "RotorHazard",
    price: 2000,
    oldPrice: 3000,
    image: "/products/rh-carbon-case-1.jpg",
    images: ["/products/rh-carbon-case-1.jpg", "/products/rh-carbon-case-2.jpg"],
    shortDesc: "Защитный корпус из карбона",
    features: [
      "Лёгкий и прочный карбон",
      "Защита от повреждений",
      "Профессиональный внешний вид",
    ],
    description:
      "Корпус из углеродного волокна (карбон) для платы засечки RotorHazard. Надёжная защита при транспортировке и эксплуатации.",
  },
  {
    slug: "rh-plastic-case",
    name: "Пластиковый корпус для RotorHazard",
    category: "RotorHazard",
    price: 1000,
    oldPrice: 2000,
    image: "/products/rh-plastic-case.jpg",
    shortDesc: "Защитный корпус из пластика",
    features: [
      "Лёгкий пластик",
      "Защита платы",
      "Бюджетный вариант",
    ],
    description:
      "Пластиковый корпус для платы засечки RotorHazard. Бюджетный вариант для защиты платы.",
  },
  {
    slug: "raspberry-pi-5",
    name: "Raspberry Pi 5 8GB (Комплект для RotorHazard)",
    category: "RotorHazard",
    price: 9000,
    oldPrice: 12000,
    image: "/products/raspberry-pi-5.jpg",
    shortDesc: "Одноплатный компьютер с предустановленным ПО",
    features: [
      "Raspberry Pi 5 8GB RAM",
      "microSD с предустановленным RotorHazard",
      "Готов к подключению платы засечки",
    ],
    description:
      "Комплект Raspberry Pi 5 8GB с microSD картой, на которой предустановлено ПО RotorHazard. Подключи к плате засечки — и система готова к работе.",
  },
  {
    slug: "rx5808",
    name: "Приёмник RX5808 Boscam",
    category: "RotorHazard",
    price: 2000,
    oldPrice: 3000,
    image: "/products/rx5808.jpg",
    shortDesc: "Видеоприёмник 5.8 ГГц для ворот",
    features: [
      "Диапазон 5.8 ГГц",
      "1 шт. на одни ворота",
      "До 8 шт. на систему",
      "Совместим со всеми FPV видеопередатчиками",
    ],
    description:
      "Видеоприёмник RX5808 Boscam на 5.8 ГГц. Фиксирует пролёт дрона через ворота по сигналу видеопередатчика. Нужен 1 шт. на каждые ворота, до 8 на одну систему.",
  },
  {
    slug: "nh-atom",
    name: "Засечка NuclearHazard Atom",
    category: "NuclearHazard",
    price: 3000,
    oldPrice: 5000,
    image: "/products/nh-atom-new.jpg",
    shortDesc: "Компактная предсобранная засечка",
    features: [
      "Предсобранная на заводе",
      "Компактный форм-фактор",
      "Подключи приёмники и Raspberry Pi — готово",
      "Все преимущества RotorHazard",
    ],
    requires: ["Raspberry Pi + microSD", "Приёмники RX5808"],
    description:
      "NuclearHazard Atom — компактная предсобранная заводская засечка на базе RotorHazard. Минимум настройки: подключи приёмники и Raspberry Pi — и система готова к соревнованиям.",
  },
  {
    slug: "nh-full",
    name: "Засечка NuclearHazard",
    category: "NuclearHazard",
    price: 6000,
    oldPrice: 16000,
    image: "/products/nh-full.jpg",
    shortDesc: "Полноразмерная предсобранная заводская засечка",
    features: [
      "Предсобранная на заводе",
      "До 8 приёмников RX5808",
      "Адаптивная калибровка",
      "Полная статистика",
      "Поддержка LED",
      "Командные гонки",
    ],
    requires: ["Raspberry Pi + microSD", "Приёмники RX5808 (1-8 шт.)"],
    description:
      "NuclearHazard — предсобранная на заводе полноразмерная засечка для дронрейсинга на базе RotorHazard. До 8 ворот, адаптивная калибровка, полная статистика.",
  },
  {
    slug: "rh-turnkey",
    name: "Комплект системы RotorHazard «под ключ»",
    category: "RotorHazard",
    price: 38500,
    oldPrice: 45000,
    image: "/products/kit-full.jpg",
    shortDesc: "Всё для запуска мероприятия — в одном комплекте",
    features: [
      "Плата RotorHazard / совместимая засечка",
      "Raspberry Pi 5 8GB с ПО",
      "Корпус",
      "Приёмники RX5808",
      "Инструкция по запуску",
      "Готово к мероприятию",
    ],
    description:
      "Полный комплект для проведения FPV мероприятия. Включает всё необходимое: плату RotorHazard / совместимую засечку, Raspberry Pi 5 с предустановленным ПО, корпус, приёмники и подробную инструкцию.",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

export function discountPercent(price: number, oldPrice: number): number {
  return Math.round((1 - price / oldPrice) * 100);
}
