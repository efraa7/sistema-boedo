import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Calendar, Edit, Lock, Plus, Trash2, Unlock } from 'lucide-react';

export interface CicloLectivoItem {
    id: number;
    anio: number;
    fecha_inicio: string;
    fecha_fin: string;
    cerrado: boolean;
    observaciones: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedCiclos {
    data: CicloLectivoItem[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    ciclos: PaginatedCiclos;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ciclos Lectivos', href: '/ciclos-lectivos' },
];

export default function CiclosLectivosIndex({ ciclos }: Props) {
    const { can } = useAuth();
    const { flash } = usePage().props as any;

    const handleDelete = (ciclo: CicloLectivoItem) => {
        if (confirm(`¿Estás seguro de eliminar el ciclo lectivo ${ciclo.anio}?`)) {
            router.delete(`/ciclos-lectivos/${ciclo.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ciclos Lectivos" />
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gestión de Ciclos Lectivos</h1>
                        <p className="text-sm text-muted-foreground">
                            Apertura y cierre de años escolares. Los ciclos cerrados congelan las modificaciones históricas.
                        </p>
                    </div>
                    {can('crear ciclos') && (
                        <Link
                            href="/ciclos-lectivos/create"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" /> Nuevo Ciclo
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

                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Año Lectivo</th>
                                <th className="px-4 py-3">Período de Clases</th>
                                <th className="px-4 py-3 text-center">Estado (Cierre)</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {ciclos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay ciclos lectivos registrados.
                                    </td>
                                </tr>
                            ) : (
                                ciclos.data.map((ciclo) => (
                                    <tr key={ciclo.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-semibold text-lg flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-muted-foreground" />
                                            {ciclo.anio}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm">
                                                Inicio:{' '}
                                                {new Date(ciclo.fecha_inicio).toLocaleDateString('es-AR', {
                                                    timeZone: 'UTC',
                                                })}
                                            </div>
                                            <div className="text-sm">
                                                Cierre:{' '}
                                                {new Date(ciclo.fecha_fin).toLocaleDateString('es-AR', {
                                                    timeZone: 'UTC',
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {ciclo.cerrado ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400">
                                                    <Lock className="h-3.5 w-3.5" /> Cerrado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                                                    <Unlock className="h-3.5 w-3.5" /> Activo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {can('editar ciclos') && (
                                                    <Link
                                                        href={`/ciclos-lectivos/${ciclo.id}/edit`}
                                                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" /> Gestionar
                                                    </Link>
                                                )}
                                                {can('eliminar ciclos') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(ciclo)}
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

                    {ciclos.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                            <span className="text-xs text-muted-foreground">
                                Página {ciclos.current_page} de {ciclos.last_page} ({ciclos.total} ciclos lectivos en
                                total)
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {ciclos.links.map((link, key) =>
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