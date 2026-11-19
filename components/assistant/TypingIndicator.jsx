"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import AssistantAvatar from "./AssistantAvatar";

const BATAS_LOADING_LAMA = 12000;

export default function TypingIndicator({
  historyLoading = false,
}) {
  const [loadingLama, setLoadingLama] = useState(false);

  useEffect(() => {
    setLoadingLama(false);

    const timer = setTimeout(() => {
      setLoadingLama(true);
    }, BATAS_LOADING_LAMA);

    return () => clearTimeout(timer);
  }, [historyLoading]);

  const pesanLoading = historyLoading
    ? loadingLama
      ? "Percakapanmu membutuhkan sedikit waktu lebih lama untuk dimuat. Terima kasih sudah menunggu. 💙"
      : "AIRA sedang menyiapkan percakapan sebelumnya..."
    : loadingLama
      ? "Sepertinya AIRA membutuhkan sedikit waktu lebih lama untuk mencari informasi yang relevan. Tenang, pertanyaanmu masih sedang diproses. 💙"
      : "AIRA sedang menyiapkan jawaban terbaik untukmu. 💧";

  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />

      <div
        className="
          flex max-w-[90%] items-start gap-3
          rounded-3xl rounded-tl-lg
          border border-aira-primary/10
          bg-white px-4 py-4
          text-sm leading-relaxed
          text-aira-primary
          sm:max-w-[85%] sm:px-5
        "
        role="status"
        aria-live="polite"
      >
        <RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin" />

        <p>{pesanLoading}</p>
      </div>
    </div>
  );
} 