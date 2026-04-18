"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images, alt, category, discount }: { images: string[]; alt: string; category: string; discount: number }) {
  const [selected, setSelected] = useState(images[0]);

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-800 border border-gray-800">
        <Image
          src={selected}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 60vw"
          priority
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs font-bold bg-gray-900/80 text-orange-400 border border-orange-500/40 rounded-full px-2.5 py-1 uppercase tracking-wide backdrop-blur-sm">
            {category}
          </span>
          <span className="text-xs font-bold bg-orange-500 text-white rounded-full px-2.5 py-1">
            -{discount}%
          </span>
        </div>
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((img) => (
            <button
              key={img}
              type="button"
              onClick={() => setSelected(img)}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden border transition-colors ${selected === img ? "border-orange-500" : "border-gray-800 hover:border-gray-600"}`}
            >
              <Image src={img} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
