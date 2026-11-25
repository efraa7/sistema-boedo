import { GradoCombobox } from '@/components/grado-combobox';
import { useAuth } from '@/hooks/use-auth';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Alumno, type CicloLectivo, type Grado } from '@/types/academico';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpDown,
    Coffee,
    Download,
    Edit,
    Eye,
    FileSpreadsheet,
    Lock,
    Plus,
    Search,
    Trash2,
    Upload,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

interface CicloOption {
    id: number;
    anio: number;
    cerrado: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedAlumnos {
    data: Alumno[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    alumnos: PaginatedAlumnos;
    estadisticas: {
        total: number;
        activos: number;
        copa_leche: number;
    };
    grados: Grado[];
    ciclos: CicloOption[];
    cicloActivo: CicloLectivo | null;
    cicloSeleccionado: CicloOption | null;
    filtros: {
        ciclo_id: string;
        buscar: string;
        grado_id: string;
        sin_matricula: boolean;
        orden: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Padrón de Alumnos', href: '/alumnos' },
];

export default function AlumnosIndex({
    alumnos,
    estadisticas,
    grados,
    ciclos,
    cicloActivo,
    cicloSeleccionado,
    filtros,
}: Props) {
    const { can } = useAuth();
    const { flash } = usePage().props as any;

    const [cicloId, setCicloId] = useState(filtros.ciclo_id || '');
    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [gradoId, setGradoId] = useState(filtros.grado_id || '');
    const [sinMatricula, setSinMatricula] = useState(Boolean(filtros.sin_matricula));
    const [orden, setOrden] = useState(filtros.orden || 'apellido_asc');
    const [modalExcelAbierto, setModalExcelAbierto] = useState(false);

    const {
        data: excelData,
        setData: setExcelData,
        post: postExcel,
        processing: subiendoExcel,
        errors: excelErrors,
        reset: resetExcel,
    } = useForm({
        archivo: null as File | null,
    });

    const navegarConFiltros = (
        nuevoCicloId: string,
        nuevoBuscar: string,
        nuevoGradoId: string,
        nuevoSinMatricula: boolean,
        nuevoOrden: string
    ) => {
        const params: Record<string, string> = {};
        if (nuevoSinMatricula) {
            params.sin_matricula = '1';
        } else {
            if (nuevoCicloId) params.ciclo_id = nuevoCicloId;
            if (nuevoGradoId) params.grado_id = nuevoGradoId;
        }
        if (nuevoBuscar.trim()) params.buscar = nuevoBuscar.trim();
        if (nuevoOrden && nuevoOrden !== 'apellido_asc') params.orden = nuevoOrden;

        router.get('/alumnos', params, { preserveState: true, replace: true });
    };

    const aplicarFiltros = (e: FormEvent) => {
        e.preventDefault();
        navegarConFiltros(cicloId, buscar, gradoId, sinMatricula, orden);
    };

    const handleCicloChange = (nuevoCicloId: string) => {
        setCicloId(nuevoCicloId);
        setGradoId('');
        setSinMatricula(false);
        navegarConFiltros(nuevoCicloId, buscar, '', false, orden);
    };

    const handleGradoChange = (nuevoGradoId: string) => {
        setGradoId(nuevoGradoId);
        navegarConFiltros(cicloId, buscar, nuevoGradoId, sinMatricula, orden);
    };

    const handleOrdenChange = (nuevoOrden: string) => {
        setOrden(nuevoOrden);
        navegarConFiltros(cicloId, buscar, gradoId, sinMatricula, nuevoOrden);
    };

    const handleToggleSinMatricula = () => {
        const nuevoEstado = !sinMatricula;
        setSinMatricula(nuevoEstado);
        setGradoId('');
        navegarConFiltros(cicloId, buscar, '', nuevoEstado, orden);
    };

    const limpiarFiltros = () => {
        const defaultCiclo = cicloActivo ? String(cicloActivo.id) : '';
        setCicloId(defaultCiclo);
        setBuscar('');
        setGradoId('');
        setSinMatricula(false);
        setOrden('apellido_asc');
        router.get('/alumnos');
    };

    const handleDelete = (alumno: Alumno) => {
        if (confirm(`¿Estás seguro de eliminar del padrón a "${alumno.nombre_completo}"?`)) {
            router.delete(`/alumnos/${alumno.id}`);
        }
    };

    const handleImportarExcel = (e: FormEvent) => {
        e.preventDefault();
        postExcel('/alumnos/importar-excel', {
            forceFormData: true,
            onSuccess: () => {
                resetExcel();
                setModalExcelAbierto(false);
            },
        });
    };

    const handleExportarNomina = () => {
        const params = new URLSearchParams();
        if (sinMatricula) {
            params.set('sin_matricula', '1');
        } else {
            if (cicloId) params.set('ciclo_id', cicloId);
            if (gradoId) params.set('grado_id', gradoId);
        }
        if (buscar.trim()) params.set('buscar', buscar.trim());
        if (orden && orden !== 'apellido_asc') params.set('orden', orden);

        const query = params.toString();
        window.location.href = query ? `/alumnos/exportar-excel?${query}` : '/alumnos/exportar-excel';
    };

    const viendoCicloCerrado = Boolean(!sinMatricula && cicloSeleccionado?.cerrado);
    const hayFiltrosActivos = Boolean(filtros.buscar || filtros.grado_id || filtros.sin_matricula);
    const etiquetaAlcance = hayFiltrosActivos
        ? 'Según filtros aplicados'
        : cicloSeleccionado
          ? `Ciclo Lectivo ${cicloSeleccionado.anio}`
          : 'Total listado';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Padrón de Alumnos y Matrículas" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Padrón de Alumnos y Matrículas</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestión de legajos estudiantiles, datos de tutores e inscripción anual{' '}
                            {cicloSeleccionado && !sinMatricula
                                ? `(Ciclo Lectivo ${cicloSeleccionado.anio})`
                                : cicloActivo
                                  ? `(Ciclo Activo ${cicloActivo.anio})`
                                  : ''}
                            .
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {alumnos.total > 0 && (
                            <button
                                type="button"
                                onClick={handleExportarNomina}
                                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted"
                            >
                                <Download className="h-4 w-4 text-emerald-600" />
                                Descargar Nómina
                            </button>
                        )}

                        {can('crear alumnos') && (
                            <>
                                {cicloActivo && (
                                    <button
                                        type="button"
                                        onClick={() => setModalExcelAbierto(true)}
                                        className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        Importar Nómina Ministerial
                                    </button>
                                )}

                                <Link
                                    href="/alumnos/create"
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    Inscribir Alumno
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Tarjetas de resumen reactivas al filtro */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
                        <div className="rounded-full bg-primary/10 p-3 text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Alumnos Listados</p>
                            <p className="text-2xl font-bold">{estadisticas.total}</p>
                            <p className="text-[11px] text-muted-foreground">{etiquetaAlcance}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
                        <div className="rounded-full bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Alumnos Regulares Activos</p>
                            <p className="text-2xl font-bold">{estadisticas.activos}</p>
                            <p className="text-[11px] text-muted-foreground">{etiquetaAlcance}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
                        <div className="rounded-full bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                            <Coffee className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Reciben Copa de Leche</p>
                            <p className="text-2xl font-bold">{estadisticas.copa_leche}</p>
                            <p className="text-[11px] text-muted-foreground">{etiquetaAlcance}</p>
                        </div>
                    </div>
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

                {viendoCicloCerrado && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>
                            Estás consultando la nómina histórica del{' '}
                            <strong>Ciclo Lectivo {cicloSeleccionado?.anio} (Cerrado)</strong>.
                        </span>
                    </div>
                )}

                {/* Barra de Filtros y Ordenamiento */}
                <form onSubmit={aplicarFiltros} className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[230px] flex-1 max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                            placeholder="Buscar por DNI, legajo, apellido..."
                            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm"
                        />
                    </div>

                    <select
                        value={sinMatricula ? '' : cicloId}
                        disabled={sinMatricula}
                        onChange={(e) => handleCicloChange(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        title="Seleccionar ciclo lectivo"
                    >
                        {ciclos.map((c) => (
                            <option key={c.id} value={c.id}>
                                Ciclo {c.anio} {c.cerrado ? '(Cerrado)' : '(Activo)'}
                            </option>
                        ))}
                    </select>

                    {!sinMatricula && (
                        <GradoCombobox
                            grados={grados}
                            value={gradoId}
                            onChange={handleGradoChange}
                            emptyLabel="Todos los grados"
                            className="min-w-[250px]"
                        />
                    )}

                    {/* Selector de Ordenamiento */}
                    <div className="flex items-center gap-1.5">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={orden}
                            onChange={(e) => handleOrdenChange(e.target.value)}
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            title="Ordenar listado"
                        >
                            <option value="apellido_asc">Apellido (A → Z)</option>
                            <option value="apellido_desc">Apellido (Z → A)</option>
                            <option value="grado_asc">Grado (1.° → 7.°)</option>
                            <option value="grado_desc">Grado (7.° → 1.°)</option>
                            <option value="turno_manana">Turno (Mañana primero)</option>
                            <option value="turno_tarde">Turno (Tarde primero)</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                        Filtrar
                    </button>

                    {cicloActivo && (
                        <button
                            type="button"
                            onClick={handleToggleSinMatricula}
                            className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                                sinMatricula
                                    ? 'border-amber-600 bg-amber-600 text-white'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Sin matricular en {cicloActivo.anio}
                        </button>
                    )}

                    {(hayFiltrosActivos || orden !== 'apellido_asc') && (
                        <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="text-xs text-muted-foreground hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </form>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Alumno</th>
                                <th className="px-4 py-3">DNI / Legajo</th>
                                <th className="px-4 py-3">
                                    {sinMatricula
                                        ? 'Última Matrícula'
                                        : `Grado (${cicloSeleccionado?.anio ?? 'Actual'})`}
                                </th>
                                <th className="px-4 py-3">Tutor Responsable</th>
                                <th className="px-4 py-3 text-center">Copa de Leche</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {alumnos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No se encontraron alumnos con los criterios seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                alumnos.data.map((alumno) => {
                                    const matriculaEnCiclo = alumno.matriculas?.[0];
                                    const tutorPendiente =
                                        !alumno.tutor_nombre ||
                                        alumno.tutor_nombre.toLowerCase() === 'a completar';

                                    return (
                                        <tr key={alumno.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {alumno.foto_url ? (
                                                        <img
                                                            src={alumno.foto_url}
                                                            alt={alumno.nombre_completo}
                                                            className="h-9 w-9 rounded-full object-cover border"
                                                        />
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                            {alumno.apellido.charAt(0)}
                                                            {alumno.nombre.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{alumno.nombre_completo}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Nac: {alumno.fecha_nacimiento}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-xs font-semibold">DNI: {alumno.dni}</div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {alumno.legajo}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {sinMatricula ? (
                                                    alumno.matricula_actual?.grado ? (
                                                        <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                            {alumno.matricula_actual.grado.nombre_completo} (
                                                            {alumno.matricula_actual.ciclo_lectivo?.anio})
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs italic text-muted-foreground">
                                                            Nunca matriculado
                                                        </span>
                                                    )
                                                ) : matriculaEnCiclo?.grado ? (
                                                    <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                                        {matriculaEnCiclo.grado.nombre_completo}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs italic text-muted-foreground">
                                                        Sin matricular
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {tutorPendiente ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                        <AlertCircle className="h-3.5 w-3.5" />
                                                        Completar datos del tutor
                                                    </span>
                                                ) : (
                                                    <>
                                                        <div className="font-medium">{alumno.tutor_nombre}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Tel: {alumno.tutor_telefono}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {alumno.recibe_copa_leche ? (
                                                    <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                                                        Sí
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                                                        No
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {alumno.estado ? (
                                                    <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                                        Regular
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-gray-500/15 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        Inactivo / Pase
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {can('ver alumnos') && (
                                                        <Link
                                                            href={`/alumnos/${alumno.id}`}
                                                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium hover:bg-muted"
                                                            title="Ver ficha y trayectoria completa"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    )}
                                                    {can('editar alumnos') && (
                                                        <Link
                                                            href={`/alumnos/${alumno.id}/edit`}
                                                            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                            Editar
                                                        </Link>
                                                    )}
                                                    {can('eliminar alumnos') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(alumno)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                                            title="Eliminar alumno"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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

                    {alumnos.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                            <span className="text-xs text-muted-foreground">
                                Página {alumnos.current_page} de {alumnos.last_page} ({alumnos.total} alumnos en total)
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {alumnos.links.map((link, key) =>
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

            {modalExcelAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                <h2 className="text-lg font-bold">
                                    Importar Nómina por Grado {cicloActivo ? `(Ciclo ${cicloActivo.anio})` : ''}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalExcelAbierto(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-sm">
                            <div className="rounded-md border bg-muted/40 p-3.5 space-y-1.5 text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground">
                                    ¿Cómo funciona la importación directa?
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>
                                        Subí directamente el archivo <strong>Reporte_Alumnos_Seccion_*.xls</strong> o{' '}
                                        <strong>.xlsx</strong> descargado del sistema del gobierno (sin modificarlo).
                                    </li>
                                    <li>
                                        El sistema detecta automáticamente el <strong>grado, sección y turno</strong> de
                                        la cabecera y crea el curso en <strong>{cicloActivo?.anio}</strong> si aún no
                                        existe.
                                    </li>
                                    <li>
                                        Los alumnos ya registrados conservan su historial, legajo y datos de tutor; los
                                        ingresos nuevos quedan marcados para completar los datos del tutor luego.
                                    </li>
                                </ul>
                            </div>

                            <form onSubmit={handleImportarExcel} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block font-medium">
                                        Seleccioná el reporte descargado (.xls o .xlsx)
                                    </label>
                                    <input
                                        type="file"
                                        accept=".xls,.xlsx"
                                        onChange={(e) =>
                                            setExcelData('archivo', e.target.files ? e.target.files[0] : null)
                                        }
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        required
                                    />
                                    {excelErrors.archivo && (
                                        <p className="mt-1 text-xs text-red-500">{excelErrors.archivo}</p>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setModalExcelAbierto(false)}
                                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={subiendoExcel || !excelData.archivo}
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Upload className="h-4 w-4" />
                                        {subiendoExcel ? 'Procesando nómina...' : 'Importar Grado al Ciclo Activo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}