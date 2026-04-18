"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/admin/leads");
      } else {
        setError("Неверный email или пароль");
      }
    } catch {
      setError("Ошибка соединения");
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-96 bg-gray-900 border border-gray-700 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Админка RotorHazard</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 mb-3 focus:outline-none focus:border-yellow-500"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 mb-4 focus:outline-none focus:border-yellow-500"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold py-2 rounded"
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </div>
    </div>
  );
}
