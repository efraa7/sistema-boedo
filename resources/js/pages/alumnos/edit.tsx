import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Alumno, type CicloLectivo, type Grado } from '@/types/academico';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { GradoCombobox } from '@/components/grado-combobox';


interface Props {
    alumno: Alumno;
    cicloActivo: CicloLectivo | null;
    grados: Grado[];
    gradoActualId: number | string;
}

export default function AlumnoEdit({ alumno, cicloActivo, grados, gradoActualId }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Padrón de Alumnos', href: '/alumnos' },
        { title: `Editar ${alumno.legajo}`, href: `/alumnos/${alumno.id}/edit` },
    ];

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        dni: alumno.dni,
        legajo: alumno.legajo,
        apellido: alumno.apellido,
        nombre: alumno.nombre,
        fecha_nacimiento: alumno.fecha_nacimiento,
        domicilio: alumno.domicilio ?? '',
        tutor_nombre: alumno.tutor_nombre,
        tutor_telefono: alumno.tutor_telefono,
        tutor_email: alumno.tutor_email ?? '',
        foto: null as File | null,
        recibe_copa_leche: Boolean(alumno.recibe_copa_leche),
        estado: Boolean(alumno.estado),
        grado_id: gradoActualId,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(`/alumnos/${alumno.id}`, {
            forceFormData: true,
        });
    };

    const historialCerrado = (alumno.matriculas ?? []).filter(
        (m) => m.ciclo_lectivo_id !== cicloActivo?.id
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${alumno.nombre_completo}`} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Editar Legajo de {alumno.nombre_completo}</h1>
                    <p className="text-sm text-muted-foreground">
                        Actualizá los datos personales, contacto familiar o asignación de grado en el ciclo activo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="space-y-4">
                        <h2 className="border-b pb-2 text-base font-semibold">1. Datos Personales del Alumno</h2>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium">DNI</label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={data.dni}
                                    onChange={(e) => setData('dni', e.target.value)}
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
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.domicilio && <p className="mt-1 text-xs text-red-500">{errors.domicilio}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Reemplazar Foto Carnet</label>
                                <div className="flex items-center gap-3">
                                    {alumno.foto_url && (
                                        <img
                                            src={alumno.foto_url}
                                            alt={alumno.nombre_completo}
                                            className="h-10 w-10 rounded-full object-cover border"
                                        />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => setData('foto', e.target.files ? e.target.files[0] : null)}
                                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                    />
                                </div>
                                {errors.foto && <p className="mt-1 text-xs text-red-500">{errors.foto}</p>}
                            </div>
                        </div>
                    </div>
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
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                                {errors.tutor_telefono && (
                                    <p className="mt-1 text-xs text-red-500">{errors.tutor_telefono}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Correo Electrónico</label>
                                <input
                                    type="email"
                                    maxLength={150}
                                    value={data.tutor_email}
                                    onChange={(e) => setData('tutor_email', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.tutor_email && (
                                    <p className="mt-1 text-xs text-red-500">{errors.tutor_email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="border-b pb-2 text-base font-semibold">
                            3. Matrícula Escolar {cicloActivo ? `(Ciclo Activo ${cicloActivo.anio})` : ''} y Servicios
                        </h2>

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Grado Asignado {cicloActivo ? `(${cicloActivo.anio})` : ''}
                                </label>
                                <GradoCombobox
                                    grados={grados}
                                    value={data.grado_id}
                                    disabled={!cicloActivo}
                                    onChange={(val) => setData('grado_id', val ? Number(val) : '')}
                                    emptyLabel="— Sin asignar en ciclo activo —"
                                />
                                {errors.grado_id && <p className="mt-1 text-xs text-red-500">{errors.grado_id}</p>}
                                {errors.grado_id && <p className="mt-1 text-xs text-red-500">{errors.grado_id}</p>}

                                {historialCerrado.length > 0 && (
                                    <div className="mt-3 rounded-md border bg-muted/40 p-2.5 text-xs">
                                        <p className="mb-1 font-semibold text-muted-foreground">
                                            Historial de ciclos anteriores (solo lectura):
                                        </p>
                                        <ul className="space-y-1">
                                            {historialCerrado.map((mat) => (
                                                <li key={mat.id} className="flex justify-between">
                                                    <span>
                                                        <strong>{mat.ciclo_lectivo?.anio}:</strong>{' '}
                                                        {mat.grado?.nombre_completo}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {mat.dictamen_3er_trimestre}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
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
                                        <strong>Recibe ración diaria de Copa de Leche</strong>
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
                            {processing ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}