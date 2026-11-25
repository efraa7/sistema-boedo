import AppLayout from '@/layouts/app-layout';
import { Link, router } from '@inertiajs/react';
import {
    Award,
    Camera,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface CicloLectivo {
    id: number;
    anio: number;
    nombre: string;
}

interface DetalleNota {
    materia: string;
    periodo: string;
    nota: number;
    conceptual: string | null;
}

interface AlumnoMerito {
    puesto?: number;
    id: number;
    dni: string;
    legajo: string;
    nombre_completo: string;
    foto_url: string | null;
    grado_id: number;
    grado_numero: number;
    grado_division?: string;
    grado_nombre: string;
    turno: string;
    cantidad_notas: number;
    promedio: number;
    total_inasistencias: number;
    detalle_notas: DetalleNota[];
}

interface CargoBandera {
    bandera: 'nacional' | 'salta';
    cargo: string;
    origen: string;
    alumno: AlumnoMerito | null;
}

interface GradoCuadro {
    id: number;
    numero: number;
    division: string;
    turno: string;
    nombre_completo: string;
    cuadro_honor: AlumnoMerito[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedGrados {
    data: GradoCuadro[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    ciclos: CicloLectivo[];
    cicloSeleccionado: CicloLectivo | null;
    abanderadosPorTurno: {
        Mañana: CargoBandera[];
        Tarde: CargoBandera[];
    };
    gradosPaginados: PaginatedGrados;
    filtros: {
        buscar: string;
        turno: string;
        periodo: string;
        sin_desaprobadas: boolean;
    };
}

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function obtenerIniciales(nombreCompleto: string): string {
    const partes = nombreCompleto.replace(/,/g, ' ').trim().split(/\s+/);
    const primera = partes[0]?.[0] ?? '';
    const segunda = partes[1]?.[0] ?? '';
    return (primera + segunda).toUpperCase();
}

export default function CuadroHonorIndex({
    ciclos,
    cicloSeleccionado,
    abanderadosPorTurno,
    gradosPaginados,
    filtros,
}: Props) {
    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [turno, setTurno] = useState(filtros.turno || '');
    const [periodo, setPeriodo] = useState(filtros.periodo || '');
    const [sinDesaprobadas, setSinDesaprobadas] = useState<boolean>(filtros.sin_desaprobadas);

    // Turno activo en la sección de Abanderados y Escoltas
    const [turnoBanderas, setTurnoBanderas] = useState<'Mañana' | 'Tarde'>(
        filtros.turno === 'Tarde' ? 'Tarde' : 'Mañana'
    );

    // Menú desplegable de descarga PDF
    const [menuPdfAbierto, setMenuPdfAbierto] = useState(false);

    // Cache local de fotos actualizadas para reflejo instantáneo en toda la vista
    const [fotosLocales, setFotosLocales] = useState<Record<number, string>>({});
    const [subiendoFotoId, setSubiendoFotoId] = useState<number | null>(null);
    const [alumnoTargetFotoId, setAlumnoTargetFotoId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Modales de detalle
    const [gradoSeleccionadoModal, setGradoSeleccionadoModal] = useState<GradoCuadro | null>(null);
    const [alumnoSeleccionadoModal, setAlumnoSeleccionadoModal] = useState<AlumnoMerito | null>(null);

    useEffect(() => {
        if (turno === 'Mañana' || turno === 'Tarde') {
            setTurnoBanderas(turno);
        }
    }, [turno]);

    const resolverFoto = (alumno: AlumnoMerito): string | null => {
        return fotosLocales[alumno.id] ?? alumno.foto_url;
    };

    const abrirSelectorFoto = (e: React.MouseEvent, alumnoId: number) => {
        e.stopPropagation();
        if (subiendoFotoId !== null) return;
        setAlumnoTargetFotoId(alumnoId);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleArchivoFotoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        const alumnoId = alumnoTargetFotoId;

        if (!archivo || !alumnoId) return;

        setSubiendoFotoId(alumnoId);
        const formData = new FormData();
        formData.append('foto', archivo);

        try {
            const res = await fetch(`/cuadro-honor/alumnos/${alumnoId}/foto`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'No se pudo subir la foto. Verificá que sea JPG/PNG/WEBP de hasta 2 MB.');
                return;
            }

            const data = await res.json();
            if (data.foto_url) {
                setFotosLocales((prev) => ({
                    ...prev,
                    [alumnoId]: data.foto_url,
                }));
            }

            router.reload({ only: ['abanderadosPorTurno', 'gradosPaginados'] });
        } catch (error) {
            console.error('Error al subir foto:', error);
            alert('Ocurrió un error al guardar la imagen.');
        } finally {
            setSubiendoFotoId(null);
            setAlumnoTargetFotoId(null);
        }
    };

    const aplicarFiltros = (
        nuevoCicloId: number | string | undefined,
        nuevoBuscar: string,
        nuevoTurno: string,
        nuevoPeriodo: string,
        nuevoSinDesaprobadas: boolean
    ) => {
        router.get(
            '/cuadro-honor',
            {
                ciclo_lectivo_id: nuevoCicloId,
                buscar: nuevoBuscar,
                turno: nuevoTurno,
                periodo: nuevoPeriodo,
                sin_desaprobadas: nuevoSinDesaprobadas ? 1 : 0,
            },
            { preserveState: true, replace: true }
        );
    };

    const construirUrlPdf = (turnoPdf: 'ambos' | 'Mañana' | 'Tarde') => {
        const params = new URLSearchParams();
        if (cicloSeleccionado?.id) params.set('ciclo_lectivo_id', String(cicloSeleccionado.id));
        if (periodo) params.set('periodo', periodo);
        params.set('sin_desaprobadas', sinDesaprobadas ? '1' : '0');
        params.set('turno_pdf', turnoPdf);
        return `/cuadro-honor/descargar-pdf?${params.toString()}`;
    };

    const cargosTurnoActual = abanderadosPorTurno[turnoBanderas] || [];
    const banderaNacional = cargosTurnoActual.filter((a) => a.bandera === 'nacional');
    const banderaSalta = cargosTurnoActual.filter((a) => a.bandera === 'salta');

    return (
        <AppLayout breadcrumbs={[{ title: 'Cuadro de Honor', href: '/cuadro-honor' }]}>
            {/* Input oculto reutilizable para cargar foto desde cualquier tarjeta */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleArchivoFotoSeleccionado}
            />

            <div className="space-y-6 p-6">
                {/* Encabezado y Descarga PDF */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Abanderados y Cuadro de Honor
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Cuerpo de banderas por turno (7.º, 6.º y 5.º Grado) y mejores 5 promedios por curso.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={cicloSeleccionado?.id || ''}
                            onChange={(e) =>
                                aplicarFiltros(e.target.value, buscar, turno, periodo, sinDesaprobadas)
                            }
                            className="rounded-lg border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                            {ciclos.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.anio} - {c.nombre}
                                </option>
                            ))}
                        </select>

                        {/* Botón desplegable Descargar Cuadro de Honor (PDF) */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setMenuPdfAbierto((prev) => !prev)}
                                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                            >
                                <FileDown className="h-4 w-4" />
                                Descargar Cuadro de Honor
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {menuPdfAbierto && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setMenuPdfAbierto(false)}
                                    />
                                    <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                                        <a
                                            href={construirUrlPdf('ambos')}
                                            onClick={() => setMenuPdfAbierto(false)}
                                            className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-800 hover:bg-amber-50 dark:text-gray-200 dark:hover:bg-gray-800"
                                        >
                                            <span>Ambos turnos (Mañana y Tarde)</span>
                                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                PDF
                                            </span>
                                        </a>
                                        <a
                                            href={construirUrlPdf('Mañana')}
                                            onClick={() => setMenuPdfAbierto(false)}
                                            className="flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-amber-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            <span>Solo Turno Mañana</span>
                                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                PDF
                                            </span>
                                        </a>
                                        <a
                                            href={construirUrlPdf('Tarde')}
                                            onClick={() => setMenuPdfAbierto(false)}
                                            className="flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            <span>Solo Turno Tarde</span>
                                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                PDF
                                            </span>
                                        </a>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Selector de Turno para Abanderados y Escoltas */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            Cuerpo de Banderas — Turno {turnoBanderas}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTurnoBanderas('Mañana')}
                            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                                turnoBanderas === 'Mañana'
                                    ? 'bg-amber-500 text-white shadow'
                                    : 'bg-gray-100 text-gray-600 hover:bg-amber-100 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            Turno Mañana
                        </button>
                        <button
                            type="button"
                            onClick={() => setTurnoBanderas('Tarde')}
                            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                                turnoBanderas === 'Tarde'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-gray-100 text-gray-600 hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            Turno Tarde
                        </button>
                    </div>
                </div>

                {/* Tarjetas de Abanderados y Escoltas con Foto y Subida Rápida */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Bandera Nacional */}
                    <div className="space-y-4 rounded-xl border-2 border-sky-200 bg-sky-50/70 p-5 dark:border-sky-800 dark:bg-sky-950/20">
                        <div className="flex items-center justify-between border-b border-sky-200 pb-2 dark:border-sky-800">
                            <h2 className="text-base font-bold text-sky-900 dark:text-sky-200">
                                Bandera Nacional — Turno {turnoBanderas}
                            </h2>
                            <span className="text-xs font-medium text-sky-700 dark:text-sky-400">
                                7.º y 6.º Grado
                            </span>
                        </div>

                        <div className="space-y-3">
                            {banderaNacional.map((item, idx) => {
                                const al = item.alumno;
                                const fotoUrl = al ? resolverFoto(al) : null;
                                const cargandoEstaFoto = al ? subiendoFotoId === al.id : false;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => al && setAlumnoSeleccionadoModal(al)}
                                        className={`flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-white p-3.5 dark:border-sky-900 dark:bg-gray-900 ${
                                            al ? 'cursor-pointer transition hover:border-sky-400' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            {/* Avatar / Foto */}
                                            {al ? (
                                                <div className="relative shrink-0">
                                                    {fotoUrl ? (
                                                        <img
                                                            src={fotoUrl}
                                                            alt={al.nombre_completo}
                                                            className="h-14 w-14 rounded-full border-2 border-sky-300 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-sky-300 bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                                            {obtenerIniciales(al.nombre_completo)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}

                                            <div>
                                                <span className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">
                                                    {item.cargo} ({item.origen})
                                                </span>
                                                {al ? (
                                                    <>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {al.nombre_completo}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{al.grado_nombre}</p>

                                                        <button
                                                            type="button"
                                                            disabled={cargandoEstaFoto}
                                                            onClick={(e) => abrirSelectorFoto(e, al.id)}
                                                            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                                                        >
                                                            {cargandoEstaFoto ? (
                                                                <>
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                    Subiendo...
                                                                </>
                                                            ) : fotoUrl ? (
                                                                <>
                                                                    <RefreshCw className="h-3 w-3" />
                                                                    Cambiar foto
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Camera className="h-3 w-3" />
                                                                    Subir foto
                                                                </>
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <p className="mt-0.5 text-xs italic text-gray-400">
                                                        Sin alumnos elegibles en {item.origen} (Turno {turnoBanderas})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {al && (
                                            <div className="shrink-0 text-right">
                                                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                                                    {al.promedio.toFixed(2)}
                                                </span>
                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    Inasist.: {al.total_inasistencias}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bandera de Salta */}
                    <div className="space-y-4 rounded-xl border-2 border-red-200 bg-red-50/70 p-5 dark:border-red-800 dark:bg-red-950/20">
                        <div className="flex items-center justify-between border-b border-red-200 pb-2 dark:border-red-800">
                            <h2 className="text-base font-bold text-red-900 dark:text-red-200">
                                Bandera de Salta — Turno {turnoBanderas}
                            </h2>
                            <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                6.º y 5.º Grado
                            </span>
                        </div>

                        <div className="space-y-3">
                            {banderaSalta.map((item, idx) => {
                                const al = item.alumno;
                                const fotoUrl = al ? resolverFoto(al) : null;
                                const cargandoEstaFoto = al ? subiendoFotoId === al.id : false;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => al && setAlumnoSeleccionadoModal(al)}
                                        className={`flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-white p-3.5 dark:border-red-900 dark:bg-gray-900 ${
                                            al ? 'cursor-pointer transition hover:border-red-400' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            {al ? (
                                                <div className="relative shrink-0">
                                                    {fotoUrl ? (
                                                        <img
                                                            src={fotoUrl}
                                                            alt={al.nombre_completo}
                                                            className="h-14 w-14 rounded-full border-2 border-red-300 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-red-300 bg-red-100 text-sm font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                            {obtenerIniciales(al.nombre_completo)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}

                                            <div>
                                                <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400">
                                                    {item.cargo} ({item.origen})
                                                </span>
                                                {al ? (
                                                    <>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {al.nombre_completo}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{al.grado_nombre}</p>

                                                        <button
                                                            type="button"
                                                            disabled={cargandoEstaFoto}
                                                            onClick={(e) => abrirSelectorFoto(e, al.id)}
                                                            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
                                                        >
                                                            {cargandoEstaFoto ? (
                                                                <>
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                    Subiendo...
                                                                </>
                                                            ) : fotoUrl ? (
                                                                <>
                                                                    <RefreshCw className="h-3 w-3" />
                                                                    Cambiar foto
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Camera className="h-3 w-3" />
                                                                    Subir foto
                                                                </>
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <p className="mt-0.5 text-xs italic text-gray-400">
                                                        Sin alumnos elegibles en {item.origen} (Turno {turnoBanderas})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {al && (
                                            <div className="shrink-0 text-right">
                                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-800 dark:bg-red-900/50 dark:text-red-200">
                                                    {al.promedio.toFixed(2)}
                                                </span>
                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    Inasist.: {al.total_inasistencias}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Filtros de Cuadro de Honor por Grado */}
                <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex w-full flex-col items-center gap-3 sm:flex-row lg:w-auto">
                        <input
                            type="text"
                            value={buscar}
                            onChange={(e) => {
                                setBuscar(e.target.value);
                                aplicarFiltros(cicloSeleccionado?.id, e.target.value, turno, periodo, sinDesaprobadas);
                            }}
                            placeholder="Buscar grado o división (ej: 4, A)..."
                            className="w-full rounded-lg border-gray-300 text-sm sm:w-64 dark:border-gray-700 dark:bg-gray-800"
                        />

                        <select
                            value={periodo}
                            onChange={(e) => {
                                setPeriodo(e.target.value);
                                aplicarFiltros(cicloSeleccionado?.id, buscar, turno, e.target.value, sinDesaprobadas);
                            }}
                            className="w-full rounded-lg border-gray-300 text-sm sm:w-48 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <option value="">Consolidado Anual</option>
                            <option value="1_trimestre">1.º Trimestre</option>
                            <option value="2_trimestre">2.º Trimestre</option>
                            <option value="3_trimestre">3.º Trimestre</option>
                            <option value="informe_final">Informe Final</option>
                        </select>
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-between gap-3 lg:w-auto lg:justify-end">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    const nuevoTurno = turno === 'Mañana' ? '' : 'Mañana';
                                    setTurno(nuevoTurno);
                                    aplicarFiltros(cicloSeleccionado?.id, buscar, nuevoTurno, periodo, sinDesaprobadas);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    turno === 'Mañana'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                            >
                                Mañana
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const nuevoTurno = turno === 'Tarde' ? '' : 'Tarde';
                                    setTurno(nuevoTurno);
                                    aplicarFiltros(cicloSeleccionado?.id, buscar, nuevoTurno, periodo, sinDesaprobadas);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    turno === 'Tarde'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                            >
                                Tarde
                            </button>
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={sinDesaprobadas}
                                onChange={(e) => {
                                    setSinDesaprobadas(e.target.checked);
                                    aplicarFiltros(cicloSeleccionado?.id, buscar, turno, periodo, e.target.checked);
                                }}
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span>Todo aprobado (≥ 6)</span>
                        </label>
                    </div>
                </div>

                {/* Cuadro de Honor por Grado */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                            Cuadro de Honor por Grado
                        </span>
                        <span className="text-xs text-gray-500">Hacé clic en un grado para ver el desglose</span>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {gradosPaginados.data.map((grado) => (
                            <div
                                key={grado.id}
                                onClick={() => setGradoSeleccionadoModal(grado)}
                                className="flex cursor-pointer flex-col justify-between gap-4 p-4 transition hover:bg-amber-50/40 md:flex-row md:items-center dark:hover:bg-gray-800/40"
                            >
                                <div className="shrink-0 md:w-1/5">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        {grado.numero}.° Grado "{grado.division}"
                                    </h3>
                                    <span
                                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            grado.turno === 'Mañana'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                        }`}
                                    >
                                        Turno {grado.turno}
                                    </span>
                                    <div className="mt-2">
                                        <span className="text-xs font-medium text-amber-600 underline dark:text-amber-400">
                                            Ver desglose completo →
                                        </span>
                                    </div>
                                </div>

                                <div className="md:w-4/5">
                                    {grado.cuadro_honor.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                                            {grado.cuadro_honor.map((al) => {
                                                const fotoUrl = resolverFoto(al);
                                                const cargandoEsta = subiendoFotoId === al.id;

                                                return (
                                                    <div
                                                        key={al.id}
                                                        className="flex flex-col justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/70"
                                                    >
                                                        <div>
                                                            <div className="mb-2 flex items-center justify-between gap-1">
                                                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                                                    #{al.puesto}
                                                                </span>
                                                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                                                    {al.promedio.toFixed(2)}
                                                                </span>
                                                            </div>

                                                            <div className="mb-1.5 flex items-center gap-2">
                                                                {fotoUrl ? (
                                                                    <img
                                                                        src={fotoUrl}
                                                                        alt={al.nombre_completo}
                                                                        className="h-9 w-9 shrink-0 rounded-full border border-gray-300 object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-[11px] font-bold text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                                                                        {obtenerIniciales(al.nombre_completo)}
                                                                    </div>
                                                                )}

                                                                <p
                                                                    className="line-clamp-2 text-xs font-semibold text-gray-900 dark:text-white"
                                                                    title={al.nombre_completo}
                                                                >
                                                                    {al.nombre_completo}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={cargandoEsta}
                                                            onClick={(e) => abrirSelectorFoto(e, al.id)}
                                                            className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                        >
                                                            {cargandoEsta ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : fotoUrl ? (
                                                                <>
                                                                    <RefreshCw className="h-2.5 w-2.5" />
                                                                    Cambiar foto
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Camera className="h-2.5 w-2.5" />
                                                                    Subir foto
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="py-2 text-xs italic text-gray-400">
                                            Sin alumnos con cuadernos visados elegibles en este grado.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {gradosPaginados.data.length === 0 && (
                            <div className="p-8 text-center text-sm text-gray-400">
                                No se encontraron grados con los filtros aplicados.
                            </div>
                        )}
                    </div>

                    {gradosPaginados.last_page > 1 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                            <div>
                                Mostrando <span className="font-semibold text-foreground">{gradosPaginados.from ?? 0}</span> a{' '}
                                <span className="font-semibold text-foreground">{gradosPaginados.to ?? 0}</span> de{' '}
                                <span className="font-semibold text-foreground">{gradosPaginados.total}</span> grados
                            </div>
                            <div className="flex items-center gap-1">
                                {gradosPaginados.links.map((link, idx) => {
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

                {/* Modal Desglose de Grado */}
                {gradoSeleccionadoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Cuadro de Honor - {gradoSeleccionadoModal.nombre_completo}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Detalle de los 5 mejores promedios (excluyendo cuerpo de banderas del turno)
                                    </p>
                                </div>
                                <button
                                    onClick={() => setGradoSeleccionadoModal(null)}
                                    className="text-2xl font-bold text-gray-400 hover:text-gray-600"
                                >
                                    &times;
                                </button>
                            </div>

                            {gradoSeleccionadoModal.cuadro_honor.length > 0 ? (
                                <div className="space-y-4">
                                    {gradoSeleccionadoModal.cuadro_honor.map((al) => {
                                        const fotoUrl = resolverFoto(al);
                                        const cargandoEsta = subiendoFotoId === al.id;

                                        return (
                                            <div
                                                key={al.id}
                                                className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-3">
                                                        {fotoUrl ? (
                                                            <img
                                                                src={fotoUrl}
                                                                alt={al.nombre_completo}
                                                                className="h-12 w-12 rounded-full border border-gray-300 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs font-bold text-gray-500 dark:bg-gray-900">
                                                                {obtenerIniciales(al.nombre_completo)}
                                                            </div>
                                                        )}

                                                        <div>
                                                            <span className="mr-2 text-xs font-bold text-amber-600">
                                                                Puesto #{al.puesto}
                                                            </span>
                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                {al.nombre_completo}
                                                            </span>
                                                            <p className="text-xs text-gray-500">
                                                                DNI: {al.dni} · Legajo: {al.legajo} · Inasistencias:{' '}
                                                                {al.total_inasistencias}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                disabled={cargandoEsta}
                                                                onClick={(e) => abrirSelectorFoto(e, al.id)}
                                                                className="mt-1 inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                            >
                                                                {fotoUrl ? (
                                                                    <>
                                                                        <RefreshCw className="h-3 w-3" /> Cambiar foto
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Camera className="h-3 w-3" /> Subir foto
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                                        Promedio: {al.promedio.toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {al.detalle_notas.map((n, i) => (
                                                        <span
                                                            key={i}
                                                            className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                                                        >
                                                            {n.materia} ({n.periodo}):{' '}
                                                            <strong>{n.nota.toFixed(2)}</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="py-6 text-center text-gray-400">
                                    No hay alumnos registrados en el Cuadro de Honor de este grado.
                                </p>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setGradoSeleccionadoModal(null)}
                                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Detalle de Notas de Abanderado / Escolta */}
                {alumnoSeleccionadoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    {resolverFoto(alumnoSeleccionadoModal) ? (
                                        <img
                                            src={resolverFoto(alumnoSeleccionadoModal)!}
                                            alt={alumnoSeleccionadoModal.nombre_completo}
                                            className="h-12 w-12 rounded-full border border-gray-300 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            {obtenerIniciales(alumnoSeleccionadoModal.nombre_completo)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {alumnoSeleccionadoModal.nombre_completo}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {alumnoSeleccionadoModal.grado_nombre} · DNI: {alumnoSeleccionadoModal.dni} ·
                                            Promedio: {alumnoSeleccionadoModal.promedio.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAlumnoSeleccionadoModal(null)}
                                    className="text-2xl font-bold text-gray-400 hover:text-gray-600"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="max-h-72 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        <tr>
                                            <th className="p-2">Materia</th>
                                            <th className="p-2">Período</th>
                                            <th className="p-2 text-center">Nota</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {alumnoSeleccionadoModal.detalle_notas.map((n, i) => (
                                            <tr key={i}>
                                                <td className="p-2 font-medium">{n.materia}</td>
                                                <td className="p-2 text-xs text-gray-500">{n.periodo}</td>
                                                <td className="p-2 text-center font-bold">{n.nota.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setAlumnoSeleccionadoModal(null)}
                                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
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