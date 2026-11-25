import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { type CicloLectivoItem } from './index';

interface Props {
    cicloLectivo: CicloLectivoItem;
}

export default function CicloLectivoEdit({ cicloLectivo }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Ciclos Lectivos', href: '/ciclos-lectivos' },
        { title: `Editar ${cicloLectivo.anio}`, href: `/ciclos-lectivos/${cicloLectivo.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm({
        anio: cicloLectivo.anio,
        fecha_inicio: cicloLectivo.fecha_inicio.split('T')[0], // Truncar si llega con datetime
        fecha_fin: cicloLectivo.fecha_fin.split('T')[0],
        observaciones: cicloLectivo.observaciones ?? '',
        cerrado: Boolean(cicloLectivo.cerrado),
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        put(`/ciclos-lectivos/${cicloLectivo.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Ciclo ${cicloLectivo.anio}`} />
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestionar Ciclo {cicloLectivo.anio}</h1>
                    <p className="text-sm text-muted-foreground">Si el año escolar terminó, marcá el estado como "Cerrado" para congelar las notas.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Año Lectivo</label>
                            <input type="number" value={data.anio} onChange={(e) => setData('anio', parseInt(e.target.value))} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.anio && <p className="mt-1 text-xs text-red-500">{errors.anio}</p>}
                        </div>
                        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
                            <label className="mb-1 block text-sm font-semibold text-red-800 dark:text-red-400">Cierre Administrativo</label>
                            <label className="flex items-center gap-2 text-sm mt-2">
                                <input type="checkbox" checked={data.cerrado} onChange={(e) => setData('cerrado', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                                <span>Bloquear edición (Año finalizado)</span>
                            </label>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Fecha de Inicio de Clases</label>
                            <input type="date" value={data.fecha_inicio} onChange={(e) => setData('fecha_inicio', e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.fecha_inicio && <p className="mt-1 text-xs text-red-500">{errors.fecha_inicio}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Fecha de Finalización</label>
                            <input type="date" value={data.fecha_fin} onChange={(e) => setData('fecha_fin', e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.fecha_fin && <p className="mt-1 text-xs text-red-500">{errors.fecha_fin}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Observaciones</label>
                        <input type="text" value={data.observaciones} onChange={(e) => setData('observaciones', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link href="/ciclos-lectivos" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</Link>
                        <button type="submit" disabled={processing} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}