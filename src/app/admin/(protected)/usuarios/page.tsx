"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useSesionAdmin } from "@/components/admin/SesionAdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDateTime } from "@/lib/datetime";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/validation/adminUser";

interface AdminUsuario {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "LAB_ADMIN";
  roomId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  room: { id: string; name: string } | null;
}

type Sala = { id: string; name: string };

const ETIQUETA_ROL = {
  SUPER_ADMIN: "Administrador general",
  LAB_ADMIN: "Encargado de laboratorio",
} as const;

const CAMPOS_VACIOS = {
  email: "",
  name: "",
  password: "",
  role: "LAB_ADMIN" as "SUPER_ADMIN" | "LAB_ADMIN",
  roomId: "",
};

/*
 * Gestión de administradores. Solo para el SUPER_ADMIN: el middleware bloquea
 * la página y los handlers de /api/admin/users/** devuelven 403, que es la
 * defensa de verdad — ocultar la sección del nav es cortesía.
 *
 * No hay botón de eliminar a propósito: un administrador se DESACTIVA. Borrarlo
 * perdería el rastro de quién decidió sobre las solicitudes que ya resolvió, y
 * desactivarlo corta el acceso igual de rápido, porque getAdminSession() relee
 * la fila en cada petición y su sesión abierta deja de valer en el acto.
 */
