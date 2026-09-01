import { NavLink, useNavigate } from "react-router-dom";
import {
  UserCircle,
  LogOut,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KorexIsotipo } from "@/components/shared/KorexLogo";
import { tenant } from "@/lib/tenant";

const navItems = [
  {
    label: "Mi entrenamiento",
    href: "/student/dashboard",
    icon: Dumbbell,
  },
  {
    label: "Ejercicios",
    href: "/student/exercises",
    icon: BookOpen,
  },
  {
    label: "Mi progreso",
    href: "/student/progress",
    icon: TrendingUp,
  },
  {
    label: "Mi perfil",
    href: "/student/profile",
    icon: UserCircle,
  },
];

type StudentSidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
};

export const StudentSidebar = ({
  collapsed = false,
  onToggle,
  onNavigate,
}: StudentSidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { authApi } = await import("@/api/auth.api");
      await authApi.logout();
    } catch {
      // Si falla el logout en el server, igual limpiamos localmente
    } finally {
      logout();
      onNavigate?.();
      navigate("/login");
    }
  };

  const initials = user?.profile
    ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
    : "AL";

  const fullName = user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : "Alumno";

  return (
    <aside
      className={cn(
        "h-dvh bg-card border-r border-border flex flex-col shrink-0 transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 py-4",
          collapsed ? "flex-col justify-center px-2" : "px-4"
        )}
      >
        <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: '12px', padding: '3px', display: 'inline-flex', border: '1px solid rgba(255,255,255,0.18)' }}>
          <KorexIsotipo size={collapsed ? 44 : 70} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase leading-tight truncate">
              {tenant.trainerName}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">
              Personal Trainer
            </p>
          </div>
        )}
        {onToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("ml-auto hidden lg:inline-flex", collapsed && "ml-0")}
            onClick={onToggle}
            aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
            title={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      <Separator />

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-accent text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="px-3 py-4 space-y-2">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-3 text-muted-foreground hover:text-destructive",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={handleLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && "Cerrar sesión"}
        </Button>
      </div>
    </aside>
  );
};
