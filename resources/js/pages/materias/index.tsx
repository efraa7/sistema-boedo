import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { type BreadcrumbItem } from '@/types';
import { type Materia } from '@/types/academico';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedMaterias {
    data: Materia[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface CicloOption {
    id: number;
    anio: number;
    cerrado: boolean;
}

interface Props {
    materias: PaginatedMaterias;
    ciclos: CicloOption[];
    filtros: {
        buscar: string;
        ciclo_id: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Materias', href: '/materias' },
];

export default function MateriasIndex({ materias, ciclos, filtros }: Props) {
    const { can } = useAuth();
    const { flash } = usePage().props as any;
    const [buscar, setBuscar] = useState(filtros.buscar || '');

    const aplicarFiltros = (nuevoBuscar: string, nuevoCicloId: string) => {
        router.get(
            '/materias',
            {
                buscar: nuevoBuscar,
                ciclo_id: nuevoCicloId,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        aplicarFiltros(buscar, filtros.ciclo_id);
    };

    const handleCicloChange = (nuevoCicloId: string) => {
        aplicarFiltros(buscar, nuevoCicloId);
    };

    const handleDelete = (materia: Materia) => {
        if (confirm(`¿Estás seguro de eliminar la materia "${materia.nombre}"?`)) {
            router.delete(`/materias/${materia.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catálogo de Materias" />

            <div className="flex flex-col gap-6 p-6">
                {/* Cabecera */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Materias</h1>
                        <p className="text-sm text-muted-foreground">
                            Áreas curriculares de grado y especialidades de la Escuela Dr. Mariano Boedo.
                        </p>
                    </div>

                    {can('crear materias') && (
                        <Link
                            href="/materias/create"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva Materia
                        </Link>
                    )}
                </div>

                {/* Mensajes Flash */}
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

                {/* Buscador y Selector de Ciclo */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={buscar}
                                onChange={(e) => setBuscar(e.target.value)}
                                placeholder="Buscar por código o nombre..."
                                className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-md border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                        >
                            Filtrar
                        </button>
                    </form>

                    <div className="flex items-center gap-2">
                        <label htmlFor="filtro-ciclo-materias" className="text-sm font-medium text-muted-foreground">
                            Ciclo:
                        </label>
                        <select
                            id="filtro-ciclo-materias"
                            value={filtros.ciclo_id}
                            onChange={(e) => handleCicloChange(e.target.value)}
                            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-none"
                        >
                            {ciclos.map((ciclo) => (
                                <option key={ciclo.id} value={ciclo.id}>
                                    {ciclo.anio} {ciclo.cerrado ? '(Cerrado)' : '(Actual)'}
                                </option>
                            ))}
                            <option value="todos">Todos los ciclos</option>
                        </select>
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Nombre del Área / Materia</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3 text-center">Grados Asignados</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {materias.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No se encontraron materias registradas.
                                    </td>
                                </tr>
                            ) : (
                                materias.data.map((materia) => {
                                    const esInactivaEnCiclo = !materia.estado && filtros.ciclo_id !== 'todos';

                                    return (
                                        <tr key={materia.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono font-semibold">{materia.codigo}</td>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                    {materia.nombre}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {materia.es_especial ? (
                                                    <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                                                        Área Especial
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                                                        Área Curricular
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {esInactivaEnCiclo ? (
                                                    <span
                                                        className="text-muted-foreground"
                                                        title="Materia inactiva: no participa de la cursada actual"
                                                    >
                                                        0
                                                    </span>
                                                ) : (
                                                    (materia.grados_count ?? 0)
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {materia.estado ? (
                                                    <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                                        Activa
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-gray-500/15 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        Inactiva
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {can('editar materias') && (
                                                        <Link
                                                            href={`/materias/${materia.id}/edit`}
                                                            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                            Editar
                                                        </Link>
                                                    )}
                                                    {can('eliminar materias') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(materia)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {materias.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                            <span className="text-xs text-muted-foreground">
                                Página {materias.current_page} de {materias.last_page} ({materias.total} materias en
                                total)
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {materias.links.map((link, key) =>
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