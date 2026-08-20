import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { useProfile } from "@/features/auth/hooks/use-profile";
import { useTelegramLink } from "@/features/auth/hooks/use-telegram-link";

const profileSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const TelegramCard = () => {
  const {
    status,
    isLoading,
    generateCode,
    generatedCode,
    isGenerating,
    unlink,
    isUnlinking,
  } = useTelegramLink();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    try {
      await generateCode();
    } catch {
      setError("No se pudo generar el código, probá de nuevo");
    }
  };

  const handleUnlink = async () => {
    setError(null);
    try {
      await unlink();
    } catch {
      setError("No se pudo desvincular, probá de nuevo");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500/10 text-sky-500 shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base">Asistente de Telegram</CardTitle>
            <CardDescription>
              Gestioná tus alumnos, pagos y rutinas chateando con el bot
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : status?.linked ? (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Cuenta vinculada a Telegram
            </div>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Desvincular
            </Button>
          </>
        ) : generatedCode ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Mandale este código al bot con el comando{" "}
              <span className="font-mono">/vincular</span>, o tocá el botón
              para abrirlo directo:
            </p>
            <div className="rounded-md bg-muted px-4 py-3 text-center">
              <span className="font-mono text-2xl tracking-widest">
                {generatedCode.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Vence a las{" "}
              {new Date(generatedCode.expiresAt).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {generatedCode.deepLink && (
              <Button asChild className="w-full">
                <a
                  href={generatedCode.deepLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Abrir en Telegram
                </a>
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Vinculá tu cuenta para consultar cuotas, registrar pagos y
              asignar rutinas desde Telegram.
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Generar código de vinculación
            </Button>
          </>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ProfilePage = () => {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileForm) => {
    setError(null);
    setSuccess(false);
    try {
      await updateProfile(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Error al actualizar el perfil";
      setError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Mi perfil"
        description="Administrá tu información personal"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-bold shrink-0">
              {profile?.firstName[0]}
              {profile?.lastName[0]}
            </div>
            <div>
              <CardTitle className="text-base">
                {profile?.firstName} {profile?.lastName}
              </CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email}
                disabled
                className="bg-muted/50 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Teléfono{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id="phone"
                placeholder="+54 9 11 1234-5678"
                {...register("phone")}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <p className="text-xs text-emerald-600">
                  ✓ Perfil actualizado correctamente
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isUpdating || !isDirty}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TelegramCard />
    </div>
  );
};
