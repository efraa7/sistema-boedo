import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Bot,
    CheckCircle2,
    FileSpreadsheet,
    Loader2,
    MessageSquare,
    Save,
    Send,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface Materia {
    id: number;
    codigo: string;
    nombre: string;
    es_especial: boolean;
}

interface NotaMateria {
    id?: number;
    materia_id: number;
    nota_numerica: number | string | null;
}

interface Calificacion {
    id: number;
    alumno_id: number;
    alumno: { apellido: string; nombre: string; dni: string };
    inasistencias_total: number | string;
    sintesis_pedagogica_ia: string | null;
    notas_materias: NotaMateria[];
}

interface Cuaderno {
    id: number;
    periodo: string;
    estado: 'borrador' | 'enviado_vicedireccion' | 'visado_observado' | 'aprobado';
    observaciones_vicedireccion: string | null;
    sintesis_general: string | null;
    docente: { name: string; apellido: string };
    grado: { nombre_completo: string };
    ciclo_lectivo: { anio: number };
    calificaciones: Calificacion[];
}

const PERIODO_LABELS: Record<string, string> = {
    '1_trimestre': '1° Trimestre',
    '2_trimestre': '2° Trimestre',
    '3_trimestre': '3° Trimestre',
    informe_final: 'Informe Anual',
};

