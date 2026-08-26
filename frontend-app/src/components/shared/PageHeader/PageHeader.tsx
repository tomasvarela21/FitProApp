type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
      <div className="min-w-0">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight break-words">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 mt-1">{action}</div>}
    </div>
  );
};