export default function AdminUsuariosPage() {
  const router = useRouter();
  const sesion = useSesionAdmin();

  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [editando, setEditando] = useState<AdminUsuario | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // Secuenciales, NO Promise.all: connection_limit=1 (ver CLAUDE.md).
      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status === 403) {
        toast.error(
          "Solo el administrador general puede gestionar administradores.",
        );
        router.push("/admin");
        return;
      }
      if (!res.ok) {
        toast.error("No se pudieron cargar los administradores.");
        return;
      }
      setUsuarios(await res.json());

      const resSalas = await fetch("/api/rooms");
      if (resSalas.ok) setSalas(await resSalas.json());
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(evento: FormEvent) {
    evento.preventDefault();
    setCreando(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: campos.email,
          name: campos.name,
          password: campos.password,
          role: campos.role,
          // El servidor exige null explícito para el administrador general.
          roomId: campos.role === "SUPER_ADMIN" ? null : campos.roomId || null,
        }),
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(
          cuerpo?.error?.message ?? "No se pudo crear el administrador.",
        );
        return;
      }
      toast.success("Administrador creado.");
      setCampos(CAMPOS_VACIOS);
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCreando(false);
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/users/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editando.name,
          role: editando.role,
          roomId: editando.role === "SUPER_ADMIN" ? null : editando.roomId,
          isActive: editando.isActive,
          password: campos.password || undefined,
        }),
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(
          cuerpo?.error?.message ?? "No se pudieron guardar los cambios.",
        );
        return;
      }
      toast.success("Cambios guardados.");
      setEditando(null);
      setCampos(CAMPOS_VACIOS);
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 font-semibold text-texto">
          Usuarios
        </h1>
        <p className="text-body text-texto-secundario">
          Quién puede entrar al panel y qué laboratorio administra. Un
          administrador general ve todos los laboratorios; un encargado, solo el
          suyo.
        </p>
      </div>

      <Card>
        <CardHeader titulo="Crear administrador" />
        <CardBody>
          <form
            onSubmit={crear}
            className="grid gap-5 sm:grid-cols-2"
            noValidate
          >
            <Field label="Nombre">
              <Input
                value={campos.name}
                onChange={(e) => setCampos({ ...campos, name: e.target.value })}
                required
              />
            </Field>

            <Field label="Correo" ayuda="Con este correo inicia sesión.">
              <Input
                type="email"
                autoComplete="off"
                value={campos.email}
                onChange={(e) =>
                  setCampos({ ...campos, email: e.target.value })
                }
                required
              />
            </Field>

            <Field label="Rol">
              <Select
                value={campos.role}
                onChange={(e) =>
                  setCampos({
                    ...campos,
                    role: e.target.value as "SUPER_ADMIN" | "LAB_ADMIN",
                    roomId:
                      e.target.value === "SUPER_ADMIN" ? "" : campos.roomId,
                  })
                }
              >
                <option value="LAB_ADMIN">{ETIQUETA_ROL.LAB_ADMIN}</option>
                <option value="SUPER_ADMIN">{ETIQUETA_ROL.SUPER_ADMIN}</option>
              </Select>
            </Field>

            {/* El administrador general es transversal: asignarle uno mentiría. */}
            {campos.role === "LAB_ADMIN" && (
              <Field label="Laboratorio">
                <Select
                  value={campos.roomId}
                  onChange={(e) =>
                    setCampos({ ...campos, roomId: e.target.value })
                  }
                  required
                >
                  <option value="">Elige un laboratorio</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label="Contraseña"
              ayuda={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres.`}
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={campos.password}
                onChange={(e) =>
                  setCampos({ ...campos, password: e.target.value })
                }
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" cargando={creando}>
                Crear administrador
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {!cargando && usuarios.length === 0 && (
        <EmptyState
          titulo="No hay administradores"
          descripcion="Crea el primero con el formulario de arriba."
        />
      )}

      {usuarios.length > 0 && (
        <div className="flex flex-col gap-3">
          {usuarios.map((usuario) => (
            <Card key={usuario.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-body-l font-semibold text-texto">
                      {usuario.name}
                    </span>
                    {usuario.isActive ? (
                      <Badge tono="info">{ETIQUETA_ROL[usuario.role]}</Badge>
                    ) : (
                      <Badge tono="bloqueado">Desactivado</Badge>
                    )}
                    {usuario.id === sesion.userId && (
                      <Badge tono="neutral">Tú</Badge>
                    )}
                  </div>
                  <span className="text-caption text-texto-secundario">
                    {usuario.email} ·{" "}
                    {usuario.room?.name ?? "Todos los laboratorios"}
                  </span>
                  <span className="text-caption text-texto-secundario">
                    {usuario.lastLoginAt
                      ? `Último acceso: ${formatDateTime(new Date(usuario.lastLoginAt))}`
                      : "Todavía no ha entrado"}
                  </span>
                </div>

                <Button
                  type="button"
                  variante="secondary"
                  tamano="sm"
                  className="self-start"
                  onClick={() => {
                    setEditando(usuario);
                    setCampos(CAMPOS_VACIOS);
                  }}
                >
                  Editar
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setEditando(null);
            setCampos(CAMPOS_VACIOS);
          }
        }}
        title={editando ? `Editar a ${editando.name}` : "Editar"}
        description="El correo no se puede cambiar: es la identidad con la que se inicia sesión."
      >
        {editando && (
          <form onSubmit={guardar} className="flex flex-col gap-5" noValidate>
            <Field label="Nombre">
              <Input
                value={editando.name}
                onChange={(e) =>
                  setEditando({ ...editando, name: e.target.value })
                }
                required
              />
            </Field>

            <Field label="Rol">
              <Select
                value={editando.role}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    role: e.target.value as "SUPER_ADMIN" | "LAB_ADMIN",
                    roomId:
                      e.target.value === "SUPER_ADMIN" ? null : editando.roomId,
                  })
                }
              >
                <option value="LAB_ADMIN">{ETIQUETA_ROL.LAB_ADMIN}</option>
                <option value="SUPER_ADMIN">{ETIQUETA_ROL.SUPER_ADMIN}</option>
              </Select>
            </Field>

            {editando.role === "LAB_ADMIN" && (
              <Field label="Laboratorio">
                <Select
                  value={editando.roomId ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, roomId: e.target.value || null })
                  }
                  required
                >
                  <option value="">Elige un laboratorio</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label="Nueva contraseña"
              opcional
              ayuda={`Déjala vacía para no cambiarla. Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres.`}
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={campos.password}
                onChange={(e) =>
                  setCampos({ ...campos, password: e.target.value })
                }
              />
            </Field>

            {/*
              El servidor rechaza que alguien se desactive o se degrade a sí
              mismo: es lo que impide dejar la aplicación sin ningún
              administrador general. Aquí se explica en vez de ofrecerlo.
            */}
            {editando.id === sesion.userId ? (
              <p className="text-caption text-texto-secundario">
                Es tu propia cuenta: no puedes desactivarla ni quitarte el rol
                de administrador general. Pídeselo a otro administrador general.
              </p>
            ) : (
              <Field label="Estado">
                <Select
                  value={editando.isActive ? "activo" : "inactivo"}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      isActive: e.target.value === "activo",
                    })
                  }
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Desactivado</option>
                </Select>
              </Field>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" cargando={guardando}>
                Guardar cambios
              </Button>
              <Button
                type="button"
                variante="secondary"
                onClick={() => {
                  setEditando(null);
                  setCampos(CAMPOS_VACIOS);
                }}
              >
                Volver
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
