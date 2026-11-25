import { GradoCombobox } from '@/components/grado-combobox';
import { useAuth } from '@/hooks/use-auth';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowUpDown,
    CheckCircle2,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Eye,
    FileEdit,
    FileSpreadsheet,
    Plus,
    RotateCcw,
    Search,
    Send,
    Square,
    X,
} from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';

interface Cuaderno {
    id: number;
    periodo: string;
    estado: 'borrador' | 'enviado_vicedireccion' | 'visado_observado' | 'aprobado';
    docente: { name: string; apellido: string };
    grado: { nombre_completo: string };
    ciclo_lectivo: { anio: number };
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedCuadernos {
    data: Cuaderno[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
}

interface Props {
    cuadernos: PaginatedCuadernos;
    cuadernosDisponibles: Cuaderno[];
    ciclos: Array<{ id: number; anio: number; cerrado: boolean }>;
    cicloActivo: { id: number; anio: number } | null;
    gradosFiltro: Array<{ id: number; numero: number; division: string; turno: string; nombre_completo: string }>;
    gradosCrear: Array<{ id: number; numero: number; division: string; turno: string; nombre_completo: string }>;
    filtros: {
        ciclo_id: string;
        periodo: string;
        grado_id: string;
        buscar?: string;
        orden?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuadernos Auxiliares', href: '/cuadernos' },
];

const PERIODO_LABELS: Record<string, string> = {
    '1_trimestre': '1° Trimestre',
    '2_trimestre': '2° Trimestre',
    '3_trimestre': '3° Trimestre',
    informe_final: 'Informe Anual',
};

const PERIODOS_OPCIONES = [
    { value: '', label: 'Todos los períodos' },
    { value: '1_trimestre', label: '1° Trimestre' },
    { value: '2_trimestre', label: '2° Trimestre' },
    { value: '3_trimestre', label: '3° Trimestre' },
    { value: 'informe_final', label: 'Informe Anual' },
];

export default function CuadernosIndex({
    cuadernos,
    cuadernosDisponibles,
    ciclos,
    cicloActivo,
    gradosCrear,
    filtros,
}: Props) {
    const { can, hasRole } = useAuth();
    const [showModal, setShowModal] = useState(false);

    // Estado para modal de exportación múltiple a Excel
    const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
    const [filtroModal, setFiltroModal] = useState('');
    const [periodoModal, setPeriodoModal] = useState('');
    const [seleccionados, setSeleccionados] = useState<number[]>([]);

    // Estados de filtros de la tabla
    const [cicloFiltro, setCicloFiltro] = useState(filtros.ciclo_id ?? '');
    const [periodoFiltro, setPeriodoFiltro] = useState(filtros.periodo ?? '');
    const [buscarFiltro, setBuscarFiltro] = useState(filtros.buscar ?? '');
    const [ordenFiltro, setOrdenFiltro] = useState(filtros.orden ?? 'grado_asc');

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        ciclo_lectivo_id: cicloActivo ? String(cicloActivo.id) : '',
        grado_id: gradosCrear.length === 1 ? String(gradosCrear[0].id) : '',
        periodo: '1_trimestre',
    });

    const navegarConFiltros = (
        nuevoCiclo = cicloFiltro,
        nuevoPeriodo = periodoFiltro,
        nuevoBuscar = buscarFiltro,
        nuevoOrden = ordenFiltro
    ) => {
        const params: Record<string, string> = {};

        if (nuevoCiclo) params.ciclo_id = nuevoCiclo;
        if (nuevoPeriodo) params.periodo = nuevoPeriodo;
        if (nuevoBuscar.trim()) params.buscar = nuevoBuscar.trim();
        if (nuevoOrden && nuevoOrden !== 'grado_asc') params.orden = nuevoOrden;

        router.get('/cuadernos', params, { preserveState: true, replace: true });
    };

    const handleBuscarInputChange = (valor: string) => {
        setBuscarFiltro(valor);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            navegarConFiltros(cicloFiltro, periodoFiltro, valor, ordenFiltro);
        }, 300);
    };

    const handleBuscarSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        navegarConFiltros(cicloFiltro, periodoFiltro, buscarFiltro, ordenFiltro);
    };

    const limpiarFiltros = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        const defaultCiclo = cicloActivo ? String(cicloActivo.id) : '';
        setCicloFiltro(defaultCiclo);
        setPeriodoFiltro('');
        setBuscarFiltro('');
        setOrdenFiltro('grado_asc');

        router.get('/cuadernos', {}, { preserveState: true, replace: true });
    };

    const handleCreate = (e: FormEvent) => {
        e.preventDefault();
        post('/cuadernos', {
            onSuccess: () => {
                setShowModal(false);
                reset();
            },
        });
    };

    const cuadernosFiltradosModal = useMemo(() => {
        const q = filtroModal
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        return cuadernosDisponibles.filter((c) => {
            if (periodoModal && c.periodo !== periodoModal) {
                return false;
            }
            if (!q) return true;

            const gradoNorm = c.grado.nombre_completo
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const docenteNorm = `${c.docente.apellido} ${c.docente.name}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const periodoNorm = (PERIODO_LABELS[c.periodo] ?? c.periodo)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            return (
                gradoNorm.includes(q) ||
                docenteNorm.includes(q) ||
                periodoNorm.includes(q)
            );
        });
    }, [cuadernosDisponibles, filtroModal, periodoModal]);

    const abrirModalExportar = () => {
        setFiltroModal('');
        setPeriodoModal(periodoFiltro || '');
        const iniciales = (periodoFiltro
            ? cuadernosDisponibles.filter((c) => c.periodo === periodoFiltro)
            : cuadernosDisponibles
        ).map((c) => c.id);
        setSeleccionados(iniciales);
        setModalExportarAbierto(true);
    };

    const handlePeriodoModalChange = (nuevoPeriodo: string) => {
        setPeriodoModal(nuevoPeriodo);
        const idsPeriodo = (nuevoPeriodo
            ? cuadernosDisponibles.filter((c) => c.periodo === nuevoPeriodo)
            : cuadernosDisponibles
        ).map((c) => c.id);
        setSeleccionados(idsPeriodo);
    };

    const toggleCuadernoSeleccionado = (id: number) => {
        setSeleccionados((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const seleccionarTodosFiltrados = () => {
        const idsVisibles = cuadernosFiltradosModal.map((c) => c.id);
        setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])));
    };

    const deseleccionarTodos = () => {
        setSeleccionados([]);
    };

    const descargarSeleccionados = () => {
        if (seleccionados.length === 0) return;

        const params = new URLSearchParams();
        seleccionados.forEach((id) => params.append('cuadernos[]', String(id)));
        if (periodoModal) {
            params.set('periodo', periodoModal);
        }

        window.location.href = `/cuadernos/exportar-excel?${params.toString()}`;
        setModalExportarAbierto(false);
    };

    const subtituloAlcanceModal = useMemo(() => {
        if (hasRole('super-admin')) {
            return 'Tenés acceso completo a todas las planillas de la institución.';
        }
        if (hasRole('director')) {
            return 'Podés seleccionar cualquier planilla visada y aprobada de la institución.';
        }
        if (hasRole('vicedirector')) {
            return 'Se muestran únicamente las planillas de los docentes a tu cargo.';
        }
        return 'Se muestran únicamente tus propias planillas asignadas.';
    }, [hasRole]);

    const renderBadgeEstado = (estado: Cuaderno['estado']) => {
        switch (estado) {
            case 'borrador':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <FileEdit className="h-3 w-3" /> Borrador
                    </span>
                );
            case 'enviado_vicedireccion':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Clock className="h-3 w-3" /> En Vicedirección
                    </span>
                );
            case 'visado_observado':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                        <Send className="h-3 w-3" /> Devuelto con Obs.
                    </span>
                );
            case 'aprobado':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" /> Visado y Aprobado
                    </span>
                );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuadernos Auxiliares" />
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Cuadernos Auxiliares y Calificaciones</h1>
                        <p className="text-sm text-muted-foreground">
                            Planillas trimestrales consolidadas por grado, síntesis pedagógica y circuito de visado.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {cuadernosDisponibles.length > 0 && (
                            <button
                                type="button"
                                onClick={abrirModalExportar}
                                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                Exportar Planillas
                            </button>
                        )}
                        {can('crear cuadernos') && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4" /> Nueva Hoja de Trimestre
                            </button>
                        )}
                    </div>
                </div>

                {/* Barra de Filtros, Búsqueda directa y Ordenamiento */}
                <form
                    onSubmit={handleBuscarSubmit}
                    className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-12"
                >
                    {/* Buscador directo por grado, división o docente */}
                    <div className="lg:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Buscar Grado, División o Docente
                        </label>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={buscarFiltro}
                                onChange={(e) => handleBuscarInputChange(e.target.value)}
                                placeholder="Ej: 3° B, 2do, A, Tarde o docente..."
                                className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm focus:border-primary focus:outline-none"
                            />
                            {buscarFiltro && (
                                <button
                                    type="button"
                                    onClick={() => handleBuscarInputChange('')}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    title="Limpiar búsqueda"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filtro por Período */}
                    <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Período</label>
                        <select
                            value={periodoFiltro}
                            onChange={(e) => {
                                const nuevoPeriodo = e.target.value;
                                setPeriodoFiltro(nuevoPeriodo);
                                navegarConFiltros(cicloFiltro, nuevoPeriodo, buscarFiltro, ordenFiltro);
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">Todos los períodos</option>
                            <option value="1_trimestre">1° Trimestre</option>
                            <option value="2_trimestre">2° Trimestre</option>
                            <option value="3_trimestre">3° Trimestre</option>
                            <option value="informe_final">Informe Anual</option>
                        </select>
                    </div>

                    {/* Selector de Ordenamiento (Grado o División Asc/Desc) */}
                    <div className="lg:col-span-2">
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <ArrowUpDown className="h-3 w-3" /> Ordenar por
                        </label>
                        <select
                            value={ordenFiltro}
                            onChange={(e) => {
                                const nuevoOrden = e.target.value;
                                setOrdenFiltro(nuevoOrden);
                                navegarConFiltros(cicloFiltro, periodoFiltro, buscarFiltro, nuevoOrden);
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="grado_asc">Grado (1.° → 7.°)</option>
                            <option value="grado_desc">Grado (7.° → 1.°)</option>
                            <option value="division_asc">División (A → Z)</option>
                            <option value="division_desc">División (Z → A)</option>
                        </select>
                    </div>

                    {/* Filtro por Ciclo Lectivo */}
                    <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Ciclo Lectivo</label>
                        <select
                            value={cicloFiltro}
                            onChange={(e) => {
                                const nuevoCiclo = e.target.value;
                                setCicloFiltro(nuevoCiclo);
                                navegarConFiltros(nuevoCiclo, periodoFiltro, buscarFiltro, ordenFiltro);
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {ciclos.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.anio} {!c.cerrado ? '(Activo)' : '(Cerrado)'}
                                </option>
                            ))}
                            <option value="todos">Todos los ciclos</option>
                        </select>
                    </div>

                    {/* Botón Restablecer */}
                    <div className="flex items-end lg:col-span-2">
                        <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Restablecer
                        </button>
                    </div>
                </form>

                {/* Tabla de Cuadernos */}
                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Grado / Sección</th>
                                <th className="px-4 py-3">Docente Titular</th>
                                <th className="px-4 py-3">Período / Ciclo</th>
                                <th className="px-4 py-3 text-center">Estado Visado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cuadernos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                        No hay hojas de cuaderno registradas con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                cuadernos.data.map((c) => (
                                    <tr key={c.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-semibold">{c.grado.nombre_completo}</td>
                                        <td className="px-4 py-3">
                                            {c.docente.apellido}, {c.docente.name}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {PERIODO_LABELS[c.periodo] ?? c.periodo}{' '}
                                            <span className="text-muted-foreground">({c.ciclo_lectivo.anio})</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">{renderBadgeEstado(c.estado)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                {c.estado === 'aprobado' && (
                                                    <a
                                                        href={`/cuadernos/${c.id}/exportar-excel`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                                    >
                                                        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                                                    </a>
                                                )}
                                                <Link
                                                    href={`/cuadernos/${c.id}`}
                                                    className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> Abrir Planilla
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {cuadernos.last_page > 1 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                            <div>
                                Mostrando <span className="font-semibold text-foreground">{cuadernos.from ?? 0}</span> a{' '}
                                <span className="font-semibold text-foreground">{cuadernos.to ?? 0}</span> de{' '}
                                <span className="font-semibold text-foreground">{cuadernos.total}</span> hojas
                            </div>
                            <div className="flex items-center gap-1">
                                {cuadernos.links.map((link, idx) => {
                                    const esAnterior = link.label.includes('Previous');
                                    const esSiguiente = link.label.includes('Next');
                                    const texto = esAnterior ? (
                                        <ChevronLeft className="h-4 w-4" />
                                    ) : esSiguiente ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        link.label
                                    );

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 opacity-40"
                                            >
                                                {texto}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveScroll
                                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-medium transition ${
                                                link.active
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {texto}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Nueva Hoja de Trimestre */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
                            <h2 className="mb-1 text-lg font-bold">Nueva Hoja de Planilla Trimestral</h2>
                            <p className="mb-4 text-xs text-muted-foreground">
                                Se cargarán automáticamente todos los alumnos matriculados y las materias activas del grado.
                            </p>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Ciclo Lectivo Activo</label>
                                    <select
                                        value={data.ciclo_lectivo_id}
                                        onChange={(e) => setData('ciclo_lectivo_id', e.target.value)}
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    >
                                        {cicloActivo ? (
                                            <option value={cicloActivo.id}>{cicloActivo.anio} (Ciclo Activo)</option>
                                        ) : (
                                            <option value="">— No hay ciclo activo —</option>
                                        )}
                                    </select>
                                    {errors.ciclo_lectivo_id && (
                                        <p className="mt-1 text-xs text-red-500">{errors.ciclo_lectivo_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">Grado y Sección a Cargo</label>
                                    <GradoCombobox
                                        grados={gradosCrear}
                                        value={data.grado_id}
                                        onChange={(val) => setData('grado_id', val)}
                                        emptyLabel="— Seleccionar Grado —"
                                    />
                                    {errors.grado_id && <p className="mt-1 text-xs text-red-500">{errors.grado_id}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">Período Trimestral</label>
                                    <select
                                        value={data.periodo}
                                        onChange={(e) => setData('periodo', e.target.value)}
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="1_trimestre">1° Trimestre</option>
                                        <option value="2_trimestre">2° Trimestre</option>
                                        <option value="3_trimestre">3° Trimestre</option>
                                        <option value="informe_final">Informe Anual</option>
                                    </select>
                                    {errors.periodo && <p className="mt-1 text-xs text-red-500">{errors.periodo}</p>}
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing || !cicloActivo || gradosCrear.length === 0}
                                        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {processing ? 'Generando...' : 'Generar Planilla'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Exportar Planillas a Excel */}
                {modalExportarAbierto && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border bg-card p-6 shadow-xl">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                    <div>
                                        <h2 className="text-lg font-bold">Exportar Planillas a Excel</h2>
                                        <p className="text-xs text-muted-foreground">
                                            {subtituloAlcanceModal} Si elegís varias hojas, se descargará un único archivo con una pestaña por planilla.
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="mr-1 text-xs font-medium text-muted-foreground">
                                        Período:
                                    </span>
                                    {PERIODOS_OPCIONES.map((op) => (
                                        <button
                                            key={op.value || 'todos'}
                                            type="button"
                                            onClick={() => handlePeriodoModalChange(op.value)}
                                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                                                periodoModal === op.value
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'bg-background hover:bg-muted'
                                            }`}
                                        >
                                            {op.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={filtroModal}
                                        onChange={(e) => setFiltroModal(e.target.value)}
                                        placeholder="Filtrar por grado, división o docente..."
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
                                        onClick={seleccionarTodosFiltrados}
                                        className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                    >
                                        Todas visibles ({cuadernosFiltradosModal.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deseleccionarTodos}
                                        className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                                    >
                                        Ninguna
                                    </button>
                                </div>

                                <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                                    {cuadernosFiltradosModal.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-muted-foreground">
                                            No hay planillas disponibles con los filtros seleccionados.
                                        </div>
                                    ) : (
                                        cuadernosFiltradosModal.map((c) => {
                                            const marcado = seleccionados.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => toggleCuadernoSeleccionado(c.id)}
                                                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition ${
                                                        marcado ? 'bg-primary/5' : 'hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        {marcado ? (
                                                            <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                                                        ) : (
                                                            <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        )}
                                                        <div>
                                                            <div className="font-medium">
                                                                {c.grado.nombre_completo} —{' '}
                                                                <span className="text-primary">
                                                                    {PERIODO_LABELS[c.periodo] ?? c.periodo}
                                                                </span>{' '}
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({c.ciclo_lectivo.anio})
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Docente: {c.docente.apellido}, {c.docente.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">{renderBadgeEstado(c.estado)}</div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t pt-4">
                                <span className="text-xs text-muted-foreground">
                                    <strong>{seleccionados.length}</strong>{' '}
                                    {seleccionados.length === 1 ? 'hoja seleccionada' : 'hojas seleccionadas'}
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
                                        disabled={seleccionados.length === 0}
                                        onClick={descargarSeleccionados}
                                        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        <Download className="h-4 w-4" />
                                        Descargar Excel ({seleccionados.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}