import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ciclos Lectivos', href: '/ciclos-lectivos' },
    { title: 'Nuevo Ciclo', href: '/ciclos-lectivos/create' },
];

export default function CicloLectivoCreate() {
    const { data, setData, post, processing, errors } = useForm({
        anio: new Date().getFullYear(),
        fecha_inicio: '',
        fecha_fin: '',
        observaciones: '',
        cerrado: false,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/ciclos-lectivos');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Ciclo Lectivo" />
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Aperturar Año Escolar</h1>
                    <p className="text-sm text-muted-foreground">Configurá las fechas formales del calendario escolar.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Año Lectivo</label>
                            <input type="number" value={data.anio} onChange={(e) => setData('anio', parseInt(e.target.value))} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.anio && <p className="mt-1 text-xs text-red-500">{errors.anio}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Estado Inicial</label>
                            <div className="flex h-10 items-center">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.cerrado} onChange={(e) => setData('cerrado', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                                    <span>Marcar como cerrado/histórico</span>
                                </label>
                            </div>
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
                        <label className="mb-1 block text-sm font-medium">Observaciones / Resolución (Opcional)</label>
                        <input type="text" value={data.observaciones} onChange={(e) => setData('observaciones', e.target.value)} placeholder="Ej: Calendario Oficial Res. N° 1234/26" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link href="/ciclos-lectivos" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</Link>
                        <button type="submit" disabled={processing} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                            Aperturar Ciclo
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}