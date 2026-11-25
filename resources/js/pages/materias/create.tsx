import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Materias', href: '/materias' },
    { title: 'Nueva Materia', href: '/materias/create' },
];

export default function MateriaCreate() {
    const { data, setData, post, processing, errors } = useForm({
        codigo: '',
        nombre: '',
        es_especial: false,
        estado: true,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/materias');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Materia" />

            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Registrar Nueva Materia</h1>
                    <p className="text-sm text-muted-foreground">
                        Ingresá el código identificatorio y la denominación oficial del área curricular.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Código (Ej. MAT)</label>
                            <input
                                type="text"
                                maxLength={10}
                                value={data.codigo}
                                onChange={(e) => setData('codigo', e.target.value.toUpperCase())}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                                placeholder="MAT"
                                required
                            />
                            {errors.codigo && <p className="mt-1 text-xs text-red-500">{errors.codigo}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium">Nombre de la Materia</label>
                            <input
                                type="text"
                                maxLength={150}
                                value={data.nombre}
                                onChange={(e) => setData('nombre', e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Matemática"
                                required
                            />
                            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={data.es_especial}
                                onChange={(e) => setData('es_especial', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <span>
                                <strong>Es Área Especial</strong> (Educación Física, Artística, Inglés, Tecnología)
                            </span>
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={data.estado}
                                onChange={(e) => setData('estado', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <span>Materia activa en el plan de estudios actual</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link
                            href="/materias"
                            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : 'Guardar Materia'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}