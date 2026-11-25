import { GradoCombobox } from '@/components/grado-combobox';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle,
    CheckSquare,
    Download,
    Edit,
    Eye,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    Plus,
    Search,
    Square,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface LegajoInclusionItem {
    id: number;
    alumno_id: number;
    diagnostico: string;
    posee_cud: boolean;
    vencimiento_cud: string | null;
    docente_integrador: string | null;
    estado_semaforo_cud: 'vencido' | 'por_vencer' | 'al_dia' | 'sin_cud';
    archivo_url: string | null;
    grado_actual: {
        id: number;
        nombre_completo: string;
        docente_titular: string | null;
    } | null;
    alumno: {
        id: number;
        nombre: string;
        apellido: string;
        dni: string;
    };
    tiene_informe_inicial?: boolean;
    tiene_ppi?: boolean;
    periodos_cargados?: string[];
}

interface PaginatedLegajos {
    data: LegajoInclusionItem[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface GradoOption {
    id: number;
    ciclo_lectivo_id: number;
    numero: number;
    division: string;
    turno: 'Mañana' | 'Tarde';
    nombre_completo: string;
    inclusion_count: number;
}

interface CicloOption {
    id: number;
    anio: number;
    cerrado: boolean;
}

interface Props {
    legajos: PaginatedLegajos;
    grados: GradoOption[];
    ciclos: CicloOption[];
    cicloSeleccionado: CicloOption | null;
    esDocentePedagogico?: boolean;
    esDocenteAula?: boolean;
    puedeAdministrarLegajos?: boolean;
    puedeExportarExcel?: boolean;
    filtros: {
        ciclo_id: string;
        grado_id: string;
        buscar: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Inclusión Escolar', href: '/inclusion' },
];

export default function InclusionIndex({
    legajos,
    grados,
    ciclos,
    cicloSeleccionado,
    esDocentePedagogico = false,
    esDocenteAula = false,
    puedeAdministrarLegajos = false,
    puedeExportarExcel = false,
    filtros,
}: Props) {
    const { flash } = usePage().props as any;

    const [cicloId, setCicloId] = useState(filtros.ciclo_id || '');
    const [gradoId, setGradoId] = useState(filtros.grado_id || '');
    const [buscar, setBuscar] = useState(filtros.buscar || '');

    // Modal personalizado de eliminación
    const [legajoAEliminar, setLegajoAEliminar] = useState<LegajoInclusionItem | null>(null);
    const [eliminando, setEliminando] = useState(false);

    // Modal de exportación Excel
    const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
    const [filtroModal, setFiltroModal] = useState('');
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    const [incluirSinGrado, setIncluirSinGrado] = useState(true);

    const gradosCombobox = useMemo(
        () =>
            grados.map((g) => ({
                ...g,
                badge: g.inclusion_count,
            })),
        [grados]
    );

    const aplicarFiltros = (nuevoCicloId: string, nuevoGradoId: string, nuevoBuscar: string) => {
        const params: Record<string, string> = {};
        if (nuevoCicloId) params.ciclo_id = nuevoCicloId;
        if (nuevoGradoId) params.grado_id = nuevoGradoId;
        if (nuevoBuscar.trim()) params.buscar = nuevoBuscar.trim();

        router.get('/inclusion', params, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        aplicarFiltros(cicloId, gradoId, buscar);
    };

    const handleCicloChange = (nuevoCicloId: string) => {
        setCicloId(nuevoCicloId);
        setGradoId('');
        aplicarFiltros(nuevoCicloId, '', buscar);
    };

    const handleGradoChange = (nuevoGradoId: string) => {
        setGradoId(nuevoGradoId);
        aplicarFiltros(cicloId, nuevoGradoId, buscar);
    };

    const limpiarFiltros = () => {
        setGradoId('');
        setBuscar('');
        aplicarFiltros(cicloId, '', '');
    };

    const confirmarEliminacion = () => {
        if (!legajoAEliminar) return;
        setEliminando(true);

        router.delete(`/inclusion/${legajoAEliminar.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setEliminando(false);
                setLegajoAEliminar(null);
            },
        });
    };

    const gradosFiltradosModal = useMemo(() => {
        const q = filtroModal
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/grados?/g, '')
            .replace(/[°º\-_\/\.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!q) return grados;

        const ordinales: Record<string, string> = {
            primero: '1', primer: '1', '1ro': '1', '1er': '1',
            segundo: '2', '2do': '2',
            tercero: '3', tercer: '3', '3ro': '3', '3er': '3',
            cuarto: '4', '4to': '4',
            quinto: '5', '5to': '5',
            sexto: '6', '6to': '6',
            septimo: '7', '7mo': '7',
        };

        let normalizado = q;
        for (const [palabra, num] of Object.entries(ordinales)) {
            normalizado = normalizado.replace(new RegExp(`\\b${palabra}\\b`, 'g'), num);
        }

        return grados.filter((g) => {
            const turnoNorm = g.turno.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const etiquetaCompacta = `${g.numero}${g.division.toLowerCase()}`;
            const etiquetaEspaciada = `${g.numero} ${g.division.toLowerCase()} ${turnoNorm}`;

            return (
                etiquetaCompacta.includes(normalizado.replace(/\s+/g, '')) ||
                etiquetaEspaciada.includes(normalizado) ||
                g.nombre_completo.toLowerCase().includes(q)
            );
        });
    }, [grados, filtroModal]);

    const abrirModalExportar = () => {
        setFiltroModal('');
        setSeleccionados(grados.map((g) => g.id));
        setIncluirSinGrado(!esDocentePedagogico);
        setModalExportarAbierto(true);
    };

    const toggleGradoSeleccionado = (id: number) => {
        setSeleccionados((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const seleccionarTodos = () => {
        const idsVisibles = gradosFiltradosModal.map((g) => g.id);
        setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])));
        if (!esDocentePedagogico) {
            setIncluirSinGrado(true);
        }
    };

    const deseleccionarTodos = () => {
        setSeleccionados([]);
        setIncluirSinGrado(false);
    };

    const seleccionarPorNumero = (numero: number) => {
        const ids = grados.filter((g) => g.numero === numero).map((g) => g.id);
        setSeleccionados(ids);
        setIncluirSinGrado(false);
    };

    const seleccionarPorTurno = (turno: 'Mañana' | 'Tarde') => {
        const ids = grados.filter((g) => g.turno === turno).map((g) => g.id);
        setSeleccionados(ids);
        setIncluirSinGrado(false);
    };

    const descargarExcelInclusion = () => {
        if (seleccionados.length === 0 && !incluirSinGrado) return;

        const params = new URLSearchParams();
        if (cicloId) params.append('ciclo_id', cicloId);
        seleccionados.forEach((id) => params.append('grados[]', String(id)));
        if (incluirSinGrado) params.append('sin_grado', '1');

        window.location.href = `/inclusion/exportar-excel?${params.toString()}`;
        setModalExportarAbierto(false);
    };

    const numerosExistentes = useMemo(
        () => Array.from(new Set(grados.map((g) => g.numero))).sort((a, b) => a - b),
        [grados]
    );

    const renderSemaforo = (estado: string) => {
        switch (estado) {
            case 'vencido':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> CUD Vencido
                    </span>
                );
            case 'por_vencer':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Por Vencer
                    </span>
                );
            case 'al_dia':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" /> Vigente
                    </span>
                );
            default:
                return <span className="text-xs text-muted-foreground">Sin CUD</span>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inclusión Escolar" />
            <div className="flex flex-col gap-6 p-6">
                {/* Cabecera */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gabinete e Inclusión Escolar</h1>
                        <p className="text-sm text-muted-foreground">
                            {esDocentePedagogico
                                ? 'Seguimiento de los estudiantes asignados a tu cargo, adaptaciones PPI y alertas de CUD.'
                                : esDocenteAula
                                  ? 'Listado informativo de estudiantes de tu grado con acompañamiento de Inclusión Escolar.'
                                  : 'Control de legajos PPI, seguimiento por grado, docentes de apoyo y alertas de CUD.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {puedeExportarExcel && (
                            <button
                                type="button"
                                onClick={abrirModalExportar}
                                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                Exportar Excel
                            </button>
                        )}

                        {puedeAdministrarLegajos && (
                            <Link
                                href="/inclusion/create"
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4" /> Nuevo Legajo
                            </Link>
                        )}
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

                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1 max-w-sm">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                            placeholder="Buscar alumno, DNI, diagnóstico o MAI..."
                            className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm"
                        />
                        {buscar && (
                            <button
                                type="button"
                                onClick={() => {
                                    setBuscar('');
                                    aplicarFiltros(cicloId, gradoId, '');
                                }}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <select
                        value={cicloId}
                        onChange={(e) => handleCicloChange(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        title="Seleccionar ciclo lectivo"
                    >
                        {ciclos.map((c) => (
                            <option key={c.id} value={c.id}>
                                Ciclo {c.anio} {c.cerrado ? '(Cerrado)' : '(Activo)'}
                            </option>
                        ))}
                    </select>

                    <GradoCombobox
                        grados={gradosCombobox}
                        value={gradoId}
                        onChange={handleGradoChange}
                        emptyLabel="Todos los grados"
                        className="min-w-[250px]"
                    />

                    <button
                        type="submit"
                        className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                        Filtrar
                    </button>

                    {(filtros.buscar || filtros.grado_id) && (
                        <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="text-xs text-muted-foreground hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </form>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Alumno</th>
                                <th className="px-4 py-3">Grado y Docente de Aula</th>
                                <th className="px-4 py-3">Diagnóstico / Integrador</th>
                                <th className="px-4 py-3 text-center">Estado CUD</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {legajos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        {esDocentePedagogico
                                            ? 'No tenés alumnos asignados a tu seguimiento con los filtros seleccionados.'
                                            : esDocenteAula
                                              ? 'No hay alumnos con seguimiento de inclusión registrados en tu grado.'
                                              : 'No hay legajos de inclusión registrados con los filtros seleccionados.'}
                                    </td>
                                </tr>
                            ) : (
                                legajos.data.map((legajo) => (
                                    <tr key={legajo.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold">
                                                {legajo.alumno.apellido}, {legajo.alumno.nombre}
                                            </div>
                                            <div className="font-mono text-xs text-muted-foreground">
                                                DNI: {legajo.alumno.dni}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            {legajo.grado_actual ? (
                                                <div>
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                                                        <GraduationCap className="h-3.5 w-3.5" />
                                                        {legajo.grado_actual.nombre_completo}
                                                    </span>
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        Doc. Aula:{' '}
                                                        <span className="font-medium text-foreground">
                                                            {legajo.grado_actual.docente_titular || 'Sin asignar'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground">
                                                    Sin matricular en {cicloSeleccionado?.anio ?? 'este ciclo'}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="font-medium text-primary">{legajo.diagnostico}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Doc. Integrador:{' '}
                                                <span className="font-medium">
                                                    {legajo.docente_integrador || 'No asignado'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                            {renderSemaforo(legajo.estado_semaforo_cud)}
                                            {!esDocenteAula && legajo.archivo_url && (
                                                <div className="mt-1">
                                                    <a
                                                        href={legajo.archivo_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                                                    >
                                                        <FileText className="h-3 w-3" /> Ver Documento
                                                    </a>
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            {esDocenteAula ? (
                                                <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                                    Solo consulta de aula
                                                </span>
                                            ) : (
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Link
                                                        href={`/inclusion/${legajo.id}${cicloId ? `?ciclo_id=${cicloId}` : ''}`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> Expediente / Informes
                                                    </Link>

                                                    {puedeAdministrarLegajos && (
                                                        <>
                                                            <Link
                                                                href={`/inclusion/${legajo.id}/edit`}
                                                                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                            >
                                                                <Edit className="h-3.5 w-3.5" /> Datos / CUD
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => setLegajoAEliminar(legajo)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                                                title="Eliminar legajo"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {legajos.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                            <span className="text-xs text-muted-foreground">
                                Página {legajos.current_page} de {legajos.last_page} ({legajos.total} legajos en total)
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {legajos.links.map((link, key) =>
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

            {/* Modal de Confirmación de Eliminación */}
            {legajoAEliminar && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all"
                    onClick={() => !eliminando && setLegajoAEliminar(null)}
                >
                    <div
                        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold tracking-tight">
                                    Eliminar legajo de inclusión
                                </h3>
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                    ¿Estás seguro de eliminar el expediente PPI de{' '}
                                    <span className="font-semibold text-foreground">
                                        {legajoAEliminar.alumno.apellido}, {legajoAEliminar.alumno.nombre}
                                    </span>{' '}
                                    (DNI: {legajoAEliminar.alumno.dni})?
                                </p>
                                <p className="mt-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                                    Esta acción eliminará su diagnóstico, observaciones PPI y archivo CUD adjunto. El
                                    legajo general del alumno en el padrón no se verá afectado.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2.5 border-t pt-4">
                            <button
                                type="button"
                                disabled={eliminando}
                                onClick={() => setLegajoAEliminar(null)}
                                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={eliminando}
                                onClick={confirmarEliminacion}
                                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar legajo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Exportación Excel */}
            {modalExportarAbierto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setModalExportarAbierto(false)}
                >
                    <div
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-card p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Exportar Nómina de Inclusión{' '}
                                        {cicloSeleccionado ? `(Ciclo ${cicloSeleccionado.anio})` : ''}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {esDocentePedagogico
                                            ? 'Se exportarán únicamente los alumnos bajo tu cargo agrupados por grado.'
                                            : 'Se generará una única hoja de Excel agrupando y ordenando los alumnos por grado.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalExportarAbierto(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 overflow-hidden">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={filtroModal}
                                    onChange={(e) => setFiltroModal(e.target.value)}
                                    placeholder="Filtrar grados (ej: 4 c, 4c, cuarto, mañana, tarde)..."
                                    className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm focus:border-primary focus:outline-none"
                                    autoFocus
                                />
                                {filtroModal && (
                                    <button
                                        type="button"
                                        onClick={() => setFiltroModal('')}
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="mr-1 text-xs font-medium text-muted-foreground">
                                    Selección rápida:
                                </span>
                                <button
                                    type="button"
                                    onClick={seleccionarTodos}
                                    className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                >
                                    {esDocentePedagogico ? 'Todos mis grados' : 'Todos los grados'}
                                </button>
                                <button
                                    type="button"
                                    onClick={deseleccionarTodos}
                                    className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                                >
                                    Ninguno
                                </button>
                                <button
                                    type="button"
                                    onClick={() => seleccionarPorTurno('Mañana')}
                                    className="rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                                >
                                    Turno Mañana
                                </button>
                                <button
                                    type="button"
                                    onClick={() => seleccionarPorTurno('Tarde')}
                                    className="rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                                >
                                    Turno Tarde
                                </button>
                                {numerosExistentes.map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => seleccionarPorNumero(num)}
                                        className="rounded-md border bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
                                    >
                                        Todo {num}°
                                    </button>
                                ))}
                            </div>

                            <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                                {gradosFiltradosModal.map((g) => {
                                    const marcado = seleccionados.includes(g.id);
                                    return (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => toggleGradoSeleccionado(g.id)}
                                            className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition ${
                                                marcado ? 'bg-primary/5' : 'hover:bg-muted/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {marcado ? (
                                                    <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                                                ) : (
                                                    <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                )}
                                                <span className="font-medium">{g.nombre_completo}</span>
                                            </div>
                                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                                                {g.inclusion_count}{' '}
                                                {g.inclusion_count === 1 ? 'alumno PPI' : 'alumnos PPI'}
                                            </span>
                                        </button>
                                    );
                                })}

                                {!esDocentePedagogico && (
                                    <button
                                        type="button"
                                        onClick={() => setIncluirSinGrado((prev) => !prev)}
                                        className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition ${
                                            incluirSinGrado ? 'bg-primary/5' : 'hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {incluirSinGrado ? (
                                                <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                                            ) : (
                                                <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            )}
                                            <span className="italic text-muted-foreground">
                                                Alumnos sin grado asignado en el ciclo
                                            </span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                            <span className="text-xs text-muted-foreground">
                                <strong>{seleccionados.length}</strong>{' '}
                                {seleccionados.length === 1 ? 'sección seleccionada' : 'secciones seleccionadas'}
                            </span>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalExportarAbierto(false)}
                                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={seleccionados.length === 0 && !incluirSinGrado}
                                    onClick={descargarExcelInclusion}
                                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}