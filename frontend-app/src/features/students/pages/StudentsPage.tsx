import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { CreateStudentSheet } from "@/features/students/components/CreateStudentSheet";
import { StudentDetailSheet } from "@/features/students/components/StudentDetailSheet";
import { useStudents } from "@/features/students/hooks/use-students";
import type { Student } from "@/types";

const StudentRowSkeleton = () => (
  <div className="flex items-center justify-between py-4 px-6">
    <div className="flex items-center gap-3 flex-1">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
    <div className="flex items-center gap-6">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

export const StudentsPage = () => {
  const { students, meta, isLoading, page, setPage, search, setSearch } =
    useStudents();
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Alumnos"
        description="Gestioná tus alumnos y sus invitaciones"
        action={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Nuevo alumno
          </Button>
        }
      />

      <CreateStudentSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <StudentDetailSheet
        student={selectedStudent}
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Buscar
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        )}
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center px-6 py-3 border-b border-border bg-muted/40 rounded-t-lg">
            <div className="flex-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Alumno
              </span>
            </div>
            <div className="w-28 text-right">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Estado
              </span>
            </div>
            <div className="w-32 text-right">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ingresó
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <StudentRowSkeleton key={i} />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">
                {search
                  ? "No se encontraron alumnos"
                  : "No tenés alumnos aún"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search
                  ? "Probá con otro término de búsqueda"
                  : "Creá tu primer alumno con el botón de arriba"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>
                  <div className="w-28 flex justify-end">
                    <StatusBadge status={student.status} />
                  </div>
                  <div className="w-32 text-right">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(student.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {meta.total} alumnos · página {meta.page} de {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
