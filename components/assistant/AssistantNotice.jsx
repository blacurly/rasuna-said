import { Info } from "lucide-react";
import { ASSISTANT_CONFIG } from "./assistant.constants";

export default function AssistantNotice() {
  return (
    <aside
      role="note"
      aria-label="Disclaimer AIRA Assistant"
      className="
        mt-3 flex w-full items-start gap-3
        rounded-2xl
        border border-aira-primary/10
        bg-aira-sand
        px-4 py-3.5
        sm:px-5 sm:py-4
      "
    >
      {/* ICON INFORMASI */}
      <div
        className="
          mt-0.5 flex size-7 shrink-0
          items-center justify-center
          rounded-full bg-white
        "
      >
        <Info
          className="size-4 text-aira-primary"
          strokeWidth={2}
        />
      </div>

      {/* ISI DISCLAIMER */}
      <div className="min-w-0 flex-1">
        <h3
          className="
            mb-1 text-xs font-semibold
            text-aira-primary
            sm:text-sm
          "
        >
          Informasi dan Disclaimer
        </h3>

        <p
          className="
            text-xs leading-relaxed
            text-aira-text/75
            sm:text-[13px]
          "
        >
          {ASSISTANT_CONFIG.notice}
        </p>
      </div>
    </aside>
  );
} 