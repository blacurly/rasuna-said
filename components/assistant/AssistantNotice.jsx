import { Info } from "lucide-react";
import { ASSISTANT_CONFIG } from "./assistant.constants";

export default function AssistantNotice() {
  return (
    <aside
      role="note"
      aria-label="Disclaimer AIRA Assistant"
      className="
        mt-5 flex w-full items-start gap-3
        rounded-2xl
        bg-aira-sand/70
        px-4 py-4
        sm:px-5
      "
    >
      <Info
        className="mt-0.5 size-4 shrink-0 text-aira-text/60"
        strokeWidth={1.75}
        aria-hidden="true"
      />

      <p className="min-w-0 flex-1 text-xs leading-relaxed text-aira-text/70">
        <span className="font-medium">Disclaimer:</span>{" "}
        {ASSISTANT_CONFIG.notice}
      </p>
    </aside>
  );
} 