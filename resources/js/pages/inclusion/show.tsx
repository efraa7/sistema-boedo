import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    ClipboardList,
    Download,
    FileCheck2,
    FileText,
    GraduationCap,
    Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Materia {
    id: number;
    codigo: string;
    nombre: string;
    es_especial: boolean;
}

interface CicloOption {
    id: number;
    anio: number;
    cerrado: boolean;
}

interface InformeInicial {
    id?: number;
    escuela_especial: string | null;
    vinculo_adaptacion: string | null;
    fortalezas_estilo: string | null;
    saberes_previos: string | null;
}

interface PpiMateriaItem {
    materia_id: number;
    contenidos_priorizados: string | null;
    ajustes_evaluacion: string | null;
}

interface PpiData {
    id?: number;
    barreras_contexto: string | null;
    configuraciones_apoyo: string | null;
    materias: PpiMateriaItem[];
}

interface PeriodoMateriaItem {
    materia_id: number;
    nota_numerica: number | string | null;
    contenidos_alcanzados: string | null;
    dificultades_sugerencias: string | null;
}

interface InformePeriodoData {
    id?: number;
    periodo: '1_trimestre' | '2_trimestre' | '3_trimestre' | 'informe_final';
    inasistencias: number;
    sintesis_periodo: string | null;
    materias: PeriodoMateriaItem[];
}

interface Props {
    legajo: {
        id: number;
        diagnostico: string;
        posee_cud: boolean;
        vencimiento_cud: string | null;
        archivo_url: string | null;
        docente_integrador: string | null;
        docente_integrador_email: string | null;
        observaciones_ppi: string | null;
        alumno: {
            id: number;
            apellido: string;
            nombre: string;
            dni: string;
            fecha_nacimiento: string | null;
            tutor_nombre: string | null;
        };
        grado_actual: {
            id: number;
            nombre_completo: string;
            docente_titular: string;
        } | null;
    };
    ciclos: CicloOption[];
    cicloSeleccionado: CicloOption | null;
    materias: Materia[];
    informeInicial: InformeInicial | null;
    ppi: PpiData | null;
    informesPeriodos: Record<string, InformePeriodoData>;
    puedeEditar: boolean;
}

const PERIODOS = [
    { key: '1_trimestre', label: '1° Trimestre' },
    { key: '2_trimestre', label: '2° Trimestre' },
    { key: '3_trimestre', label: '3° Trimestre' },
    { key: 'informe_final', label: 'Informe Final Anual' },
] as const;

