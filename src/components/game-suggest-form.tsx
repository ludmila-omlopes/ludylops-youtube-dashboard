"use client";

import { useState } from "react";

export function GameSuggestForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitted(true);
    setName("");
    setDescription("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel relative overflow-hidden bg-[var(--color-yellow)] p-5 sm:p-6"
    >
      {/* Decorative pattern */}
      <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <h3
            className="text-lg font-bold uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sugira um jogo
          </h3>
        </div>

        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Gaste pipetz pra dar boost na sugestao!
        </p>

        <div className="mt-4 grid gap-3">
          <input
            type="text"
            placeholder="Nome do jogo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_var(--shadow-color)]"
          />
          <input
            type="text"
            placeholder="Por que esse jogo? (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-3 text-sm shadow-[3px_3px_0_var(--shadow-color)]"
          />
          <button
            type="submit"
            className="btn-brutal bg-[var(--color-purple-mid)] px-6 py-3 text-sm text-white"
          >
            Enviar sugestao 🚀
          </button>
        </div>
        {submitted ? (
          <div className="sticker sticker-pop mt-3 inline-flex bg-[var(--color-mint)] px-3 py-1.5 text-sm">
            ✓ Sugestao enviada!
          </div>
        ) : null}
      </div>
    </form>
  );
}
