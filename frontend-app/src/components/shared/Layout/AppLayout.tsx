import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/shared/Sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { KorexIsotipo } from "@/components/shared/KorexLogo";
import { tenant } from "@/lib/tenant";

const STORAGE_KEY = "fitpro:trainer-sidebar-collapsed";

export const AppLayout = () => {
  const { isAuthenticated } = useAuth();
  usePushNotifications(isAuthenticated);

  const bgImage = tenant.trainerPhoto ? "/brands/franco/franco1.JPEG" : null;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 gap-0"
          showCloseButton={false}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir navegación"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: '12px', padding: '7px', display: 'inline-flex', border: '1px solid rgba(255,255,255,0.18)' }}>
              <KorexIsotipo size={52} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase leading-tight truncate">
                {tenant.trainerName}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                Personal Trainer
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 relative">
          {bgImage && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                backgroundRepeat: 'no-repeat',
                opacity: 0.06,
              }}
            />
          )}
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
