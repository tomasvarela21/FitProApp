import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, Plus, CheckCircle2, Loader2, ShieldAlert,
} from "lucide-react";
import { studentsApi } from "@/api/students.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StudentNote, StudentInjury, InjurySeverity } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Notes ────────────────────────────────────────────────────────────────────

const NoteCard = ({
  note,
  onDelete,
  deleting,
}: {
  note: StudentNote;
  onDelete: () => void;
  deleting: boolean;
}) => (
  <div className="flex gap-3 py-3 border-b border-border last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {format(new Date(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
      </p>
    </div>
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive shrink-0"
      onClick={onDelete}
      disabled={deleting}
    >
      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </Button>
  </div>
);

const NotesSection = ({ studentId }: { studentId: string }) => {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["student-notes", studentId],
    queryFn: () => studentsApi.getNotes(studentId).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (c: string) => studentsApi.createNote(studentId, c),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["student-notes", studentId] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (noteId: string) => studentsApi.deleteNote(studentId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-notes", studentId] }),
    onSettled: () => setDeletingId(null),
  });

  const handleDelete = (noteId: string) => {
    setDeletingId(noteId);
    deleteMut.mutate(noteId);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Notas del entrenador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add note */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escribí una nota sobre este alumno…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-sm resize-none min-h-[80px]"
          />
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!content.trim() || createMut.isPending}
            onClick={() => createMut.mutate(content.trim())}
          >
            {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Agregar nota
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !notes || notes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin notas aún.</p>
        ) : (
          <div>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={() => handleDelete(note.id)}
                deleting={deletingId === note.id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Injuries ─────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<InjurySeverity, { label: string; className: string }> = {
  MILD: { label: "Leve", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  MODERATE: { label: "Moderada", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  SEVERE: { label: "Grave", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const InjuryCard = ({
  injury,
  onResolve,
  onDelete,
  resolving,
  deleting,
}: {
  injury: StudentInjury;
  onResolve: () => void;
  onDelete: () => void;
  resolving: boolean;
  deleting: boolean;
}) => {
  const cfg = SEVERITY_CONFIG[injury.severity];
  const isResolved = !!injury.resolvedAt;
  return (
    <div className={`rounded-lg border p-3 space-y-1.5 ${isResolved ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{injury.bodyPart}</span>
          <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
          {isResolved && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
              <CheckCircle2 className="w-3 h-3" />Resuelta
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isResolved && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Marcar como resuelta"
              onClick={onResolve}
              disabled={resolving}
              className="text-primary"
            >
              {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{injury.description}</p>
      {injury.notes && <p className="text-xs text-muted-foreground italic">{injury.notes}</p>}
      <p className="text-xs text-muted-foreground">
        Ocurrió: {format(new Date(injury.occurredAt), "d MMM yyyy", { locale: es })}
        {isResolved && injury.resolvedAt && (
          <> · Resuelta: {format(new Date(injury.resolvedAt), "d MMM yyyy", { locale: es })}</>
        )}
      </p>
    </div>
  );
};

const InjuriesSection = ({ studentId }: { studentId: string }) => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bodyPart: "",
    description: "",
    severity: "MILD" as InjurySeverity,
    occurredAt: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "delete" | null>(null);

  const { data: injuries, isLoading } = useQuery({
    queryKey: ["student-injuries", studentId],
    queryFn: () => studentsApi.getInjuries(studentId).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: () => studentsApi.createInjury(studentId, {
      bodyPart: form.bodyPart,
      description: form.description,
      severity: form.severity,
      occurredAt: form.occurredAt,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      setShowForm(false);
      setForm({ bodyPart: "", description: "", severity: "MILD", occurredAt: new Date().toISOString().split("T")[0], notes: "" });
      qc.invalidateQueries({ queryKey: ["student-injuries", studentId] });
    },
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => studentsApi.updateInjury(studentId, id, { resolvedAt: new Date().toISOString().split("T")[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-injuries", studentId] }),
    onSettled: () => { setActingId(null); setActionType(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => studentsApi.deleteInjury(studentId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-injuries", studentId] }),
    onSettled: () => { setActingId(null); setActionType(null); },
  });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Historial de lesiones
        </CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : <><Plus className="w-3.5 h-3.5" />Registrar</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/10">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Zona del cuerpo</Label>
                <Input
                  placeholder="Ej: Rodilla izquierda"
                  className="h-8 text-sm"
                  value={form.bodyPart}
                  onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha de ocurrencia</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.occurredAt}
                  onChange={(e) => setForm((f) => ({ ...f, occurredAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                placeholder="Describí la lesión…"
                className="text-sm resize-none min-h-[60px]"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Gravedad</Label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as InjurySeverity }))}
                >
                  <option value="MILD">Leve</option>
                  <option value="MODERATE">Moderada</option>
                  <option value="SEVERE">Grave</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notas adicionales</Label>
                <Input
                  placeholder="Observaciones…"
                  className="h-8 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!form.bodyPart || !form.description || !form.occurredAt || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Guardar lesión
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : !injuries || injuries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin lesiones registradas.</p>
        ) : (
          <div className="space-y-2">
            {injuries.map((injury) => (
              <InjuryCard
                key={injury.id}
                injury={injury}
                onResolve={() => { setActingId(injury.id); setActionType("resolve"); resolveMut.mutate(injury.id); }}
                onDelete={() => { setActingId(injury.id); setActionType("delete"); deleteMut.mutate(injury.id); }}
                resolving={actingId === injury.id && actionType === "resolve"}
                deleting={actingId === injury.id && actionType === "delete"}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const NotesInjuriesPanel = ({ studentId }: { studentId: string }) => (
  <div className="space-y-4">
    <NotesSection studentId={studentId} />
    <InjuriesSection studentId={studentId} />
  </div>
);
