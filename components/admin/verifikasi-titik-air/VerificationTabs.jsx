"use client";

export default function VerificationTabs({
  activeTab,
  onTabChange,
  waitingCount,
  reviewedCount,
}) {
  const tabs = [
    { id: "waiting", label: "Menunggu", count: waitingCount },
    { id: "reviewed", label: "Sudah ditinjau", count: reviewedCount },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter status verifikasi"
      className="flex flex-wrap items-center gap-2"
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-aira-secondary/40 ${
              active
                ? "border-aira-primary bg-aira-primary text-white shadow-sm"
                : "border-aira-primary/20 bg-white text-aira-primary hover:bg-aira-bg"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        );
      })}
    </div>
  );
} 