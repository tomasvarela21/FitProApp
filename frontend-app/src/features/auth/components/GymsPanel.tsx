import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Loader2, Check, X } from "lucide-react";
import { gymsApi } from "@/api/gyms.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Gym } from "@/types";

type GymWithCount = Gym & { _count?: { students: number } };

function GymRow({
  gym,
  onEdit,
  onDelete,
}: {
  gym: GymWithCount;
  onEdit: (gym: GymWithCount) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{gym.name}</p>
        {gym.address && (
          <p className="text-xs text-muted-foreground truncate">{gym.address}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{gym._count?.students ?? 0}</p>
        <p className="text-xs text-muted-foreground">alumno{(gym._count?.students ?? 0) !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(gym)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(gym.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function GymForm({
  initial,
  onSave,
  onCancel,
  isLoading,
}: {
  initial?: { name: string; address: string };
  onSave: (data: { name: string; address?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), address: address.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 py-3 border-b border-border/50">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre del gimnasio *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" size="sm" disabled={isLoading || !name.trim()}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        placeholder="Dirección (opcional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
    </form>
  );
}

export function GymsPanel() {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingGym, setEditingGym] = useState<GymWithCount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: gyms = [], isLoading } = useQuery({
    queryKey: ["gyms"],
    queryFn: () => gymsApi.list().then((r) => r.data.data as GymWithCount[]),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["gyms"] });
    qc.invalidateQueries({ queryKey: ["analytics-business"] });
  };

  const createMut = useMutation({
    mutationFn: (data: { name: string; address?: string }) => gymsApi.create(data),
    onSuccess: () => { invalidate(); setIsCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; address?: string | null } }) =>
      gymsApi.update(id, data),
    onSuccess: () => { invalidate(); setEditingGym(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => gymsApi.delete(id),
    onSuccess: () => { invalidate(); setDeletingId(null); },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {gyms.length === 0 ? "No tenés gimnasios registrados" : `${gyms.length} gimnasio${gyms.length !== 1 ? "s" : ""}`}
        </p>
        {!isCreating && (
          <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {isCreating && (
        <GymForm
          onSave={(data) => createMut.mutate(data)}
          onCancel={() => setIsCreating(false)}
          isLoading={createMut.isPending}
        />
      )}

      {gyms.length === 0 && !isCreating && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Building2 className="w-8 h-8" />
          <p className="text-sm">Agregá tu primer gimnasio</p>
        </div>
      )}

      <div>
        {gyms.map((gym) =>
          editingGym?.id === gym.id ? (
            <GymForm
              key={gym.id}
              initial={{ name: gym.name, address: gym.address ?? "" }}
              onSave={(data) =>
                updateMut.mutate({
                  id: gym.id,
                  data: { name: data.name, address: data.address ?? null },
                })
              }
              onCancel={() => setEditingGym(null)}
              isLoading={updateMut.isPending}
            />
          ) : deletingId === gym.id ? (
            <div key={gym.id} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
              <p className="flex-1 text-sm">
                ¿Eliminar <span className="font-medium">{gym.name}</span>? Los alumnos quedarán sin gimnasio.
              </p>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteMut.mutate(gym.id)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Eliminar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <GymRow
              key={gym.id}
              gym={gym}
              onEdit={setEditingGym}
              onDelete={setDeletingId}
            />
          )
        )}
      </div>
    </div>
  );
}
