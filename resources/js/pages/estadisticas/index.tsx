import AppLayout from '@/layouts/app-layout';
import { router } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Award,
    BarChart3,
    GraduationCap,
    HeartHandshake,
    Milk,
    TrendingDown,
    TrendingUp,
    UserCog,
    Users,
} from 'lucide-react';
import React from 'react';

interface CicloLectivo {
    id: number;
    anio: number;
    nombre: string;
    cerrado: boolean;
}

interface PuntoGradoCantidad {
    numero: number;
    etiqueta: string;
    cantidad: number;
}

interface PuntoGradoPromedio {
    numero: number;
    etiqueta: string;
    promedio: number;
}

interface MetricasCiclo {
    ciclo_id: number;
    anio: number;
    cantidad_docentes: number;
    cantidad_grados: number;
    cantidad_alumnos: number;
    cantidad_inclusion: number;
    cantidad_copa_leche: number;
    promedio_notas: number;
    cantidad_evaluaciones: number;
    alumnos_por_grado: PuntoGradoCantidad[];
    promedios_por_grado: PuntoGradoPromedio[];
}

interface Props {
    ciclos: CicloLectivo[];
    cicloActual: CicloLectivo | null;
    cicloComparar: CicloLectivo | null;
    metricasActual: MetricasCiclo | null;
    metricasComparar: MetricasCiclo | null;
    filtros: {
        turno: string;
    };
}

function calcularVariacion(actual: number, anterior: number, decimales = 0) {
    const diff = Number((actual - anterior).toFixed(decimales));
    const porcentaje =
        anterior > 0 ? Number((((actual - anterior) / anterior) * 100).toFixed(1)) : actual > 0 ? 100 : 0;

    return {
        diff,
        porcentaje,
        esPositivo: diff > 0,
        esNegativo: diff < 0,
    };
}

