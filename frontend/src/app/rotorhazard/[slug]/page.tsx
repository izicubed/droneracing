import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, getProductBySlug, formatPrice, discountPercent } from "@/lib/products";
import OrderForm from "./OrderForm";
import ProductGallery from "./ProductGallery";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const discount = discountPercent(product.price, product.oldPrice);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link
          href="/rotorhazard"
          className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Назад в каталог
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400 text-sm truncate">{product.name}</span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">

        {/* Product hero */}
        <section>
          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Image — 60% */}
            <div className="md:col-span-3">
              <ProductGallery
                images={product.images && product.images.length > 0 ? product.images : [product.image]}
                alt={product.name}
                category={product.category}
                discount={discount}
              />
            </div>

            {/* Info — 40% */}
            <div className="md:col-span-2 flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-white leading-snug mb-2">{product.name}</h1>
                <p className="text-gray-400 text-sm leading-relaxed">{product.shortDesc}</p>
              </div>

              {/* Price */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                <span className="block text-gray-500 text-sm line-through mb-1">{formatPrice(product.oldPrice)}</span>
                <span className="text-orange-400 font-bold text-3xl">{formatPrice(product.price)}</span>
                <span className="ml-3 text-xs text-orange-300/70">скидка {discount}%</span>
              </div>

              {/* CTA */}
              <a
                href="#contact"
                className="block text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                Заказать
              </a>

              {/* Features */}
              <div>
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Характеристики</h2>
                <ul className="space-y-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-orange-400 mt-0.5 shrink-0">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-6">
          <h2 className="text-lg font-bold text-white mb-3">Описание</h2>
          <p className="text-gray-300 leading-relaxed">{product.description}</p>
        </section>

        {/* Requires */}
        {product.requires && product.requires.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-5">Также потребуется</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.requires.map((req) => {
                const linked = PRODUCTS.find((p) =>
                  p.slug !== product.slug &&
                  p.name.toLowerCase().includes(req.toLowerCase().split(" ")[0])
                );
                return (
                  <div key={req} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                    {linked ? (
                      <>
                        <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-800">
                          <Image
                            src={linked.image}
                            alt={linked.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        </div>
                        <p className="text-sm font-medium text-white leading-snug">{linked.name}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-orange-400 font-bold">{formatPrice(linked.price)}</span>
                          <Link
                            href={`/rotorhazard/${linked.slug}`}
                            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Подробнее
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-orange-400 shrink-0 mt-0.5">→</span>
                        {req}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Contact form */}
        <section id="contact">
          <h2 className="text-2xl font-bold mb-6 text-white">Связаться / Заказать</h2>
          <OrderForm />
        </section>

      </div>

      <footer className="border-t border-gray-800 mt-16 px-6 py-6 text-center text-gray-600 text-sm">
        RotorHazard / NuclearHazard — системы хронометража для FPV гонок
      </footer>
    </main>
  );
}
