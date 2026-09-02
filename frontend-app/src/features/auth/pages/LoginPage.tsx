import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { KorexIsotipo } from "@/components/shared/KorexLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authApi } from "@/api/auth.api";
import { useAuth } from "@/hooks/use-auth";
import { tenant } from "@/lib/tenant";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await authApi.login(data);
      const { accessToken, user } = res.data.data;
      setAuth(accessToken, user);
      if (user.role === "STUDENT") {
        navigate("/student/dashboard");
      } else {
        navigate("/app/dashboard");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Credenciales inválidas";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Ingresando...
          </>
        ) : (
          "Ingresar"
        )}
      </Button>

      {tenant.showRegisterLink && (
        <p className="text-center text-sm text-muted-foreground">
          ¿Sos personal trainer?{" "}
          <a href="/register" className="font-medium text-primary hover:underline">
            Registrate gratis
          </a>
        </p>
      )}
    </form>
  );
}

// Layout con foto del entrenador — mobile: fondo full-bleed, desktop: split
function SplitLayout() {
  return (
    <div className="min-h-dvh bg-background">

      {/* ── MOBILE: foto como fondo full-bleed ─────────────────────────────── */}
      <div className="lg:hidden relative min-h-dvh flex flex-col">
        {/* Foto de fondo */}
        <img
          src={tenant.trainerPhoto!}
          alt={tenant.trainerName}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradiente: casi transparente arriba, muy oscuro abajo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 45%, rgba(14,11,9,0.97) 75%, rgba(14,11,9,1) 100%)",
          }}
        />

        {/* Contenido encima de la foto */}
        <div className="relative z-10 flex flex-col flex-1 justify-end px-5 pb-8 pt-safe">
          {/* Marca */}
          <div className="mb-6">
            <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: '14px', padding: '3px', display: 'inline-block', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <KorexIsotipo size={135} />
            </div>
          </div>

          {/* Card del form */}
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Iniciar sesión</CardTitle>
              <CardDescription className="text-sm">Ingresá con tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── DESKTOP: split 55/45 ───────────────────────────────────────────── */}
      <div className="hidden lg:flex min-h-dvh">
        {/* Foto */}
        <div className="w-[55%] relative overflow-hidden">
          <img
            src={tenant.trainerPhoto!}
            alt={tenant.trainerName}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background" />
          <div className="absolute bottom-10 left-10 right-0">
            <h1
              className="text-5xl font-black tracking-[0.02em] text-white leading-none"
              style={{ textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
            >
              {tenant.trainerName}
            </h1>
            <p className="text-xs tracking-[0.18em] uppercase text-white/55 mt-2">
              Personal Trainer
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: '14px', padding: '3px', display: 'inline-block', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <KorexIsotipo size={155} />
              </div>
            </div>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Iniciar sesión</CardTitle>
                <CardDescription>Ingresá con tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Layout centrado clásico — fallback cuando no hay foto
function CenteredLayout() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <KorexIsotipo size={64} showBackground />
          <h1 className="text-2xl font-bold tracking-[0.18em] uppercase">{tenant.name}</h1>
          <p className="text-muted-foreground text-sm">
            Panel de gestión para entrenadores
          </p>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
            <CardDescription>Ingresá con tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const LoginPage = () => {
  if (tenant.trainerPhoto) {
    return <SplitLayout />;
  }
  return <CenteredLayout />;
};