export default function InclusionShow({
    legajo,
    ciclos,
    cicloSeleccionado,
    materias,
    informeInicial,
    ppi,
    informesPeriodos,
    puedeEditar,
}: Props) {
    const { flash } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Inclusión Escolar', href: '/inclusion' },
        { title: `${legajo.alumno.apellido}, ${legajo.alumno.nombre}`, href: `/inclusion/${legajo.id}` },
    ];

    const [tabActiva, setTabActiva] = useState<'inicial' | 'ppi' | 'periodos'>('inicial');
    const [guardando, setGuardando] = useState(false);

    // 1. Estado Informe Inicial
    const [escuelaEspecial, setEscuelaEspecial] = useState(informeInicial?.escuela_especial ?? '');
    const [vinculoAdaptacion, setVinculoAdaptacion] = useState(informeInicial?.vinculo_adaptacion ?? '');
    const [fortalezasEstilo, setFortalezasEstilo] = useState(informeInicial?.fortalezas_estilo ?? '');
    const [saberesPrevios, setSaberesPrevios] = useState(informeInicial?.saberes_previos ?? '');

    useEffect(() => {
        setEscuelaEspecial(informeInicial?.escuela_especial ?? '');
        setVinculoAdaptacion(informeInicial?.vinculo_adaptacion ?? '');
        setFortalezasEstilo(informeInicial?.fortalezas_estilo ?? '');
        setSaberesPrevios(informeInicial?.saberes_previos ?? '');
    }, [informeInicial, cicloSeleccionado?.id]);

    // 2. Estado PPI
    const [barrerasContexto, setBarrerasContexto] = useState(ppi?.barreras_contexto ?? '');
    const [configuracionesApoyo, setConfiguracionesApoyo] = useState(ppi?.configuraciones_apoyo ?? '');
    const [ppiMaterias, setPpiMaterias] = useState<Record<number, { contenidos_priorizados: string; ajustes_evaluacion: string }>>({});

    useEffect(() => {
        setBarrerasContexto(ppi?.barreras_contexto ?? '');
        setConfiguracionesApoyo(ppi?.configuraciones_apoyo ?? '');
        const map: Record<number, { contenidos_priorizados: string; ajustes_evaluacion: string }> = {};
        materias.forEach((mat) => {
            const encontrada = ppi?.materias?.find((m) => m.materia_id === mat.id);
            map[mat.id] = {
                contenidos_priorizados: encontrada?.contenidos_priorizados ?? '',
                ajustes_evaluacion: encontrada?.ajustes_evaluacion ?? '',
            };
        });
        setPpiMaterias(map);
    }, [ppi, materias, cicloSeleccionado?.id]);

    // 3. Estado Informes Trimestrales y Final
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState<'1_trimestre' | '2_trimestre' | '3_trimestre' | 'informe_final'>('1_trimestre');
    const [inasistencias, setInasistencias] = useState<number>(0);
    const [sintesisPeriodo, setSintesisPeriodo] = useState<string>('');
    const [notasPeriodo, setNotasPeriodo] = useState<
        Record<number, { nota_numerica: number | null; contenidos_alcanzados: string; dificultades_sugerencias: string }>
    >({});

    useEffect(() => {
        const actual = informesPeriodos?.[periodoSeleccionado];
        setInasistencias(Number(actual?.inasistencias ?? 0));
        setSintesisPeriodo(actual?.sintesis_periodo ?? '');

        const map: Record<
            number,
            { nota_numerica: number | null; contenidos_alcanzados: string; dificultades_sugerencias: string }
        > = {};

        materias.forEach((mat) => {
            const encontrada = actual?.materias?.find((m) => m.materia_id === mat.id);
            map[mat.id] = {
                nota_numerica:
                    encontrada && encontrada.nota_numerica !== null && encontrada.nota_numerica !== ''
                        ? Number(encontrada.nota_numerica)
                        : null,
                contenidos_alcanzados: encontrada?.contenidos_alcanzados ?? '',
                dificultades_sugerencias: encontrada?.dificultades_sugerencias ?? '',
            };
        });
        setNotasPeriodo(map);
    }, [informesPeriodos, periodoSeleccionado, materias, cicloSeleccionado?.id]);

    const handleNotaChange = (materiaId: number, valor: string) => {
        if (valor === '') {
            setNotasPeriodo((prev) => ({
                ...prev,
                [materiaId]: { ...prev[materiaId], nota_numerica: null },
            }));
            return;
        }
        const num = Number(valor);
        if (Number.isNaN(num) || num < 1 || num > 10) {
            return;
        }
        setNotasPeriodo((prev) => ({
            ...prev,
            [materiaId]: { ...prev[materiaId], nota_numerica: num },
        }));
    };

    const promedioPeriodo = useMemo(() => {
        const validas = Object.values(notasPeriodo)
            .map((item) => item.nota_numerica)
            .filter((n): n is number => n !== null && !Number.isNaN(n) && n >= 1 && n <= 10);

        if (validas.length === 0) return null;
        return (validas.reduce((acc, v) => acc + v, 0) / validas.length).toFixed(2);
    }, [notasPeriodo]);

    const cambiarCiclo = (nuevoCicloId: string) => {
        router.get(`/inclusion/${legajo.id}`, { ciclo_id: nuevoCicloId }, { preserveState: true });
    };

    const guardarInicial = () => {
        if (!cicloSeleccionado) return;
        setGuardando(true);
        router.post(
            `/inclusion/${legajo.id}/informe-inicial`,
            {
                ciclo_lectivo_id: cicloSeleccionado.id,
                escuela_especial: escuelaEspecial,
                vinculo_adaptacion: vinculoAdaptacion,
                fortalezas_estilo: fortalezasEstilo,
                saberes_previos: saberesPrevios,
            },
            {
                preserveScroll: true,
                onFinish: () => setGuardando(false),
            }
        );
    };

    const guardarPpi = () => {
        if (!cicloSeleccionado) return;
        setGuardando(true);
        router.post(
            `/inclusion/${legajo.id}/ppi`,
            {
                ciclo_lectivo_id: cicloSeleccionado.id,
                barreras_contexto: barrerasContexto,
                configuraciones_apoyo: configuracionesApoyo,
                materias: materias.map((mat) => ({
                    materia_id: mat.id,
                    contenidos_priorizados: ppiMaterias[mat.id]?.contenidos_priorizados ?? '',
                    ajustes_evaluacion: ppiMaterias[mat.id]?.ajustes_evaluacion ?? '',
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setGuardando(false),
            }
        );
    };

    const guardarPeriodo = () => {
        if (!cicloSeleccionado) return;
        setGuardando(true);
        router.post(
            `/inclusion/${legajo.id}/informe-periodo`,
            {
                ciclo_lectivo_id: cicloSeleccionado.id,
                periodo: periodoSeleccionado,
                inasistencias: Number(inasistencias ?? 0),
                sintesis_periodo: sintesisPeriodo,
                materias: materias.map((mat) => ({
                    materia_id: mat.id,
                    nota_numerica: notasPeriodo[mat.id]?.nota_numerica ?? null,
                    contenidos_alcanzados: notasPeriodo[mat.id]?.contenidos_alcanzados ?? '',
                    dificultades_sugerencias: notasPeriodo[mat.id]?.dificultades_sugerencias ?? '',
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setGuardando(false),
            }
        );
    };

    const urlPdf = (tipo: string) =>
        `/inclusion/${legajo.id}/pdf/${tipo}${cicloSeleccionado ? `?ciclo_id=${cicloSeleccionado.id}` : ''}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Legajo Inclusión - ${legajo.alumno.apellido}`} />

            <div className="flex flex-col gap-6 p-6">
                {/* Cabecera del Expediente */}
                <div className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-5 shadow-sm lg:flex-row lg:items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href="/inclusion" className="rounded-full p-1.5 hover:bg-muted">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">
                                    Legajo de Inclusión: {legajo.alumno.apellido}, {legajo.alumno.nombre}
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    DNI: <strong>{legajo.alumno.dni}</strong> &nbsp;|&nbsp; Diagnóstico:{' '}
                                    <strong className="text-primary">{legajo.diagnostico}</strong> &nbsp;|&nbsp; MAI / Apoyo:{' '}
                                    <strong>{legajo.docente_integrador || 'Sin asignar'}</strong>
                                </p>
                            </div>
                        </div>

                        {legajo.grado_actual && (
                            <div className="mt-2 pl-10 flex flex-wrap items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    {legajo.grado_actual.nombre_completo}
                                </span>
                                <span className="text-muted-foreground">
                                    Docente de Grado: <strong>{legajo.grado_actual.docente_titular}</strong>
                                </span>
                                {legajo.archivo_url && (
                                    <a
                                        href={legajo.archivo_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                        <FileText className="h-3.5 w-3.5" /> Ver CUD Adjunto
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Ciclo Lectivo:</label>
                        <select
                            value={cicloSeleccionado?.id ?? ''}
                            onChange={(e) => cambiarCiclo(e.target.value)}
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium"
                        >
                            {ciclos.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.anio} {c.cerrado ? '(Cerrado)' : '(Activo)'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {flash?.success && (
                    <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {/* Pestañas de Documentación Pedagógica */}
                <div className="flex flex-wrap gap-2 border-b pb-3">
                    <button
                        type="button"
                        onClick={() => setTabActiva('inicial')}
                        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                            tabActiva === 'inicial'
                                ? 'bg-primary text-primary-foreground shadow'
                                : 'border bg-card hover:bg-muted'
                        }`}
                    >
                        <ClipboardList className="h-4 w-4" />
                        1. Informe Inicial
                        {informeInicial && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabActiva('ppi')}
                        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                            tabActiva === 'ppi'
                                ? 'bg-primary text-primary-foreground shadow'
                                : 'border bg-card hover:bg-muted'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        2. PPI (Proyecto Pedagógico)
                        {ppi && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabActiva('periodos')}
                        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                            tabActiva === 'periodos'
                                ? 'bg-primary text-primary-foreground shadow'
                                : 'border bg-card hover:bg-muted'
                        }`}
                    >
                        <FileCheck2 className="h-4 w-4" />
                        3. Informes Trimestrales y Final (Notas)
                    </button>
                </div>

                {/* PESTAÑA 1: INFORME INICIAL */}
                {tabActiva === 'inicial' && (
                    <div className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-lg font-bold">Informe Pedagógico Inicial (Principio de Año)</h2>
                                <p className="text-xs text-muted-foreground">
                                    Diagnóstico pedagógico de partida para evaluar el progreso individual del estudiante durante el año.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={urlPdf('inicial')}
                                    className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/20 dark:text-red-300"
                                >
                                    <Download className="h-4 w-4" /> Descargar PDF con Firmas
                                </a>
                                {puedeEditar && (
                                    <button
                                        type="button"
                                        onClick={guardarInicial}
                                        disabled={guardando}
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {guardando ? 'Guardando...' : 'Guardar Informe Inicial'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Escuela Especial Sede / Equipo Interdisciplinario (Opcional)
                            </label>
                            <input
                                type="text"
                                disabled={!puedeEditar}
                                value={escuelaEspecial}
                                onChange={(e) => setEscuelaEspecial(e.target.value)}
                                placeholder="Ej. Escuela Especial N° 7045 / Equipo externo..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                1. Vínculo, Adaptación y Autonomía en el Aula
                            </label>
                            <textarea
                                disabled={!puedeEditar}
                                value={vinculoAdaptacion}
                                onChange={(e) => setVinculoAdaptacion(e.target.value)}
                                rows={3}
                                placeholder="Relación con sus compañeros y docentes, hábitos de trabajo, tiempos de atención y autonomía..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                2. Fortalezas y Estilo de Aprendizaje
                            </label>
                            <textarea
                                disabled={!puedeEditar}
                                value={fortalezasEstilo}
                                onChange={(e) => setFortalezasEstilo(e.target.value)}
                                rows={3}
                                placeholder="Recursos que favorecen su aprendizaje (apoyo visual, material concreto, consignas breves, trabajo guiado)..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                3. Saberes Previos (Punto de Partida)
                            </label>
                            <textarea
                                disabled={!puedeEditar}
                                value={saberesPrevios}
                                onChange={(e) => setSaberesPrevios(e.target.value)}
                                rows={3}
                                placeholder="Nivel inicial en lectoescritura, comprensión, cálculo y nociones básicas al comenzar el ciclo..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                            />
                        </div>
                    </div>
                )}

                {/* PESTAÑA 2: PPI */}
                {tabActiva === 'ppi' && (
                    <div className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-lg font-bold">Proyecto Pedagógico Individual (PPI)</h2>
                                <p className="text-xs text-muted-foreground">
                                    Barreras detectadas, configuraciones de apoyo y contenidos priorizados por materia.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={urlPdf('ppi')}
                                    className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/20 dark:text-red-300"
                                >
                                    <Download className="h-4 w-4" /> Descargar PDF PPI con Firmas
                                </a>
                                {puedeEditar && (
                                    <button
                                        type="button"
                                        onClick={guardarPpi}
                                        disabled={guardando}
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {guardando ? 'Guardando...' : 'Guardar PPI'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Barreras Pedagógicas y del Contexto
                                </label>
                                <textarea
                                    disabled={!puedeEditar}
                                    value={barrerasContexto}
                                    onChange={(e) => setBarrerasContexto(e.target.value)}
                                    rows={3}
                                    placeholder="Obstáculos didácticos, comunicacionales o de acceso detectados..."
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Configuraciones de Apoyo y Acuerdos
                                </label>
                                <textarea
                                    disabled={!puedeEditar}
                                    value={configuracionesApoyo}
                                    onChange={(e) => setConfiguracionesApoyo(e.target.value)}
                                    rows={3}
                                    placeholder="Estrategias conjuntas entre Docente de Grado y MAI, materiales adaptados..."
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[180px]">Materia / Área</th>
                                        <th className="px-4 py-3 min-w-[280px]">Contenidos y Objetivos Priorizados</th>
                                        <th className="px-4 py-3 min-w-[280px]">Ajustes Razonables y Criterios de Evaluación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {materias.map((mat) => (
                                        <tr key={mat.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-semibold align-top">
                                                {mat.nombre}
                                                {mat.es_especial && (
                                                    <div className="text-[11px] font-normal text-blue-600 dark:text-blue-400">
                                                        (Área especial)
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <textarea
                                                    disabled={!puedeEditar}
                                                    value={ppiMaterias[mat.id]?.contenidos_priorizados ?? ''}
                                                    onChange={(e) =>
                                                        setPpiMaterias((prev) => ({
                                                            ...prev,
                                                            [mat.id]: {
                                                                ...prev[mat.id],
                                                                contenidos_priorizados: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                    rows={2}
                                                    placeholder="Ejes y contenidos priorizados..."
                                                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs disabled:opacity-70"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <textarea
                                                    disabled={!puedeEditar}
                                                    value={ppiMaterias[mat.id]?.ajustes_evaluacion ?? ''}
                                                    onChange={(e) =>
                                                        setPpiMaterias((prev) => ({
                                                            ...prev,
                                                            [mat.id]: {
                                                                ...prev[mat.id],
                                                                ajustes_evaluacion: e.target.value,
                                                            },
                                                        }))
                                                    }
                                                    rows={2}
                                                    placeholder="Adaptaciones metodológicas y criterios de evaluación..."
                                                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs disabled:opacity-70"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PESTAÑA 3: INFORMES TRIMESTRALES Y FINAL */}
                {tabActiva === 'periodos' && (
                    <div className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex flex-col justify-between gap-3 border-b pb-4 lg:flex-row lg:items-center">
                            <div>
                                <h2 className="text-lg font-bold">Informes Trimestrales y Evaluación Final</h2>
                                <p className="text-xs text-muted-foreground">
                                    Calificaciones (1 a 10 o vacío si no asistió) y logros alcanzados en base al PPI.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={urlPdf(periodoSeleccionado)}
                                    className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/20 dark:text-red-300"
                                >
                                    <Download className="h-4 w-4" /> Descargar PDF con Notas y Firmas
                                </a>
                                {puedeEditar && (
                                    <button
                                        type="button"
                                        onClick={guardarPeriodo}
                                        disabled={guardando}
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {guardando ? 'Guardando...' : 'Guardar Informe y Notas'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Selector de Período y Resumen de Inasistencias/Promedio */}
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-muted/30 p-3.5">
                            <div className="flex flex-wrap gap-1.5">
                                {PERIODOS.map((p) => {
                                    const cargado = Boolean(informesPeriodos?.[p.key]);
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => setPeriodoSeleccionado(p.key)}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                                periodoSeleccionado === p.key
                                                    ? 'bg-primary text-primary-foreground shadow'
                                                    : 'border bg-background hover:bg-muted'
                                            }`}
                                        >
                                            {p.label}
                                            {cargado && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <label className="font-medium text-muted-foreground">Inasistencias:</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={!puedeEditar}
                                        value={inasistencias}
                                        onChange={(e) => setInasistencias(e.target.value === '' ? 0 : Number(e.target.value))}
                                        className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center font-semibold disabled:opacity-70"
                                    />
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Promedio PPI: </span>
                                    <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-700 dark:text-emerald-300">
                                        {promedioPeriodo ?? '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tabla por Materia */}
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[170px]">Materia / Área</th>
                                        <th className="px-3 py-3 text-center min-w-[100px]">Nota (1 a 10)</th>
                                        <th className="px-4 py-3 min-w-[260px]">Contenidos Alcanzados (según PPI)</th>
                                        <th className="px-4 py-3 min-w-[260px]">Dificultades / Sugerencias</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {materias.map((mat) => {
                                        const val = notasPeriodo[mat.id]?.nota_numerica ?? null;
                                        const esDesaprobada = val !== null && val < 6;

                                        return (
                                            <tr key={mat.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-semibold align-top">
                                                    {mat.nombre}
                                                </td>
                                                <td className="px-3 py-2.5 text-center align-top">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="1"
                                                        max="10"
                                                        disabled={!puedeEditar}
                                                        value={val ?? ''}
                                                        onKeyDown={(e) => {
                                                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        onChange={(e) => handleNotaChange(mat.id, e.target.value)}
                                                        placeholder="-"
                                                        title="Nota de 1 a 10 (dejar vacío si no asistió)"
                                                        className={`w-16 rounded-md border px-2 py-1 text-center text-sm font-semibold disabled:opacity-70 ${
                                                            esDesaprobada
                                                                ? 'border-red-400 bg-red-500/10 text-red-700 dark:text-red-300'
                                                                : 'border-input bg-background'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <textarea
                                                        disabled={!puedeEditar}
                                                        value={notasPeriodo[mat.id]?.contenidos_alcanzados ?? ''}
                                                        onChange={(e) =>
                                                            setNotasPeriodo((prev) => ({
                                                                ...prev,
                                                                [mat.id]: {
                                                                    ...prev[mat.id],
                                                                    contenidos_alcanzados: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                        rows={2}
                                                        placeholder="Logros y contenidos alcanzados en base a su PPI..."
                                                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs disabled:opacity-70"
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <textarea
                                                        disabled={!puedeEditar}
                                                        value={notasPeriodo[mat.id]?.dificultades_sugerencias ?? ''}
                                                        onChange={(e) =>
                                                            setNotasPeriodo((prev) => ({
                                                                ...prev,
                                                                [mat.id]: {
                                                                    ...prev[mat.id],
                                                                    dificultades_sugerencias: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                        rows={2}
                                                        placeholder="Dificultades observadas o apoyos sugeridos..."
                                                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs disabled:opacity-70"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Síntesis Pedagógica General del Período
                            </label>
                            <textarea
                                disabled={!puedeEditar}
                                value={sintesisPeriodo}
                                onChange={(e) => setSintesisPeriodo(e.target.value)}
                                rows={3}
                                placeholder="Valoración integral del desempeño del estudiante durante este período..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                            />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}