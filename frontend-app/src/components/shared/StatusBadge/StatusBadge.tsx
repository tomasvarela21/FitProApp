import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentStatus } from "@/types";

type StatusConfig = {
  label: string;
  className: string;
};

const statusConfig: Record<StudentStatus, StatusConfig> = {
  ACTIVE: {
    label: "Activo",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  INVITED: {
    label: "Invitado",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  PAUSED: {
    label: "Pausado",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  INACTIVE: {
    label: "Inactivo",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  },
};

type StatusBadgeProps = {
  status: StudentStatus;
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  );
};