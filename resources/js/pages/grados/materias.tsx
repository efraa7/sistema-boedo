import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Materia } from '@/types/academico';
import { Head, Link, useForm } from '@inertiajs/react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { FormEvent } from 'react';

interface GradoMateriasInfo {
    id: number;
    nombre_completo: string;
    numero: number;
    division: string;
    turno: string;
    aula: string;
    ciclo_anio: number | null;
    docente_titular: string | null;
    materias_ids: number[];
}

interface Props {
    grado: GradoMateriasInfo;
    materias: Materia[];
}

export default function GradoMateriasEdit({ grado, materias }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Grados y Secciones', href: '/grados' },
        { title: `Materias: ${grado.numero}.° ${grado.division}`, href: `/grados/${grado.id}/materias` },
    ];

    const { data, setData, put, processing, errors } = useForm({
        materias: grado.materias_ids,
    });

    const toggleMateria = (id: number) => {
        if (data.materias.includes(id)) {
            setData('materias', data.materias.filter((item) => item !== id));
        } else {
            setData('materias', [...data.materias, id]);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        put(`/grados/${grado.id}/materias`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Materias - ${grado.nombre_completo}`} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Materias Curriculares del Grado</h1>
                    <p className="text-sm text-muted-foreground">
                        Seleccioná las asignaturas que se dictan en este curso para el Cuaderno Auxiliar y las Libretas.
                    </p>
                </div>

                {/* Resumen fijo de la cabecera del grado */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-semibold">{grado.nombre_completo}</div>
                            <div className="text-xs text-muted-foreground">
                                Ciclo {grado.ciclo_anio ?? '—'} · Docente Titular:{' '}
                                <span className="font-medium text-foreground">
                                    {grado.docente_titular || 'Sin asignar'}
                                </span>
                                {grado.aula ? ` · Aula: ${grado.aula}` : ''}
                            </div>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                        <BookOpen className="h-3.5 w-3.5" />
                        {data.materias.length} seleccionadas
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Listado de Áreas / Asignaturas Activas</h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setData('materias', materias.map((m) => m.id))}
                                className="text-xs font-medium text-primary hover:underline"
                            >
                                Marcar todas
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                                type="button"
                                onClick={() => setData('materias', [])}
                                className="text-xs font-medium text-muted-foreground hover:underline"
                            >
                                Desmarcar todas
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        {materias.map((materia) => (
                            <label
                                key={materia.id}
                                className="flex cursor-pointer items-center justify-between rounded-md border p-2.5 text-sm hover:bg-muted/40"
                            >
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={data.materias.includes(materia.id)}
                                        onChange={() => toggleMateria(materia.id)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span>
                                        <strong>{materia.codigo}</strong> - {materia.nombre}
                                    </span>
                                </div>
                                {materia.es_especial && (
                                    <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300">
                                        Especial
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>

                    {errors.materias && <p className="mt-1 text-xs text-red-500">{errors.materias}</p>}

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link
                            href="/grados"
                            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : 'Guardar Materias'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}