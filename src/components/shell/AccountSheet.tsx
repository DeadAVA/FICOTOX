"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { AvatarArt, AVATARS, resolveAvatarKey } from "@/components/ui/AvatarArt";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Overlay";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { invalidate } from "@/lib/client/store";

/*
 * "Mi cuenta": quien soy (nombre, correo, rol) y mi avatar. La persona elige
 * uno del catalogo; el cambio queda en la bitacora como edicion de su usuario.
 */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, token, refreshMe } = useSession();
  const seed = (user?.email || user?.nombre || "?").trim().toLowerCase();
  const current = resolveAvatarKey(user?.avatar, seed);
  const [choice, setChoice] = useState<string>(current);
  const [saving, setSaving] = useState(false);
  const dirty = choice !== current;

  const save = async () => {
    setSaving(true);
    try {
      await sendJsonAuth("PUT", `${API_BASE_URL}/auth/me/avatar`, token, { avatar: choice });
      await refreshMe();
      invalidate("usuarios");
      toast.success("Avatar actualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title="Mi cuenta"
      description="Tus datos de acceso y el avatar con el que te ven en el sistema."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Guardar avatar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 rounded-[14px] bg-surface-2 p-4 ring-1 ring-line">
          <AvatarArt avatar={choice} seed={seed} size={72} className="shadow-[0_6px_16px_-6px_rgba(16,32,43,0.35)]" />
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-[16px] font-semibold text-ink">{user?.nombre || user?.email}</p>
            <p className="truncate text-[13px] text-ink-3">{user?.email}</p>
            {user?.rol ? <p className="mt-1 text-[12.5px] text-ink-2">{user.rol}</p> : null}
            <p className="mt-1 text-[12px] text-ink-4">{AVATARS[resolveAvatarKey(choice, seed)].label}</p>
          </div>
        </div>
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="title-3 text-ink">Elige tu avatar</h3>
            <p className="text-[13px] text-ink-3">Criaturas y objetos del laboratorio. Si no eliges, el sistema te asigna uno a partir de tu correo.</p>
          </div>
          <AvatarPicker value={choice} seed={seed} onChange={setChoice} />
        </section>
        <p className="text-[12px] text-ink-4">Nombre, correo y rol los administra la coordinación desde Administración › Usuarios.</p>
      </div>
    </Sheet>
  );
}
