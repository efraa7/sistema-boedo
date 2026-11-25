import AppLayout from '@/layouts/app-layout';
import { Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    Search,
    Users,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface CicloLectivo {
    id: number;
    anio: number;
    nombre: string;
}

interface GradoResumen {
    id: number;
    numero: number;
    division: string;
    turno: string;
    nombre_completo: string;
    total_matriculados: number;
    total_copa_leche: number;
}

interface GradoOption {
    id: number;
    nombre: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData<T> {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface AlumnoModal {
    id: number;
    dni: string;
    legajo: string;
    nombre_completo: string;
    tutor_nombre: string;
    tutor_telefono: string;
    recibe_copa_leche: boolean;
}

interface AlumnoPadron {
    id: number;
    dni: string;
    legajo: string;
    nombre_completo: string;
    recibe_copa_leche: boolean;
    grado_texto: string;
}

interface Props {
    ciclos: CicloLectivo[];
    cicloSeleccionado: CicloLectivo | null;
    grados: PaginatedData<GradoResumen>;
    gradosLista: GradoOption[];
    alumnosPadron: PaginatedData<AlumnoPadron>;
    resumen: {
        total_raciones: number;
        turno_manana: number;
        turno_tarde: number;
    };
    filtros: {
        tab: string;
        buscar: string;
        turno: string;
        buscar_alumno: string;
        grado_alumno_id: string;
        estado_copa: string;
    };
}

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function CopaLecheIndex({
    ciclos,
    cicloSeleccionado,
    grados,
    gradosLista,
    alumnosPadron,
    resumen,
    filtros,
}: Props) {
    const [tabActiva, setTabActiva] = useState<'grados' | 'padron'>(
        filtros.tab === 'padron' ? 'padron' : 'grados'
    );

    // Filtros Pestaña 1 (Grados)
    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(filtros.turno || '');

    // Filtros Pestaña 2 (Padrón Rápido de Alumnos)
    const [buscarAlumno, setBuscarAlumno] = useState(filtros.buscar_alumno || '');
    const [gradoAlumnoId, setGradoAlumnoId] = useState(filtros.grado_alumno_id || '');
    const [estadoCopa, setEstadoCopa] = useState(filtros.estado_copa || '');

    // Estado local de alumnos del padrón para respuesta inmediata al hacer clic
    const [listaPadron, setListaPadron] = useState<AlumnoPadron[]>(alumnosPadron.data);
    const [togglingIds, setTogglingIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setListaPadron(alumnosPadron.data);
    }, [alumnosPadron.data]);

    // Estado del Modal de Grado
    const [modalGrado, setModalGrado] = useState<string | null>(null);
    const [alumnosModal, setAlumnosModal] = useState<AlumnoModal[]>([]);
    const [filtroModal, setFiltroModal] = useState('');
    const [cargandoModal, setCargandoModal] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navegarConFiltros = (overrides: Record<string, string | number | undefined>) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        router.get(
            '/copa-leche',
            {
                ciclo_lectivo_id: cicloSeleccionado?.id,
                tab: tabActiva,
                buscar,
                turno: turnoSeleccionado,
                buscar_alumno: buscarAlumno,
                grado_alumno_id: gradoAlumnoId,
                estado_copa: estadoCopa,
                ...overrides,
            },
            { preserveState: true, replace: true }
        );
    };

    const navegarConDebounce = (overrides: Record<string, string | number | undefined>) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.get(
                '/copa-leche',
                {
                    ciclo_lectivo_id: cicloSeleccionado?.id,
                    tab: tabActiva,
                    buscar,
                    turno: turnoSeleccionado,
                    buscar_alumno: buscarAlumno,
                    grado_alumno_id: gradoAlumnoId,
                    estado_copa: estadoCopa,
                    ...overrides,
                },
                { preserveState: true, replace: true }
            );
        }, 300);
    };

    const cambiarTab = (nuevaTab: 'grados' | 'padron') => {
        setTabActiva(nuevaTab);
        navegarConFiltros({ tab: nuevaTab });
    };

    const handleBuscarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value;
        setBuscar(valor);
        navegarConDebounce({ tab: 'grados', buscar: valor, page: 1 });
    };

    const handleTurnoClick = (turno: string) => {
        const nuevoTurno = turnoSeleccionado === turno ? '' : turno;
        setTurnoSeleccionado(nuevoTurno);
        navegarConFiltros({ tab: 'grados', turno: nuevoTurno, page: 1 });
    };

    const handleBuscarAlumnoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value;
        setBuscarAlumno(valor);
        navegarConDebounce({ tab: 'padron', buscar_alumno: valor, alumnos_page: 1 });
    };

    const handleGradoAlumnoChange = (valor: string) => {
        setGradoAlumnoId(valor);
        navegarConFiltros({ tab: 'padron', grado_alumno_id: valor, alumnos_page: 1 });
    };

    const handleEstadoCopaChange = (valor: string) => {
        const nuevo = estadoCopa === valor ? '' : valor;
        setEstadoCopa(nuevo);
        navegarConFiltros({ tab: 'padron', estado_copa: nuevo, alumnos_page: 1 });
    };

    const cambiarCiclo = (cicloId: string) => {
        navegarConFiltros({
            ciclo_lectivo_id: cicloId,
            page: 1,
            alumnos_page: 1,
        });
    };

    const verDetalleGrado = async (gradoId: number) => {
        setCargandoModal(true);
        setFiltroModal('');
        setModalGrado('Cargando...');
        try {
            const res = await fetch(`/copa-leche/grado/${gradoId}`);
            const data = await res.json();
            setModalGrado(data.grado);
            setAlumnosModal(data.alumnos);
        } catch (error) {
            console.error('Error al cargar alumnos:', error);
            setModalGrado(null);
        } finally {
            setCargandoModal(false);
        }
    };

    const toggleRecibeCopa = async (alumnoId: number, valorActual: boolean) => {
        if (togglingIds[alumnoId]) return;

        const nuevoValor = !valorActual;
        setTogglingIds((prev) => ({ ...prev, [alumnoId]: true }));

        // Actualización optimista en pantalla
        setListaPadron((prev) =>
            prev.map((al) => (al.id === alumnoId ? { ...al, recibe_copa_leche: nuevoValor } : al))
        );
        setAlumnosModal((prev) =>
            prev.map((al) => (al.id === alumnoId ? { ...al, recibe_copa_leche: nuevoValor } : al))
        );

        try {
            const res = await fetch(`/copa-leche/alumnos/${alumnoId}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({ recibe_copa_leche: nuevoValor }),
            });

            if (!res.ok) {
                throw new Error('Error al actualizar');
            }

            // Refrescar tarjetas de totales y contadores de grados sin perder el scroll ni el modal
            router.reload({ only: ['resumen', 'grados', 'alumnosPadron'] });
        } catch (error) {
            console.error('No se pudo cambiar el estado de Copa de Leche:', error);
            // Revertir cambio optimista si hubo error
            setListaPadron((prev) =>
                prev.map((al) => (al.id === alumnoId ? { ...al, recibe_copa_leche: valorActual } : al))
            );
            setAlumnosModal((prev) =>
                prev.map((al) => (al.id === alumnoId ? { ...al, recibe_copa_leche: valorActual } : al))
            );
        } finally {
            setTogglingIds((prev) => ({ ...prev, [alumnoId]: false }));
        }
    };

    const alumnosModalFiltrados = alumnosModal.filter((a) => {
        if (!filtroModal.trim()) return true;
        const q = filtroModal.toLowerCase();
        return a.nombre_completo.toLowerCase().includes(q) || a.dni.toLowerCase().includes(q);
    });

    const totalBeneficiariosModal = alumnosModal.filter((a) => a.recibe_copa_leche).length;

    const urlExcel = `/copa-leche/exportar-excel${cicloSeleccionado ? `?ciclo_lectivo_id=${cicloSeleccionado.id}` : ''
        }`;

    return (
        <AppLayout breadcrumbs={[{ title: 'Copa de Leche', href: '/copa-leche' }]}>
            <div className="space-y-6 p-6">
                {/* Cabecera */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Proyección y Padrón Copa de Leche
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Control de raciones diarias por turno, aula y actualización rápida de beneficiarios.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Ciclo Lectivo:
                        </label>
                        <select
                            value={cicloSeleccionado?.id || ''}
                            onChange={(e) => cambiarCiclo(e.target.value)}
                            className="rounded-lg border-gray-300 text-sm focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900"
                        >
                            {ciclos.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.anio} - {c.nombre}
                                </option>
                            ))}
                        </select>

                        <a
                            href={urlExcel}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Exportar Reporte Excel
                        </a>
                    </div>
                </div>

                {/* Tarjetas de Totales */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Total Raciones Diarias
                        </span>
                        <p className="mt-2 text-3xl font-extrabold text-emerald-900 dark:text-emerald-200">
                            {resumen.total_raciones}
                        </p>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">
                            Alumnos beneficiarios activos
                        </span>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Turno Mañana
                        </span>
                        <p className="mt-2 text-3xl font-extrabold text-amber-900 dark:text-amber-200">
                            {resumen.turno_manana}
                        </p>
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                            Raciones proyectadas
                        </span>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Turno Tarde
                        </span>
                        <p className="mt-2 text-3xl font-extrabold text-blue-900 dark:text-blue-200">
                            {resumen.turno_tarde}
                        </p>
                        <span className="text-xs text-blue-700 dark:text-blue-400">
                            Raciones proyectadas
                        </span>
                    </div>
                </div>

                {/* Selector de Vista: Por Grado vs Padrón Rápido de Alumnos */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={() => cambiarTab('grados')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tabActiva === 'grados'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'border bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                            }`}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Desglose por Grado y Turno
                    </button>

                    <button
                        type="button"
                        onClick={() => cambiarTab('padron')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tabActiva === 'padron'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'border bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Padrón Rápido de Alumnos (Activar / Desactivar)
                    </button>
                </div>

                {/* ===================================================================== */}
                {/* PESTAÑA 1: DESGLOSE POR GRADO Y SECCIÓN                               */}
                {/* ===================================================================== */}
                {tabActiva === 'grados' && (
                    <>
                        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row dark:border-gray-800 dark:bg-gray-900">
                            <div className="w-full sm:w-72">
                                <input
                                    type="text"
                                    value={buscar}
                                    onChange={handleBuscarChange}
                                    placeholder="Buscar por grado o división (ej: 4, A)..."
                                    className="w-full rounded-lg border-gray-300 text-sm focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                                />
                            </div>

                            <div className="flex w-full items-center gap-2 sm:w-auto">
                                <span className="mr-1 text-xs font-medium text-gray-500">Turno:</span>
                                <button
                                    type="button"
                                    onClick={() => handleTurnoClick('Mañana')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${turnoSeleccionado === 'Mañana'
                                            ? 'bg-amber-500 text-white shadow'
                                            : 'bg-gray-100 text-gray-600 hover:bg-amber-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-amber-900/40'
                                        }`}
                                >
                                    Mañana
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTurnoClick('Tarde')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${turnoSeleccionado === 'Tarde'
                                            ? 'bg-blue-600 text-white shadow'
                                            : 'bg-gray-100 text-gray-600 hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/40'
                                        }`}
                                >
                                    Tarde
                                </button>

                                {turnoSeleccionado && (
                                    <button
                                        type="button"
                                        onClick={() => handleTurnoClick('')}
                                        className="ml-1 text-xs text-gray-400 underline hover:text-gray-600"
                                    >
                                        Limpiar filtro
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
                            <div className="border-b border-gray-200 p-4 font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-200">
                                Desglose de Raciones por Grado y Sección
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                                    <tr>
                                        <th className="p-4">Grado y Sección</th>
                                        <th className="p-4">Turno</th>
                                        <th className="p-4 text-center">Matriculados</th>
                                        <th className="p-4 text-center">Copa de Leche</th>
                                        <th className="p-4 text-center">Cobertura</th>
                                        <th className="p-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {grados.data.map((g) => {
                                        const porcentaje =
                                            g.total_matriculados > 0
                                                ? Math.round((g.total_copa_leche / g.total_matriculados) * 100)
                                                : 0;

                                        return (
                                            <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                <td className="p-4 font-semibold text-gray-900 dark:text-white">
                                                    {g.numero}.° "{g.division}"
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-semibold ${g.turno === 'Mañana'
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                                            }`}
                                                    >
                                                        {g.turno}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center text-gray-600 dark:text-gray-400">
                                                    {g.total_matriculados}
                                                </td>
                                                <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                                    {g.total_copa_leche}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {porcentaje}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => verDetalleGrado(g.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                                    >
                                                        <Users className="h-3.5 w-3.5" />
                                                        Gestionar Nómina
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {grados.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center text-gray-400">
                                                No se encontraron grados que coincidan con los filtros aplicados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {grados.last_page > 1 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                                    <div>
                                        Mostrando <span className="font-semibold text-foreground">{grados.from ?? 0}</span> a{' '}
                                        <span className="font-semibold text-foreground">{grados.to ?? 0}</span> de{' '}
                                        <span className="font-semibold text-foreground">{grados.total}</span> grados
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {grados.links.map((link, idx) => {
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
                                                    preserveState
                                                    preserveScroll
                                                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-medium transition ${link.active
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
                    </>
                )}

                {/* ===================================================================== */}
                {/* PESTAÑA 2: PADRÓN RÁPIDO DE ALUMNOS (ACTIVAR / DESACTIVAR CON 1 CLIC) */}
                {/* ===================================================================== */}
                {tabActiva === 'padron' && (
                    <div className="space-y-4">
                        <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-center dark:border-gray-800 dark:bg-gray-900">
                            <div className="relative w-full lg:w-80">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={buscarAlumno}
                                    onChange={handleBuscarAlumnoChange}
                                    placeholder="Buscar alumno por apellido, nombre o DNI..."
                                    className="w-full rounded-lg border-gray-300 pl-9 text-sm focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={gradoAlumnoId}
                                    onChange={(e) => handleGradoAlumnoChange(e.target.value)}
                                    className="rounded-lg border-gray-300 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <option value="">Todos los grados</option>
                                    {gradosLista.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.nombre}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={() => handleEstadoCopaChange('reciben')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${estadoCopa === 'reciben'
                                            ? 'bg-emerald-600 text-white shadow'
                                            : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 dark:bg-gray-800 dark:text-gray-300'
                                        }`}
                                >
                                    Solo reciben
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleEstadoCopaChange('no_reciben')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${estadoCopa === 'no_reciben'
                                            ? 'bg-rose-600 text-white shadow'
                                            : 'bg-gray-100 text-gray-600 hover:bg-rose-100 dark:bg-gray-800 dark:text-gray-300'
                                        }`}
                                >
                                    No reciben
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                                    <tr>
                                        <th className="p-4">DNI</th>
                                        <th className="p-4">Apellido y Nombre</th>
                                        <th className="p-4">Grado y Turno</th>
                                        <th className="p-4 text-center">Estado Actual</th>
                                        <th className="p-4 text-right">Recibe Copa de Leche</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {listaPadron.map((al) => (
                                        <tr key={al.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                            <td className="p-4 text-xs text-gray-500">{al.dni}</td>
                                            <td className="p-4 font-semibold text-gray-900 dark:text-white">
                                                {al.nombre_completo}
                                            </td>
                                            <td className="p-4 text-xs text-gray-600 dark:text-gray-300">
                                                {al.grado_texto}
                                            </td>
                                            <td className="p-4 text-center">
                                                {al.recibe_copa_leche ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Recibe
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                        <XCircle className="h-3.5 w-3.5" /> No recibe
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    type="button"
                                                    disabled={Boolean(togglingIds[al.id])}
                                                    onClick={() => toggleRecibeCopa(al.id, al.recibe_copa_leche)}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${al.recibe_copa_leche
                                                            ? 'bg-emerald-600'
                                                            : 'bg-gray-300 dark:bg-gray-700'
                                                        }`}
                                                    title={
                                                        al.recibe_copa_leche
                                                            ? 'Clic para quitar Copa de Leche'
                                                            : 'Clic para asignar Copa de Leche'
                                                    }
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${al.recibe_copa_leche ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                    />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {listaPadron.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-gray-400">
                                                No se encontraron alumnos con los filtros aplicados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {alumnosPadron.last_page > 1 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                                    <div>
                                        Mostrando{' '}
                                        <span className="font-semibold text-foreground">{alumnosPadron.from ?? 0}</span> a{' '}
                                        <span className="font-semibold text-foreground">{alumnosPadron.to ?? 0}</span> de{' '}
                                        <span className="font-semibold text-foreground">{alumnosPadron.total}</span> alumnos
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {alumnosPadron.links.map((link, idx) => {
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
                                                    preserveState
                                                    preserveScroll
                                                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-medium transition ${link.active
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
                    </div>
                )}

                {/* ===================================================================== */}
                {/* MODAL INTERACTIVO POR GRADO (VER Y ACTIVAR/DESACTIVAR ALUMNOS)        */}
                {/* ===================================================================== */}
                {modalGrado && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Nómina del Grado — {modalGrado}
                                    </h3>
                                    {!cargandoModal && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                            Reciben Copa de Leche: <strong>{totalBeneficiariosModal}</strong> de{' '}
                                            <strong>{alumnosModal.length}</strong> alumnos matriculados
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalGrado(null)}
                                    className="text-xl font-bold text-gray-400 hover:text-gray-600"
                                >
                                    &times;
                                </button>
                            </div>

                            {!cargandoModal && alumnosModal.length > 0 && (
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={filtroModal}
                                        onChange={(e) => setFiltroModal(e.target.value)}
                                        placeholder="Filtrar alumno en este grado..."
                                        className="w-full rounded-lg border-gray-300 pl-9 text-xs focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
                                    />
                                </div>
                            )}

                            {cargandoModal ? (
                                <p className="py-6 text-center text-gray-500">Cargando nómina del grado...</p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            <tr>
                                                <th className="p-2.5">DNI</th>
                                                <th className="p-2.5">Alumno</th>
                                                <th className="p-2.5 text-center">Beneficio</th>
                                                <th className="p-2.5 text-right">Activar / Quitar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {alumnosModalFiltrados.map((a) => (
                                                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                    <td className="p-2.5 text-xs text-gray-500">{a.dni}</td>
                                                    <td className="p-2.5 font-medium">{a.nombre_completo}</td>
                                                    <td className="p-2.5 text-center">
                                                        {a.recibe_copa_leche ? (
                                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                                Sí recibe
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                                No recibe
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        <button
                                                            type="button"
                                                            disabled={Boolean(togglingIds[a.id])}
                                                            onClick={() => toggleRecibeCopa(a.id, a.recibe_copa_leche)}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${a.recibe_copa_leche
                                                                    ? 'bg-emerald-600'
                                                                    : 'bg-gray-300 dark:bg-gray-700'
                                                                }`}
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${a.recibe_copa_leche ? 'translate-x-4' : 'translate-x-0'
                                                                    }`}
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {alumnosModalFiltrados.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-4 text-center text-gray-400">
                                                        No hay alumnos matriculados en este grado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalGrado(null)}
                                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}