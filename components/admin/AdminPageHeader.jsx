export default function AdminPageHeader({ title, description, action }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-aira-primary/65">
          Panel Admin / {title}
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-aira-primary">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-aira-text/60">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
} 