export default function EstadisticasIndex({
    ciclos,
    cicloActual,
    cicloComparar,
    metricasActual,
    metricasComparar,
    filtros,
}: Props) {
    const navegar = (nuevoActualId?: number | string, nuevoCompararId?: number | string, nuevoTurno?: string) => {
        router.get(
            '/estadisticas',
            {
                ciclo_actual_id: nuevoActualId ?? cicloActual?.id,
                ciclo_comparar_id: nuevoCompararId ?? cicloComparar?.id,
                turno: nuevoTurno !== undefined ? nuevoTurno : filtros.turno,
            },
            { preserveState: true, replace: true }
        );
    };

    const intercambiarCiclos = () => {
        if (!cicloActual || !cicloComparar) return;
        navegar(cicloComparar.id, cicloActual.id, filtros.turno);
    };

    if (!cicloActual || !cicloComparar || !metricasActual || !metricasComparar) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Estadísticas', href: '/estadisticas' }]}>
                <div className="p-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                        No hay ciclos lectivos registrados para generar estadísticas comparativas.
                    </div>
                </div>
            </AppLayout>
        );
    }

    const anioA = cicloActual.anio;
    const anioB = cicloComparar.anio;

    const kpis = [
        {
            titulo: 'Alumnos Matriculados',
            actual: metricasActual.cantidad_alumnos,
            anterior: metricasComparar.cantidad_alumnos,
            decimales: 0,
            sufijo: '',
            icon: Users,
            colorIcono: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400',
        },
        {
            titulo: 'Copa de Leche',
            actual: metricasActual.cantidad_copa_leche,
            anterior: metricasComparar.cantidad_copa_leche,
            decimales: 0,
            sufijo: '',
            icon: Milk,
            colorIcono: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400',
        },
        {
            titulo: 'Inclusión Escolar',
            actual: metricasActual.cantidad_inclusion,
            anterior: metricasComparar.cantidad_inclusion,
            decimales: 0,
            sufijo: '',
            icon: HeartHandshake,
            colorIcono: 'text-rose-600 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400',
        },
        {
            titulo: 'Docentes Titulares',
            actual: metricasActual.cantidad_docentes,
            anterior: metricasComparar.cantidad_docentes,
            decimales: 0,
            sufijo: '',
            icon: UserCog,
            colorIcono: 'text-sky-600 bg-sky-100 dark:bg-sky-950/60 dark:text-sky-400',
        },
        {
            titulo: 'Grados / Secciones',
            actual: metricasActual.cantidad_grados,
            anterior: metricasComparar.cantidad_grados,
            decimales: 0,
            sufijo: '',
            icon: GraduationCap,
            colorIcono: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400',
        },
        {
            titulo: 'Promedio General',
            actual: metricasActual.promedio_notas,
            anterior: metricasComparar.promedio_notas,
            decimales: 2,
            sufijo: ' pts',
            icon: Award,
            colorIcono: 'text-purple-600 bg-purple-100 dark:bg-purple-950/60 dark:text-purple-400',
        },
    ];

    // Datos para Gráfica 1: Comparativa de Cantidades por Módulo
    const barrasModulos = [
        {
            etiqueta: 'Alumnos',
            actual: metricasActual.cantidad_alumnos,
            anterior: metricasComparar.cantidad_alumnos,
        },
        {
            etiqueta: 'Copa de Leche',
            actual: metricasActual.cantidad_copa_leche,
            anterior: metricasComparar.cantidad_copa_leche,
        },
        {
            etiqueta: 'Inclusión',
            actual: metricasActual.cantidad_inclusion,
            anterior: metricasComparar.cantidad_inclusion,
        },
        {
            etiqueta: 'Docentes',
            actual: metricasActual.cantidad_docentes,
            anterior: metricasComparar.cantidad_docentes,
        },
        {
            etiqueta: 'Grados',
            actual: metricasActual.cantidad_grados,
            anterior: metricasComparar.cantidad_grados,
        },
    ];

    const maxModulos = Math.max(
        1,
        ...barrasModulos.flatMap((b) => [b.actual, b.anterior])
    );

    // Datos para Gráfica 2: Matrícula por Grado (1.° a 7.°)
    const gradosComparados = metricasActual.alumnos_por_grado.map((item, idx) => ({
        etiqueta: item.etiqueta,
        actual: item.cantidad,
        anterior: metricasComparar.alumnos_por_grado[idx]?.cantidad ?? 0,
    }));

    const maxAlumnosGrado = Math.max(
        1,
        ...gradosComparados.flatMap((g) => [g.actual, g.anterior])
    );

    // Datos para Gráfica 3: Promedio de Notas por Grado (escala 0 a 10)
    const promediosComparados = metricasActual.promedios_por_grado.map((item, idx) => ({
        etiqueta: item.etiqueta,
        actual: item.promedio,
        anterior: metricasComparar.promedios_por_grado[idx]?.promedio ?? 0,
    }));

    return (
        <AppLayout breadcrumbs={[{ title: 'Estadísticas', href: '/estadisticas' }]}>
            <div className="space-y-6 p-6">
                {/* Cabecera y Selectores de Comparación */}
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs lg:flex-row lg:items-center dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Estadísticas Institucionales Comparadas
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Comparativa interanual de matrícula, plantel, programas y rendimiento académico ({anioA} vs {anioB}).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Ciclo Principal */}
                        <div className="flex flex-col">
                            <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                Ciclo Principal
                            </span>
                            <select
                                value={cicloActual.id}
                                onChange={(e) => navegar(e.target.value, cicloComparar.id)}
                                className="rounded-lg border-indigo-300 text-sm font-semibold focus:ring-indigo-500 dark:border-indigo-800 dark:bg-gray-800"
                            >
                                {ciclos.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.anio} {!c.cerrado ? '(Actual)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={intercambiarCiclos}
                            title="Intercambiar ciclos"
                            className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                        </button>

                        {/* Ciclo a Comparar */}
                        <div className="flex flex-col">
                            <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                Comparar con
                            </span>
                            <select
                                value={cicloComparar.id}
                                onChange={(e) => navegar(cicloActual.id, e.target.value)}
                                className="rounded-lg border-amber-300 text-sm font-semibold focus:ring-amber-500 dark:border-amber-800 dark:bg-gray-800"
                            >
                                {ciclos.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.anio} {!c.cerrado ? '(Actual)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Turno */}
                        <div className="flex flex-col">
                            <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Turno
                            </span>
                            <div className="flex items-center gap-1">
                                {[
                                    { label: 'Todos', val: '' },
                                    { label: 'Mañana', val: 'Mañana' },
                                    { label: 'Tarde', val: 'Tarde' },
                                ].map((op) => (
                                    <button
                                        key={op.label}
                                        type="button"
                                        onClick={() => navegar(cicloActual.id, cicloComparar.id, op.val)}
                                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                            filtros.turno === op.val
                                                ? 'bg-slate-900 text-white dark:bg-indigo-600'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                                        }`}
                                    >
                                        {op.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leyenda Global de Colores */}
                <div className="flex flex-wrap items-center gap-6 px-1 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded-sm bg-indigo-600" />
                        <span className="text-gray-800 dark:text-gray-200">
                            Ciclo {anioA} ({cicloActual.nombre})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded-sm bg-amber-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                            Ciclo {anioB} ({cicloComparar.nombre})
                        </span>
                    </div>
                </div>

                {/* 6 Tarjetas KPI Comparativas */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {kpis.map((kpi) => {
                        const Icono = kpi.icon;
                        const variacion = calcularVariacion(kpi.actual, kpi.anterior, kpi.decimales);
                        const valorActualStr =
                            kpi.decimales > 0 ? kpi.actual.toFixed(kpi.decimales) : String(kpi.actual);
                        const valorAnteriorStr =
                            kpi.decimales > 0 ? kpi.anterior.toFixed(kpi.decimales) : String(kpi.anterior);
                        const diffStr =
                            kpi.decimales > 0
                                ? (variacion.diff > 0 ? `+${variacion.diff.toFixed(kpi.decimales)}` : variacion.diff.toFixed(kpi.decimales))
                                : variacion.diff > 0
                                  ? `+${variacion.diff}`
                                  : String(variacion.diff);

                        return (
                            <div
                                key={kpi.titulo}
                                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            {kpi.titulo}
                                        </p>
                                        <div className="mt-2 flex items-baseline gap-2.5">
                                            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                                {valorActualStr}
                                                {kpi.sufijo}
                                            </span>
                                            <span className="text-xs font-medium text-gray-400">
                                                vs {valorAnteriorStr}
                                                {kpi.sufijo} ({anioB})
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`rounded-xl p-2.5 ${kpi.colorIcono}`}>
                                        <Icono className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
                                    <span className="text-gray-500">Variación interanual:</span>
                                    {variacion.diff === 0 ? (
                                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            Sin cambios (0%)
                                        </span>
                                    ) : variacion.esPositivo ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            {diffStr} ({variacion.porcentaje > 0 ? `+${variacion.porcentaje}%` : `${variacion.porcentaje}%`})
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                            <TrendingDown className="h-3.5 w-3.5" />
                                            {diffStr} ({variacion.porcentaje}%)
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Fila de Gráficas 1 y 2 */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Gráfica 1: Comparativa por Módulo */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                        <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Comparativa por Módulo ({anioA} vs {anioB})
                            </h2>
                            <p className="text-xs text-gray-500">
                                Volumen total de alumnos, programas y estructura docente
                            </p>
                        </div>

                        <div className="mt-6 grid h-64 grid-cols-5 items-end gap-3 border-b border-gray-200 px-2 pb-2 dark:border-gray-800">
                            {barrasModulos.map((item) => {
                                const altActual = Math.max(4, Math.round((item.actual / maxModulos) * 185));
                                const altAnterior = Math.max(4, Math.round((item.anterior / maxModulos) * 185));

                                return (
                                    <div key={item.etiqueta} className="flex flex-col items-center">
                                        <div className="flex items-end gap-1.5">
                                            {/* Barra Ciclo Principal */}
                                            <div className="flex flex-col items-center">
                                                <span className="mb-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                                    {item.actual}
                                                </span>
                                                <div
                                                    style={{ height: `${altActual}px` }}
                                                    className="w-6 rounded-t-md bg-indigo-600 transition-all duration-300 hover:bg-indigo-500 sm:w-8"
                                                    title={`${item.etiqueta} (${anioA}): ${item.actual}`}
                                                />
                                            </div>

                                            {/* Barra Ciclo Comparado */}
                                            <div className="flex flex-col items-center">
                                                <span className="mb-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                                    {item.anterior}
                                                </span>
                                                <div
                                                    style={{ height: `${altAnterior}px` }}
                                                    className="w-6 rounded-t-md bg-amber-500 transition-all duration-300 hover:bg-amber-400 sm:w-8"
                                                    title={`${item.etiqueta} (${anioB}): ${item.anterior}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-2 grid grid-cols-5 gap-3 px-2 text-center">
                            {barrasModulos.map((item) => (
                                <span
                                    key={item.etiqueta}
                                    className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    {item.etiqueta}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Gráfica 2: Matrícula por Grado (1.° a 7.°) */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                        <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Distribución de Alumnos por Grado (1.º a 7.º)
                            </h2>
                            <p className="text-xs text-gray-500">
                                Cantidad de alumnos matriculados por año escolar en {anioA} vs {anioB}
                            </p>
                        </div>

                        <div className="mt-6 grid h-64 grid-cols-7 items-end gap-2 border-b border-gray-200 px-1 pb-2 dark:border-gray-800">
                            {gradosComparados.map((g) => {
                                const altActual = Math.max(4, Math.round((g.actual / maxAlumnosGrado) * 185));
                                const altAnterior = Math.max(4, Math.round((g.anterior / maxAlumnosGrado) * 185));

                                return (
                                    <div key={g.etiqueta} className="flex flex-col items-center">
                                        <div className="flex items-end gap-1">
                                            <div className="flex flex-col items-center">
                                                <span className="mb-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                                    {g.actual}
                                                </span>
                                                <div
                                                    style={{ height: `${altActual}px` }}
                                                    className="w-4 rounded-t-md bg-indigo-600 transition-all duration-300 hover:bg-indigo-500 sm:w-6"
                                                    title={`${g.etiqueta} Grado (${anioA}): ${g.actual} alumnos`}
                                                />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="mb-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                                    {g.anterior}
                                                </span>
                                                <div
                                                    style={{ height: `${altAnterior}px` }}
                                                    className="w-4 rounded-t-md bg-amber-500 transition-all duration-300 hover:bg-amber-400 sm:w-6"
                                                    title={`${g.etiqueta} Grado (${anioB}): ${g.anterior} alumnos`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-2 grid grid-cols-7 gap-2 px-1 text-center">
                            {gradosComparados.map((g) => (
                                <span
                                    key={g.etiqueta}
                                    className="text-xs font-bold text-gray-700 dark:text-gray-300"
                                >
                                    {g.etiqueta}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Gráfica 3: Promedio Académico por Grado (1.° a 7.°) */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Promedio de Calificaciones por Grado (Escala 1 a 10)
                            </h2>
                            <p className="text-xs text-gray-500">
                                Calculado sobre cuadernos auxiliares visados/aprobados ({metricasActual.cantidad_evaluaciones} notas en {anioA} vs {metricasComparar.cantidad_evaluaciones} en {anioB})
                            </p>
                        </div>
                        <span className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                            Promedio Ciclo {anioA}: {metricasActual.promedio_notas.toFixed(2)} | Ciclo {anioB}:{' '}
                            {metricasComparar.promedio_notas.toFixed(2)}
                        </span>
                    </div>

                    <div className="mt-6 grid h-56 grid-cols-7 items-end gap-3 border-b border-gray-200 px-2 pb-2 dark:border-gray-800">
                        {promediosComparados.map((p) => {
                            const altActual = p.actual > 0 ? Math.max(8, Math.round((p.actual / 10) * 165)) : 4;
                            const altAnterior = p.anterior > 0 ? Math.max(8, Math.round((p.anterior / 10) * 165)) : 4;

                            return (
                                <div key={p.etiqueta} className="flex flex-col items-center">
                                    <div className="flex items-end gap-1.5">
                                        <div className="flex flex-col items-center">
                                            <span className="mb-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                                {p.actual > 0 ? p.actual.toFixed(2) : '—'}
                                            </span>
                                            <div
                                                style={{ height: `${altActual}px` }}
                                                className="w-5 rounded-t-md bg-indigo-600 transition-all duration-300 sm:w-7"
                                                title={`${p.etiqueta} Grado (${anioA}): ${p.actual.toFixed(2)}`}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="mb-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                                {p.anterior > 0 ? p.anterior.toFixed(2) : '—'}
                                            </span>
                                            <div
                                                style={{ height: `${altAnterior}px` }}
                                                className="w-5 rounded-t-md bg-amber-500 transition-all duration-300 sm:w-7"
                                                title={`${p.etiqueta} Grado (${anioB}): ${p.anterior.toFixed(2)}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-3 px-2 text-center">
                        {promediosComparados.map((p) => (
                            <span
                                key={p.etiqueta}
                                className="text-xs font-bold text-gray-700 dark:text-gray-300"
                            >
                                {p.etiqueta} Grado
                            </span>
                        ))}
                    </div>
                </div>

                {/* Tabla Resumen Ejecutivo */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
                    <div className="border-b border-gray-200 p-4 font-bold text-gray-800 dark:border-gray-800 dark:text-gray-200">
                        Resumen Ejecutivo Comparativo ({anioA} vs {anioB})
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                            <tr>
                                <th className="p-4">Indicador Institucional</th>
                                <th className="p-4 text-center text-indigo-700 dark:text-indigo-300">
                                    Ciclo {anioA}
                                </th>
                                <th className="p-4 text-center text-amber-700 dark:text-amber-300">
                                    Ciclo {anioB}
                                </th>
                                <th className="p-4 text-center">Diferencia</th>
                                <th className="p-4 text-right">Variación %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {kpis.map((kpi) => {
                                const v = calcularVariacion(kpi.actual, kpi.anterior, kpi.decimales);
                                const valA =
                                    kpi.decimales > 0 ? kpi.actual.toFixed(kpi.decimales) : String(kpi.actual);
                                const valB =
                                    kpi.decimales > 0 ? kpi.anterior.toFixed(kpi.decimales) : String(kpi.anterior);
                                const diffTxt =
                                    kpi.decimales > 0
                                        ? (v.diff > 0 ? `+${v.diff.toFixed(kpi.decimales)}` : v.diff.toFixed(kpi.decimales))
                                        : v.diff > 0
                                          ? `+${v.diff}`
                                          : String(v.diff);

                                return (
                                    <tr key={kpi.titulo} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        <td className="p-4 font-semibold text-gray-900 dark:text-white">
                                            {kpi.titulo}
                                        </td>
                                        <td className="p-4 text-center font-bold text-indigo-700 dark:text-indigo-300">
                                            {valA}
                                            {kpi.sufijo}
                                        </td>
                                        <td className="p-4 text-center font-medium text-gray-600 dark:text-gray-400">
                                            {valB}
                                            {kpi.sufijo}
                                        </td>
                                        <td className="p-4 text-center font-bold">
                                            <span
                                                className={
                                                    v.esPositivo
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : v.esNegativo
                                                          ? 'text-rose-600 dark:text-rose-400'
                                                          : 'text-gray-400'
                                                }
                                            >
                                                {diffTxt}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-xs font-bold">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 ${
                                                    v.esPositivo
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : v.esNegativo
                                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                }`}
                                            >
                                                {v.porcentaje > 0 ? `+${v.porcentaje}%` : `${v.porcentaje}%`}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}