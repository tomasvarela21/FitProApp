import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dumbbell, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authApi } from "@/api/auth.api";

type PageState = "loading" | "success" | "error";

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setPageState("error");
        setErrorMessage("El enlace de verificación es inválido o está incompleto.");
        return;
      }

      try {
        await authApi.verifyEmail({ token });
        setPageState("success");
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Error al verificar el correo electrónico.";
        setErrorMessage(message);
        setPageState("error");
      }
    };

    performVerification();
  }, [token]);

  const handleGoToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FitPro</h1>
        </div>

        {/* Loading State */}
        {pageState === "loading" && (
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Verificando tu email</CardTitle>
              <CardDescription>
                Aguardá un instante mientras confirmamos tu cuenta...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {pageState === "success" && (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-10 gap-5">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-bold">¡Email verificado!</CardTitle>
                <CardDescription className="text-sm text-muted-foreground px-2">
                  Tu cuenta de entrenador fue activada correctamente y tu período de prueba de 14 días ha comenzado.
                  Ya podés iniciar sesión con tus credenciales.
                </CardDescription>
              </div>
              <Button className="w-full mt-4" onClick={handleGoToLogin}>
                Iniciar sesión
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {pageState === "error" && (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-10 gap-5">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-bold">Error de verificación</CardTitle>
                <CardDescription className="text-sm text-muted-foreground px-2">
                  {errorMessage ??
                    "El enlace de verificación expiró, es inválido o ya fue utilizado."}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => (window.location.href = "/login")}
              >
                Volver al inicio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
