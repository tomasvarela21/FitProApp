import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Dumbbell,
  UserCircle,
  CreditCard,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  {
    label: "Dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Alumnos",
    href: "/app/students",
    icon: Users,
  },
  {
    label: "Planes",
    href: "/app/plans",
    icon: CreditCard,
  },
  {
    label: "Ejercicios",
    href: "/app/exercises",
    icon: Dumbbell,
  },
  {
    label: "Rutinas",
    href: "/app/routines",
    icon: ClipboardList,
  },
  {
    label: "Mi perfil",
    href: "/app/profile",
    icon: UserCircle,
  },
];

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
};

export const Sidebar = ({
  collapsed = false,
  onToggle,
  onNavigate,
}: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onNavigate?.();
    navigate("/login");
  };

  const initials = user?.profile
    ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
    : "TR";

  const fullName = user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : "Entrenador";

  return (
    <aside
      className={cn(
        "h-dvh bg-card border-r border-border flex flex-col shrink-0 transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2 py-5",
          collapsed ? "flex-col justify-center px-2" : "px-6"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Dumbbell className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight">FitPro</span>
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

      {/* Nav */}
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
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* User */}
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
