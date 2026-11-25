import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CicloLectivo, type DocenteResumen } from '@/types/academico';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Search, ShieldCheck, UserCheck, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface GradoEditData {
    id: number;
    ciclo_lectivo_id: number;
    docente_titular_id: number | null;
    numero: number;
    division: string;
    turno: 'Mañana' | 'Tarde';
    aula: string;
    estado: boolean;
}

interface Props {
    grado: GradoEditData;
    ciclosLectivos: CicloLectivo[];
    docentes: DocenteResumen[];
}

export default function GradoEdit({ grado, ciclosLectivos, docentes }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Grados y Secciones', href: '/grados' },
        { title: `Editar ${grado.numero}.° ${grado.division}`, href: `/grados/${grado.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm({
        ciclo_lectivo_id: grado.ciclo_lectivo_id,
        docente_titular_id: grado.docente_titular_id ?? ('' as string | number),
        numero: grado.numero,
        division: grado.division,
        turno: grado.turno,
        aula: grado.aula,
        estado: Boolean(grado.estado),
    });

    const [busquedaDocente, setBusquedaDocente] = useState('');

    const docentesFiltrados = useMemo(() => {
        const q = busquedaDocente
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        if (!q) return docentes;

        return docentes.filter((doc) => {
            const texto = `${doc.apellido} ${doc.name} ${doc.dni}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            return texto.includes(q);
        });
    }, [docentes, busquedaDocente]);

    const docenteSeleccionado = useMemo(
        () => docentes.find((doc) => String(doc.id) === String(data.docente_titular_id)) ?? null,
        [docentes, data.docente_titular_id]
    );

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        put(`/grados/${grado.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${grado.numero}.° Grado ${grado.division}`} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Editar Datos del Grado: {grado.numero}.° "{grado.division}" ({grado.turno})
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Modificá la estructura del curso, el aula o el docente titular a cargo.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Exclusivo Super Admin y Director
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Ciclo Lectivo</label>
                            <select
                                value={data.ciclo_lectivo_id}
                                onChange={(e) => setData('ciclo_lectivo_id', Number(e.target.value))}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                {ciclosLectivos.map((ciclo) => (
                                    <option key={ciclo.id} value={ciclo.id}>
                                        Ciclo Lectivo {ciclo.anio}
                                    </option>
                                ))}
                            </select>
                            {errors.ciclo_lectivo_id && (
                                <p className="mt-1 text-xs text-red-500">{errors.ciclo_lectivo_id}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Ubicación / Aula</label>
                            <input
                                type="text"
                                maxLength={50}
                                value={data.aula}
                                onChange={(e) => setData('aula', e.target.value)}
                                placeholder="Ej. Aula 4"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                            {errors.aula && <p className="mt-1 text-xs text-red-500">{errors.aula}</p>}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Grado (1.° a 7.°)</label>
                            <select
                                value={data.numero}
                                onChange={(e) => setData('numero', Number(e.target.value))}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                    <option key={n} value={n}>
                                        {n}.° Grado
                                    </option>
                                ))}
                            </select>
                            {errors.numero && <p className="mt-1 text-xs text-red-500">{errors.numero}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">División</label>
                            <input
                                type="text"
                                maxLength={10}
                                value={data.division}
                                onChange={(e) => setData('division', e.target.value.toUpperCase())}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                                required
                            />
                            {errors.division && <p className="mt-1 text-xs text-red-500">{errors.division}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Turno</label>
                            <select
                                value={data.turno}
                                onChange={(e) => setData('turno', e.target.value as 'Mañana' | 'Tarde')}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="Mañana">Mañana</option>
                                <option value="Tarde">Tarde</option>
                            </select>
                            {errors.turno && <p className="mt-1 text-xs text-red-500">{errors.turno}</p>}
                        </div>
                    </div>

                    {/* Selector Buscable de Docente Titular */}
                    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium">Docente Titular a Cargo (Opcional)</label>
                            <span className="text-xs text-muted-foreground">
                                {docentesFiltrados.length}{' '}
                                {docentesFiltrados.length === 1 ? 'docente disponible' : 'docentes disponibles'}
                            </span>
                        </div>

                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={busquedaDocente}
                                onChange={(e) => setBusquedaDocente(e.target.value)}
                                placeholder="Buscar docente por apellido, nombre o DNI..."
                                className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm"
                            />
                            {busquedaDocente && (
                                <button
                                    type="button"
                                    onClick={() => setBusquedaDocente('')}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {docenteSeleccionado && (
                            <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3.5 py-2.5 text-sm">
                                <div className="flex items-center gap-2.5">
                                    <UserCheck className="h-4 w-4 text-primary" />
                                    <div>
                                        <span className="font-semibold">
                                            {docenteSeleccionado.apellido}, {docenteSeleccionado.name}
                                        </span>{' '}
                                        <span className="font-mono text-xs text-muted-foreground">
                                            (DNI: {docenteSeleccionado.dni})
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setData('docente_titular_id', '')}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                    Quitar
                                </button>
                            </div>
                        )}

                        <div className="max-h-44 divide-y overflow-y-auto rounded-md border bg-background">
                            {docentesFiltrados.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                    No se encontraron docentes con ese nombre o DNI.
                                </div>
                            ) : (
                                docentesFiltrados.map((doc) => {
                                    const seleccionado = String(data.docente_titular_id) === String(doc.id);
                                    return (
                                        <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => setData('docente_titular_id', doc.id)}
                                            className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition ${
                                                seleccionado ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <div>
                                                <span className="font-medium">
                                                    {doc.apellido}, {doc.name}
                                                </span>
                                                <span className="ml-2 font-mono text-xs text-muted-foreground">
                                                    DNI: {doc.dni}
                                                </span>
                                            </div>
                                            {seleccionado && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {errors.docente_titular_id && (
                            <p className="mt-1 text-xs text-red-500">{errors.docente_titular_id}</p>
                        )}
                    </div>

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
                            {processing ? 'Actualizando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}