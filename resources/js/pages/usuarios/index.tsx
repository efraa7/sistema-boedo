import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Edit, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface UsuarioItem {
    id: number;
    dni: string | null;
    apellido: string | null;
    name: string;
    email: string;
    telefono: string | null;
    foto: string | null;
    foto_url: string | null;
    estado: boolean;
    roles?: { id: number; name: string }[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedUsuarios {
    data: UsuarioItem[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    usuarios: PaginatedUsuarios;
    roles: string[];
    filtros: {
        buscar: string;
        rol: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Personal Escolar', href: '/usuarios' },
];

export default function UsuariosIndex({ usuarios, roles, filtros }: Props) {
    const { can } = useAuth();
    const { flash } = usePage().props as any;

    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [rol, setRol] = useState(filtros.rol || '');

    const aplicarFiltros = (e: FormEvent) => {
        e.preventDefault();
        router.get('/usuarios', { buscar, rol }, { preserveState: true, replace: true });
    };

    const handleDelete = (usuario: UsuarioItem) => {
        if (confirm(`¿Eliminar acceso del sistema a ${usuario.name} ${usuario.apellido}?`)) {
            router.delete(`/usuarios/${usuario.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personal Escolar" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gestión de Personal Escolar</h1>
                        <p className="text-sm text-muted-foreground">
                            Administrá directivos, docentes y administrativos, y gestioná sus accesos al sistema.
                        </p>
                    </div>

                    {can('crear usuarios') && (
                        <Link
                            href="/usuarios/create"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo Usuario
                        </Link>
                    )}
                </div>

                {flash?.success && (
                    <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
                        {flash.error}
                    </div>
                )}

                <form onSubmit={aplicarFiltros} className="flex max-w-2xl gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                            placeholder="Buscar por nombre, apellido..."
                            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm"
                        />
                    </div>
                    <select
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
                    >
                        <option value="">Todos los Roles</option>
                        {roles.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="rounded-md border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
                    >
                        Filtrar
                    </button>
                </form>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Agente</th>
                                <th className="px-4 py-3">Contacto</th>
                                <th className="px-4 py-3">Rol de Acceso</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {usuarios.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            ) : (
                                usuarios.data.map((usuario) => (
                                    <tr key={usuario.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {usuario.foto_url ? (
                                                    <img
                                                        src={usuario.foto_url}
                                                        alt={usuario.name}
                                                        className="h-9 w-9 rounded-full object-cover border"
                                                    />
                                                ) : (
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        {usuario.name.charAt(0)}
                                                        {usuario.apellido?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold">
                                                        {usuario.apellido}, {usuario.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        DNI: {usuario.dni || 'S/D'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-primary">{usuario.email}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Tel: {usuario.telefono || '—'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {usuario.roles && usuario.roles.length > 0 ? (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    {usuario.roles[0].name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Sin rol asignado</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {usuario.estado ? (
                                                <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                                                    Suspendido
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {can('editar usuarios') && (
                                                    <Link
                                                        href={`/usuarios/${usuario.id}/edit`}
                                                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" /> Editar
                                                    </Link>
                                                )}
                                                {can('eliminar usuarios') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(usuario)}
                                                        className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {usuarios.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                            <span className="text-xs text-muted-foreground">
                                Página {usuarios.current_page} de {usuarios.last_page} ({usuarios.total} usuarios en
                                total)
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {usuarios.links.map((link, key) =>
                                    link.url ? (
                                        <Link
                                            key={key}
                                            href={link.url}
                                            preserveState
                                            replace
                                            className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                                                link.active
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'bg-background hover:bg-muted'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={key}
                                            className="rounded-md border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}