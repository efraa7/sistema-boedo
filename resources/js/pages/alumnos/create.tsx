import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CicloLectivo, type Grado } from '@/types/academico';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { GradoCombobox } from '@/components/grado-combobox';

interface Props {
    cicloActivo: CicloLectivo | null;
    grados: Grado[];
    legajoSugerido: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Padrón de Alumnos', href: '/alumnos' },
    { title: 'Inscribir Alumno', href: '/alumnos/create' },
];

export default function AlumnoCreate({ cicloActivo, grados, legajoSugerido }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        dni: '',
        legajo: legajoSugerido,
        apellido: '',
        nombre: '',
        fecha_nacimiento: '',
        domicilio: '',
        tutor_nombre: '',
        tutor_telefono: '',
        tutor_email: '',
        foto: null as File | null,
        recibe_copa_leche: true,
        estado: true,
        grado_id: '' as string | number,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/alumnos', {
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inscribir Nuevo Alumno" />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inscribir Nuevo Alumno</h1>
                    <p className="text-sm text-muted-foreground">
                        Completá el legajo personal, los datos del tutor responsable y asigná el grado a cursar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 rounded-lg border bg-card p-6 shadow-sm">
                    {/* Bloque 1: Datos Filiares del Estudiante */}
                    <div className="space-y-4">
                        <h2 className="border-b pb-2 text-base font-semibold">1. Datos Personales del Alumno</h2>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium">DNI (sin puntos)</label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={data.dni}
                                    onChange={(e) => setData('dni', e.target.value)}
                                    placeholder="Ej. 54123456"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.dni && <p className="mt-1 text-xs text-red-500">{errors.dni}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Código de Legajo</label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={data.legajo}
                                    onChange={(e) => setData('legajo', e.target.value.toUpperCase())}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
                                    required
                                />
                                {errors.legajo && <p className="mt-1 text-xs text-red-500">{errors.legajo}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    value={data.fecha_nacimiento}
                                    onChange={(e) => setData('fecha_nacimiento', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.fecha_nacimiento && (
                                    <p className="mt-1 text-xs text-red-500">{errors.fecha_nacimiento}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Apellidos</label>
                                <input
                                    type="text"
                                    maxLength={100}
                                    value={data.apellido}
                                    onChange={(e) => setData('apellido', e.target.value)}
                                    placeholder="Ej. Mamaní"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.apellido && <p className="mt-1 text-xs text-red-500">{errors.apellido}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Nombres</label>
                                <input
                                    type="text"
                                    maxLength={100}
                                    value={data.nombre}
                                    onChange={(e) => setData('nombre', e.target.value)}
                                    placeholder="Ej. Mateo Benjamín"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Domicilio Real</label>
                                <input
                                    type="text"
                                    maxLength={200}
                                    value={data.domicilio}
                                    onChange={(e) => setData('domicilio', e.target.value)}
                                    placeholder="Barrio, Calle y Número (La Merced)"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.domicilio && <p className="mt-1 text-xs text-red-500">{errors.domicilio}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Foto Carnet (Opcional)</label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => setData('foto', e.target.files ? e.target.files[0] : null)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                />
                                {errors.foto && <p className="mt-1 text-xs text-red-500">{errors.foto}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Bloque 2: Datos del Tutor */}
                    <div className="space-y-4">
                        <h2 className="border-b pb-2 text-base font-semibold">
                            2. Datos del Padre, Madre o Tutor Responsable
                        </h2>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Apellido y Nombre del Tutor</label>
                                <input
                                    type="text"
                                    maxLength={150}
                                    value={data.tutor_nombre}
                                    onChange={(e) => setData('tutor_nombre', e.target.value)}
                                    placeholder="Nombre completo"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.tutor_nombre && (
                                    <p className="mt-1 text-xs text-red-500">{errors.tutor_nombre}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    maxLength={50}
                                    value={data.tutor_telefono}
                                    onChange={(e) => setData('tutor_telefono', e.target.value)}
                                    placeholder="Ej. 3875112233"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.tutor_telefono && (
                                    <p className="mt-1 text-xs text-red-500">{errors.tutor_telefono}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Correo Electrónico (Opcional)</label>
                                <input
                                    type="email"
                                    maxLength={150}
                                    value={data.tutor_email}
                                    onChange={(e) => setData('tutor_email', e.target.value)}
                                    placeholder="tutor@ejemplo.com"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.tutor_email && (
                                    <p className="mt-1 text-xs text-red-500">{errors.tutor_email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bloque 3: Matrícula y Copa de Leche */}
                    <div className="space-y-4">
                        <h2 className="border-b pb-2 text-base font-semibold">
                            3. Matriculación Escolar {cicloActivo ? `(Ciclo ${cicloActivo.anio})` : ''} y Servicios
                        </h2>

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Asignar a Grado / Sección</label>
                                <GradoCombobox
                                    grados={grados}
                                    value={data.grado_id}
                                    onChange={(val) => setData('grado_id', val ? Number(val) : '')}
                                    emptyLabel="— Dejar sin matricular por ahora —"
                                />
                                {errors.grado_id && <p className="mt-1 text-xs text-red-500">{errors.grado_id}</p>}
                            </div>

                            <div className="flex flex-col justify-center gap-3 pt-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.recibe_copa_leche}
                                        onChange={(e) => setData('recibe_copa_leche', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span>
                                        <strong>Incluir en el operativo diario de Copa de Leche</strong>
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.estado}
                                        onChange={(e) => setData('estado', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span>Alumno en condición Regular Activo</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link
                            href="/alumnos"
                            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : 'Registrar y Matricular'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}