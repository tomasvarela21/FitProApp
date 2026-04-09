import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dumbbell, Loader2, CheckCircle2, XCircle } from "lucide-react";
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

const activateSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ActivateForm = z.infer<typeof activateSchema>;

type PageState = "loading" | "form" | "success" | "error";

export const ActivateAccountPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>(
    token ? "form" : "error"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateForm>({
    resolver: zodResolver(activateSchema),
  });

  useEffect(() => {
    if (!token) {
      setPageState("error");
      setErrorMessage("El link de activación es inválido o está incompleto.");
    }
  }, [token]);

  const onSubmit = async (data: ActivateForm) => {
    if (!token) return;
    try {
      await authApi.activateAccount({ token, password: data.password });
      setPageState("success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Error al activar la cuenta";
      setErrorMessage(message);
      setPageState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FitPro</h1>
        </div>

        {/* Loading */}
        {pageState === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {pageState === "form" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Activar cuenta</CardTitle>
              <CardDescription>
                Elegí una contraseña para acceder a tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repetí tu contraseña"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Activando...
                    </>
                  ) : (
                    "Activar cuenta"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {pageState === "success" && (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">¡Cuenta activada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ya podés iniciar sesión con tu email y contraseña.
                </p>
              </div>
              <Button
                className="w-full mt-2"
                onClick={() => navigate("/login")}
              >
                Ir al login
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {pageState === "error" && (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-lg">Link inválido</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage ??
                    "El link expiró o ya fue utilizado. Pedile a tu entrenador que te reenvíe la invitación."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