export default function CuadernoShow({
    cuaderno,
    materias,
}: {
    cuaderno: Cuaderno;
    materias: Materia[];
}) {
    const { can } = useAuth();

    const [notas, setNotas] = useState<Calificacion[]>(cuaderno.calificaciones || []);
    const [sintesisGeneral, setSintesisGeneral] = useState<string>(cuaderno.sintesis_general ?? '');
    const [guardando, setGuardando] = useState(false);
    const [showConfirmEnviar, setShowConfirmEnviar] = useState(false);

    const [cargandoIaAlumno, setCargandoIaAlumno] = useState<number | null>(null);
    const [cargandoIaGeneral, setCargandoIaGeneral] = useState(false);
    const [errorIa, setErrorIa] = useState<string | null>(null);

    const formVisado = useForm({
        estado: '',
        observaciones_vicedireccion: cuaderno.observaciones_vicedireccion ?? '',
        sintesis_general: cuaderno.sintesis_general ?? '',
    });

    const isDirectivo = can('visar cuadernos');
    const isEditablePorDocente =
        !isDirectivo && (cuaderno.estado === 'borrador' || cuaderno.estado === 'visado_observado');
    const isEnRevisionVicedireccion = isDirectivo && cuaderno.estado === 'enviado_vicedireccion';

    const getCsrfToken = () =>
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

    const actualizarNotaEnEstado = (
        alumnoIndex: number,
        materiaId: number,
        valorNumerico: number | null
    ) => {
        const nuevasNotas = [...notas];
        const fila = { ...nuevasNotas[alumnoIndex] };

        const existe = fila.notas_materias.some((nm) => nm.materia_id === materiaId);
        if (existe) {
            fila.notas_materias = fila.notas_materias.map((nm) =>
                nm.materia_id === materiaId ? { ...nm, nota_numerica: valorNumerico } : nm
            );
        } else {
            fila.notas_materias = [...fila.notas_materias, { materia_id: materiaId, nota_numerica: valorNumerico }];
        }

        nuevasNotas[alumnoIndex] = fila;
        setNotas(nuevasNotas);
    };

    const handleNotaMateriaChange = (alumnoIndex: number, materiaId: number, valor: string) => {
        // Si el campo queda vacío (alumno ausente / sin nota), se guarda null sin agregar nada
        if (valor === '') {
            actualizarNotaEnEstado(alumnoIndex, materiaId, null);
            return;
        }

        const numero = Number(valor);

        // Solo permitir calificaciones estrictamente entre 1 y 10
        if (Number.isNaN(numero) || numero < 1 || numero > 10) {
            return;
        }

        actualizarNotaEnEstado(alumnoIndex, materiaId, numero);
    };

    const handleNotaMateriaBlur = (
        alumnoIndex: number,
        materiaId: number,
        valorActual: number | string | null | undefined
    ) => {
        if (valorActual === '' || valorActual === null || valorActual === undefined) {
            return;
        }

        const numero = Number(valorActual);
        if (Number.isNaN(numero) || numero < 1 || numero > 10) {
            actualizarNotaEnEstado(alumnoIndex, materiaId, null);
        }
    };

    const handleCampoFilaChange = (alumnoIndex: number, campo: 'inasistencias_total' | 'sintesis_pedagogica_ia', valor: any) => {
        const nuevasNotas = [...notas];
        nuevasNotas[alumnoIndex] = { ...nuevasNotas[alumnoIndex], [campo]: valor };
        setNotas(nuevasNotas);
    };

    const calcularPromedioAlumno = (fila: Calificacion): number | null => {
        const validas = fila.notas_materias
            .map((nm) => (nm.nota_numerica === null || nm.nota_numerica === '' ? null : Number(nm.nota_numerica)))
            .filter((n): n is number => n !== null && !Number.isNaN(n) && n >= 1 && n <= 10);

        if (validas.length === 0) return null;
        const suma = validas.reduce((acc, val) => acc + val, 0);
        return Math.round((suma / validas.length) * 100) / 100;
    };

    const corregirObservacionAlumno = async (index: number) => {
        const fila = notas[index];
        const textoActual = (fila.sintesis_pedagogica_ia ?? '').trim();

        if (!textoActual) {
            setErrorIa(`Escribí primero un borrador de observación para ${fila.alumno.apellido}, ${fila.alumno.nombre}.`);
            return;
        }

        setErrorIa(null);
        setCargandoIaAlumno(fila.id);

        try {
            const resp = await fetch(`/cuadernos/${cuaderno.id}/ia/corregir-observacion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    alumno_nombre: `${fila.alumno.nombre} ${fila.alumno.apellido}`,
                    texto: textoActual,
                }),
            });

            const json = await resp.json();
            if (!resp.ok) {
                setErrorIa(json.message ?? 'No se pudo corregir el texto con IA.');
            } else if (json.texto_corregido) {
                handleCampoFilaChange(index, 'sintesis_pedagogica_ia', json.texto_corregido);
            }
        } catch {
            setErrorIa('Error de red al intentar conectar con el asistente de IA.');
        } finally {
            setCargandoIaAlumno(null);
        }
    };

    const generarSintesisGeneral = async () => {
        setErrorIa(null);
        setCargandoIaGeneral(true);

        const resumenAlumnos = notas.map((fila) => {
            const prom = calcularPromedioAlumno(fila);
            return {
                alumno: `${fila.alumno.apellido}, ${fila.alumno.nombre}`,
                promedio: prom !== null ? prom.toFixed(2) : 'Sin notas',
                inasistencias: fila.inasistencias_total ?? 0,
                observacion: fila.sintesis_pedagogica_ia ?? '',
            };
        });

        try {
            const resp = await fetch(`/cuadernos/${cuaderno.id}/ia/sintesis-general`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ resumen_alumnos: resumenAlumnos }),
            });

            const json = await resp.json();
            if (!resp.ok) {
                setErrorIa(json.message ?? 'No se pudo generar la síntesis general.');
            } else if (json.sintesis_general) {
                setSintesisGeneral(json.sintesis_general);
            }
        } catch {
            setErrorIa('Error de red al intentar generar la síntesis con IA.');
        } finally {
            setCargandoIaGeneral(false);
        }
    };

    const construirPayloadCalificaciones = () =>
        notas.map((fila) => ({
            id: fila.id,
            inasistencias_total: Number(fila.inasistencias_total ?? 0),
            sintesis_pedagogica_ia: fila.sintesis_pedagogica_ia ?? '',
            notas_materias: materias.map((mat) => {
                const encontrada = fila.notas_materias.find((nm) => nm.materia_id === mat.id);
                const num =
                    encontrada && encontrada.nota_numerica !== '' && encontrada.nota_numerica !== null
                        ? Number(encontrada.nota_numerica)
                        : null;

                return {
                    materia_id: mat.id,
                    nota_numerica: num !== null && num >= 1 && num <= 10 ? num : null,
                };
            }),
        }));

    const guardarBorrador = () => {
        setGuardando(true);
        router.post(
            `/cuadernos/${cuaderno.id}/calificaciones`,
            {
                sintesis_general: sintesisGeneral,
                calificaciones: construirPayloadCalificaciones() as any,
            },
            {
                preserveScroll: true,
                onFinish: () => setGuardando(false),
            }
        );
    };

    const abrirConfirmacionEnvio = () => {
        setShowConfirmEnviar(true);
    };

    const confirmarEnvioAVisado = () => {
        setGuardando(true);
        router.post(
            `/cuadernos/${cuaderno.id}/calificaciones`,
            {
                sintesis_general: sintesisGeneral,
                calificaciones: construirPayloadCalificaciones() as any,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowConfirmEnviar(false);
                    router.post(`/cuadernos/${cuaderno.id}/enviar`);
                },
                onError: () => {
                    setShowConfirmEnviar(false);
                    setGuardando(false);
                },
            }
        );
    };

    const procesarVisado = (nuevoEstado: 'visado_observado' | 'aprobado') => {
        router.post(`/cuadernos/${cuaderno.id}/visar`, {
            estado: nuevoEstado,
            observaciones_vicedireccion: formVisado.data.observaciones_vicedireccion,
            sintesis_general: formVisado.data.sintesis_general,
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Cuadernos', href: '/cuadernos' },
                { title: 'Planilla de Calificaciones', href: `/cuadernos/${cuaderno.id}` },
            ]}
        >
            <Head title={`Planilla - ${cuaderno.grado.nombre_completo}`} />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-5 shadow-sm lg:flex-row lg:items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href="/cuadernos" className="rounded-full p-1.5 hover:bg-muted">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-xl font-bold tracking-tight">{cuaderno.grado.nombre_completo}</h1>
                        </div>
                        <p className="mt-1 pl-10 text-sm text-muted-foreground">
                            Docente: <strong>{cuaderno.docente.apellido}, {cuaderno.docente.name}</strong> &nbsp;|&nbsp;
                            Período: <strong>{PERIODO_LABELS[cuaderno.periodo] ?? cuaderno.periodo}</strong> &nbsp;|&nbsp;
                            Ciclo: <strong>{cuaderno.ciclo_lectivo.anio}</strong>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                            Estado: {cuaderno.estado.replace('_', ' ')}
                        </span>

                        {cuaderno.estado === 'aprobado' && (
                            <a
                                href={`/cuadernos/${cuaderno.id}/exportar-excel`}
                                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
                            >
                                <FileSpreadsheet className="h-4 w-4" /> Descargar Excel
                            </a>
                        )}

                        {isEditablePorDocente && (
                            <>
                                <button
                                    type="button"
                                    onClick={guardarBorrador}
                                    disabled={guardando}
                                    className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" /> {guardando ? 'Guardando...' : 'Guardar Borrador'}
                                </button>
                                <button
                                    type="button"
                                    onClick={abrirConfirmacionEnvio}
                                    disabled={guardando}
                                    className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-700 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" /> Enviar a Vicedirección
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {errorIa && (
                    <div className="flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                        <span>{errorIa}</span>
                        <button onClick={() => setErrorIa(null)} className="text-xs font-semibold underline">
                            Cerrar
                        </button>
                    </div>
                )}
                {cuaderno.observaciones_vicedireccion && (
                    <div className="rounded-md border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/50">
                        <h3 className="flex items-center gap-2 font-semibold text-orange-800 dark:text-orange-200">
                            <MessageSquare className="h-5 w-5" /> Observaciones de Vicedirección para corregir
                        </h3>
                        <p className="mt-1.5 text-sm text-orange-900 dark:text-orange-100">
                            {cuaderno.observaciones_vicedireccion}
                        </p>
                    </div>
                )}
                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="sticky left-0 z-10 bg-muted px-4 py-3 min-w-[210px]">
                                    Estudiante / DNI
                                </th>
                                {materias.map((mat) => (
                                    <th key={mat.id} className="px-2.5 py-3 text-center min-w-[95px]">
                                        <div>{mat.nombre}</div>
                                        {mat.es_especial && (
                                            <span className="text-[10px] font-normal lowercase text-blue-600 dark:text-blue-400">
                                                (especial)
                                            </span>
                                        )}
                                    </th>
                                ))}
                                <th className="px-3 py-3 text-center min-w-[85px]">Promedio</th>
                                <th className="px-3 py-3 text-center min-w-[95px]">Inasist.</th>
                                <th className="px-4 py-3 min-w-[320px]">
                                    Observaciones Individuales (y Corrección IA)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {notas.length === 0 ? (
                                <tr>
                                    <td colSpan={materias.length + 4} className="p-6 text-center text-muted-foreground">
                                        No hay alumnos matriculados en este grado para el ciclo lectivo seleccionado.
                                    </td>
                                </tr>
                            ) : (
                                notas.map((fila, index) => {
                                    const promedio = calcularPromedioAlumno(fila);
                                    const notasMap = new Map(
                                        fila.notas_materias.map((nm) => [nm.materia_id, nm.nota_numerica])
                                    );

                                    return (
                                        <tr key={fila.id} className="hover:bg-muted/30">
                                            <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                                                <div className="font-semibold">
                                                    {fila.alumno.apellido}, {fila.alumno.nombre}
                                                </div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    DNI: {fila.alumno.dni}
                                                </div>
                                            </td>

                                            {materias.map((mat) => {
                                                const val = notasMap.get(mat.id);
                                                const esDesaprobada = val !== null && val !== undefined && val !== '' && Number(val) < 6;

                                                return (
                                                    <td key={mat.id} className="px-2 py-2.5 text-center">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="1"
                                                            max="10"
                                                            disabled={!isEditablePorDocente}
                                                            value={val ?? ''}
                                                            onKeyDown={(e) => {
                                                                if (['-', '+', 'e', 'E'].includes(e.key)) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            onChange={(e) =>
                                                                handleNotaMateriaChange(index, mat.id, e.target.value)
                                                            }
                                                            onBlur={() => handleNotaMateriaBlur(index, mat.id, val)}
                                                            placeholder="-"
                                                            title="Nota de 1 a 10 (dejar vacío si no asistió)"
                                                            className={`w-16 rounded-md border px-2 py-1 text-center text-sm font-medium disabled:opacity-60 ${
                                                                esDesaprobada
                                                                    ? 'border-red-400 bg-red-500/10 text-red-700 dark:text-red-300'
                                                                    : 'border-input bg-background'
                                                            }`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2.5 text-center">
                                                {promedio !== null ? (
                                                    <span
                                                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                                                            promedio < 6
                                                                ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                                                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        {promedio.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    disabled={!isEditablePorDocente}
                                                    value={fila.inasistencias_total ?? 0}
                                                    onChange={(e) =>
                                                        handleCampoFilaChange(
                                                            index,
                                                            'inasistencias_total',
                                                            e.target.value === '' ? 0 : Number(e.target.value)
                                                        )
                                                    }
                                                    className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-sm disabled:opacity-60"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-start gap-2">
                                                    <textarea
                                                        disabled={!isEditablePorDocente}
                                                        value={fila.sintesis_pedagogica_ia ?? ''}
                                                        onChange={(e) =>
                                                            handleCampoFilaChange(
                                                                index,
                                                                'sintesis_pedagogica_ia',
                                                                e.target.value
                                                            )
                                                        }
                                                        rows={2}
                                                        placeholder="Observación sobre materias o desempeño..."
                                                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
                                                    />
                                                    {isEditablePorDocente && (
                                                        <button
                                                            type="button"
                                                            onClick={() => corregirObservacionAlumno(index)}
                                                            disabled={cargandoIaAlumno === fila.id}
                                                            title="Corregir ortografía y redacción con IA"
                                                            className="shrink-0 rounded-md border border-primary/40 bg-primary/10 p-2 text-primary transition hover:bg-primary/20 disabled:opacity-50"
                                                        >
                                                            {cargandoIaAlumno === fila.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Bot className="h-4 w-4" />
                                                            )}
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
                </div>
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-base font-bold">Síntesis Pedagógica General del Grado</h2>
                            <p className="text-xs text-muted-foreground">
                                Resumen global del rendimiento y asistencia del curso para presentar a Vicedirección y Dirección.
                            </p>
                        </div>

                        {isEditablePorDocente && (
                            <button
                                type="button"
                                onClick={generarSintesisGeneral}
                                disabled={cargandoIaGeneral || notas.length === 0}
                                className="inline-flex items-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-500/20 disabled:opacity-50 dark:text-purple-300"
                            >
                                {cargandoIaGeneral ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                {cargandoIaGeneral ? 'Generando síntesis...' : 'Generar Síntesis General con IA'}
                            </button>
                        )}
                    </div>

                    {isEnRevisionVicedireccion ? (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                Como Vicedirector/a, podés editar o complementar esta síntesis general antes de aprobar la planilla:
                            </p>
                            <textarea
                                value={formVisado.data.sintesis_general}
                                onChange={(e) => formVisado.setData('sintesis_general', e.target.value)}
                                rows={4}
                                placeholder="Síntesis general del grado..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                    ) : (
                        <textarea
                            disabled={!isEditablePorDocente}
                            value={sintesisGeneral}
                            onChange={(e) => setSintesisGeneral(e.target.value)}
                            rows={4}
                            placeholder="Generá la síntesis general con IA o redactala manualmente aquí. Luego podés modificarla antes de enviarla a Vicedirección..."
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                        />
                    )}
                </div>
                {isEnRevisionVicedireccion && (
                    <div className="rounded-lg border-2 border-primary bg-slate-50 p-6 dark:bg-slate-900">
                        <h2 className="text-lg font-bold">Panel de Revisión y Visado — Vicedirección</h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Verificá las calificaciones y la síntesis general. Podés aprobar la planilla (habilitando el envío a Dirección y la descarga en Excel) o devolverla al docente con observaciones.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Observaciones para el Docente (obligatorio solo si devolvés la planilla)
                                </label>
                                <textarea
                                    value={formVisado.data.observaciones_vicedireccion}
                                    onChange={(e) =>
                                        formVisado.setData('observaciones_vicedireccion', e.target.value)
                                    }
                                    rows={3}
                                    placeholder="Indicá aquí si falta completar notas, corregir observaciones o revisar algún dato..."
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {formVisado.errors.observaciones_vicedireccion && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {formVisado.errors.observaciones_vicedireccion}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => procesarVisado('visado_observado')}
                                    disabled={formVisado.processing}
                                    className="inline-flex items-center gap-2 rounded-md border border-orange-500 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 dark:bg-transparent dark:text-orange-300"
                                >
                                    <AlertCircle className="h-4 w-4" /> Devolver con Observaciones
                                </button>
                                <button
                                    type="button"
                                    onClick={() => procesarVisado('aprobado')}
                                    disabled={formVisado.processing}
                                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Visar y Aprobar Planilla
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {showConfirmEnviar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    <Send className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Enviar Planilla a Vicedirección</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Se guardarán todas las calificaciones, inasistencias, observaciones y la síntesis general del grado. Una vez enviada, <strong>no podrás editarla</strong> a menos que Vicedirección la devuelva con observaciones.
                                    </p>
                                </div>
                            </div>

                            {(() => {
                                const totalCeldas = notas.length * materias.length;
                                const celdasCompletas = notas.reduce(
                                    (acc, f) =>
                                        acc +
                                        f.notas_materias.filter(
                                            (nm) => nm.nota_numerica !== null && nm.nota_numerica !== ''
                                        ).length,
                                    0
                                );
                                const faltantes = totalCeldas - celdasCompletas;

                                return faltantes > 0 ? (
                                    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                                        <strong>Nota:</strong> Quedan <strong>{faltantes}</strong> calificaciones sin completar en la grilla. Podés enviarla igual si corresponde, o cancelar para completarlas.
                                    </div>
                                ) : null;
                            })()}

                            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmEnviar(false)}
                                    disabled={guardando}
                                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmarEnvioAVisado}
                                    disabled={guardando}
                                    className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-700 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                    {guardando ? 'Enviando...' : 'Confirmar y Enviar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}