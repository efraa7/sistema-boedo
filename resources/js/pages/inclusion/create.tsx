import { GradoCombobox } from '@/components/grado-combobox';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, GraduationCap, Mail, Search, UserCheck, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface AlumnoMin {
    id: number;
    apellido: string;
    nombre: string;
    dni: string;
    grado_id: number | null;
    grado_nombre: string;
}

interface GradoMin {
    id: number;
    numero: number;
    division: string;
    turno: string;
    nombre_completo: string;
}

export interface DocentePedagogicoMin {
    id: number;
    apellido: string;
    name: string;
    dni: string;
    email: string;
}

interface Props {
    alumnos: AlumnoMin[];
    grados: GradoMin[];
    cicloActivo: { id: number; anio: number } | null;
    docentesPedagogicos: DocentePedagogicoMin[];
    permiteSinGrado?: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Inclusión', href: '/inclusion' },
    { title: 'Nuevo Legajo', href: '/inclusion/create' },
];

export default function InclusionCreate({
    alumnos,
    grados,
    cicloActivo,
    docentesPedagogicos,
    permiteSinGrado = true,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        alumno_id: '',
        diagnostico: '',
        posee_cud: false,
        vencimiento_cud: '',
        archivo_cud: null as File | null,
        docente_integrador_id: '',
        enviar_correo: true,
        observaciones_ppi: '',
    });

    const [filtroGrado, setFiltroGrado] = useState<string>('');
    const [soloSinGrado, setSoloSinGrado] = useState<boolean>(false);
    const [busquedaAlumno, setBusquedaAlumno] = useState<string>('');
    const [busquedaDocente, setBusquedaDocente] = useState<string>('');

    const alumnosFiltrados = useMemo(() => {
        const q = busquedaAlumno
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        return alumnos.filter((al) => {
            if (soloSinGrado && al.grado_id !== null) {
                return false;
            }
            if (!soloSinGrado && filtroGrado && String(al.grado_id) !== filtroGrado) {
                return false;
            }

            if (!q) return true;

            const nombreCompleto = `${al.apellido} ${al.nombre} ${al.dni}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            return nombreCompleto.includes(q);
        });
    }, [alumnos, filtroGrado, soloSinGrado, busquedaAlumno]);

    const alumnoSeleccionado = useMemo(
        () => alumnos.find((al) => String(al.id) === String(data.alumno_id)) ?? null,
        [alumnos, data.alumno_id]
    );

    const docentesFiltrados = useMemo(() => {
        const q = busquedaDocente
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        if (!q) return docentesPedagogicos;

        return docentesPedagogicos.filter((doc) => {
            const texto = `${doc.apellido} ${doc.name} ${doc.dni} ${doc.email}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            return texto.includes(q);
        });
    }, [docentesPedagogicos, busquedaDocente]);

    const docenteSeleccionado = useMemo(
        () =>
            docentesPedagogicos.find((doc) => String(doc.id) === String(data.docente_integrador_id)) ??
            null,
        [docentesPedagogicos, data.docente_integrador_id]
    );

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/inclusion', { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Legajo de Inclusión" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Crear Legajo de Inclusión / PPI</h1>
                    <p className="text-sm text-muted-foreground">
                        Generá el expediente para seguimiento de adaptaciones curriculares{' '}
                        {cicloActivo ? `(Ciclo Lectivo ${cicloActivo.anio})` : ''}.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    {/* Selector de Alumno */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium">
                                Alumno a vincular <span className="text-red-500">*</span>
                            </label>
                            <span className="text-xs text-muted-foreground">
                                {alumnosFiltrados.length}{' '}
                                {alumnosFiltrados.length === 1 ? 'alumno disponible' : 'alumnos disponibles'}
                            </span>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                            <GradoCombobox
                                grados={grados}
                                value={soloSinGrado ? '' : filtroGrado}
                                disabled={soloSinGrado}
                                onChange={(val) => setFiltroGrado(val)}
                                emptyLabel="Todos los grados"
                            />

                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={busquedaAlumno}
                                    onChange={(e) => setBusquedaAlumno(e.target.value)}
                                    placeholder="Escribí apellido, nombre o DNI..."
                                    className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm"
                                />
                                {busquedaAlumno && (
                                    <button
                                        type="button"
                                        onClick={() => setBusquedaAlumno('')}
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {permiteSinGrado && (
                            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={soloSinGrado}
                                    onChange={(e) => {
                                        setSoloSinGrado(e.target.checked);
                                        if (e.target.checked) setFiltroGrado('');
                                    }}
                                    className="h-3.5 w-3.5 rounded border-gray-300"
                                />
                                Mostrar solo alumnos sin grado asignado en el ciclo activo
                            </label>
                        )}

                        {alumnoSeleccionado && (
                            <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3.5 py-2.5 text-sm">
                                <div className="flex items-center gap-2.5">
                                    <UserCheck className="h-4 w-4 text-primary" />
                                    <div>
                                        <span className="font-semibold">
                                            {alumnoSeleccionado.apellido}, {alumnoSeleccionado.nombre}
                                        </span>{' '}
                                        <span className="font-mono text-xs text-muted-foreground">
                                            (DNI: {alumnoSeleccionado.dni})
                                        </span>
                                        <div className="text-xs text-muted-foreground">
                                            Curso: {alumnoSeleccionado.grado_nombre}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setData('alumno_id', '')}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                    Cambiar
                                </button>
                            </div>
                        )}

                        <div className="max-h-52 divide-y overflow-y-auto rounded-md border bg-background">
                            {alumnosFiltrados.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    No se encontraron alumnos sin legajo con ese filtro.
                                </div>
                            ) : (
                                alumnosFiltrados.map((al) => {
                                    const seleccionado = String(data.alumno_id) === String(al.id);
                                    return (
                                        <button
                                            key={al.id}
                                            type="button"
                                            onClick={() => setData('alumno_id', String(al.id))}
                                            className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition ${
                                                seleccionado ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {al.apellido}, {al.nombre}
                                                </div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    DNI: {al.dni}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    <GraduationCap className="h-3 w-3" />
                                                    {al.grado_nombre}
                                                </span>
                                                {seleccionado && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {errors.alumno_id && <p className="mt-1 text-xs text-red-500">{errors.alumno_id}</p>}
                    </div>

                    {/* Diagnóstico */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Diagnóstico Principal <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.diagnostico}
                            onChange={(e) => setData('diagnostico', e.target.value)}
                            required
                            placeholder="Ej. TEA, TDAH, Dislexia..."
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        {errors.diagnostico && <p className="mt-1 text-xs text-red-500">{errors.diagnostico}</p>}
                    </div>

                    {/* Selector Buscable de Docente Pedagógico / Integrador */}
                    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium">
                                Docente Pedagógico / Integrador (Opcional)
                            </label>
                            <span className="text-xs text-muted-foreground">
                                {docentesFiltrados.length}{' '}
                                {docentesFiltrados.length === 1 ? 'docente registrado' : 'docentes registrados'}
                            </span>
                        </div>

                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={busquedaDocente}
                                onChange={(e) => setBusquedaDocente(e.target.value)}
                                placeholder="Buscar docente pedagógico por apellido, nombre, DNI o correo..."
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
                            <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-sm">
                                <div className="flex items-center gap-2.5">
                                    <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <span className="font-semibold">
                                            {docenteSeleccionado.apellido}, {docenteSeleccionado.name}
                                        </span>{' '}
                                        <span className="font-mono text-xs text-muted-foreground">
                                            (DNI: {docenteSeleccionado.dni})
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                                            <Mail className="h-3 w-3" />
                                            {docenteSeleccionado.email}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setData('docente_integrador_id', '')}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                    Quitar
                                </button>
                            </div>
                        )}

                        <div className="max-h-40 divide-y overflow-y-auto rounded-md border bg-background">
                            {docentesFiltrados.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                    No se encontraron usuarios con rol Docente Pedagógico.
                                </div>
                            ) : (
                                docentesFiltrados.map((doc) => {
                                    const seleccionado = String(data.docente_integrador_id) === String(doc.id);
                                    return (
                                        <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => setData('docente_integrador_id', String(doc.id))}
                                            className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition ${
                                                seleccionado ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {doc.apellido}, {doc.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    DNI: {doc.dni} · {doc.email}
                                                </div>
                                            </div>
                                            {seleccionado && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {errors.docente_integrador_id && (
                            <p className="mt-1 text-xs text-red-500">{errors.docente_integrador_id}</p>
                        )}

                        {docenteSeleccionado && (
                            <label className="flex items-center gap-2 pt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <input
                                    type="checkbox"
                                    checked={data.enviar_correo}
                                    onChange={(e) => setData('enviar_correo', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Mail className="h-3.5 w-3.5" />
                                Enviar notificación automática a <strong>{docenteSeleccionado.email}</strong> con los
                                datos del alumno y el CUD adjunto
                            </label>
                        )}
                    </div>

                    {/* Sección CUD */}
                    <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4">
                        <label className="flex items-center gap-2 text-sm font-semibold">
                            <input
                                type="checkbox"
                                checked={data.posee_cud}
                                onChange={(e) => setData('posee_cud', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            El alumno posee Certificado Único de Discapacidad (CUD)
                        </label>

                        {data.posee_cud && (
                            <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Fecha de Vencimiento CUD</label>
                                    <input
                                        type="date"
                                        value={data.vencimiento_cud}
                                        onChange={(e) => setData('vencimiento_cud', e.target.value)}
                                        required
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    {errors.vencimiento_cud && (
                                        <p className="mt-1 text-xs text-red-500">{errors.vencimiento_cud}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Subir Documento (PDF/Img)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) =>
                                            setData('archivo_cud', e.target.files ? e.target.files[0] : null)
                                        }
                                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                    />
                                    {errors.archivo_cud && (
                                        <p className="mt-1 text-xs text-red-500">{errors.archivo_cud}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Observaciones PPI */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Observaciones / Proyecto Pedagógico Individual (PPI)
                        </label>
                        <textarea
                            value={data.observaciones_ppi}
                            onChange={(e) => setData('observaciones_ppi', e.target.value)}
                            rows={4}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Detalles de adaptaciones, profesionales intervinientes, etc."
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link href="/inclusion" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing || !data.alumno_id}
                            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : 'Crear Legajo'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}