<?php

namespace App\Http\Controllers;

use App\Models\Calificacion;
use App\Models\CalificacionMateria;
use App\Models\CicloLectivo;
use App\Models\CuadernoAuxiliar;
use App\Models\Grado;
use App\Models\LegajoInclusion;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CuadernoAuxiliarController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar cuadernos'), only: ['index', 'show', 'exportarExcel', 'exportarMultiplesExcel']),
            new Middleware(PermissionMiddleware::using('crear cuadernos'), only: ['store', 'guardarCalificaciones', 'enviarAVisado', 'corregirObservacionIa', 'generarSintesisGeneralIa']),
            new Middleware(PermissionMiddleware::using('visar cuadernos'), only: ['visar']),
        ];
    }

    /**
     * Aplica el filtro de visibilidad según el rol del usuario autenticado.
     */
    private function aplicarFiltroPorRol(Builder $query, User $user): Builder
    {
        if ($user->hasRole('super-admin')) {
            return $query;
        }

        if ($user->hasRole('director')) {
            return $query->where('cuadernos_auxiliares.estado', 'aprobado');
        }

        if ($user->hasRole('vicedirector')) {
            $docentesACargo = User::where('vicedirector_id', $user->id)->pluck('id');

            return $query->whereIn('cuadernos_auxiliares.docente_id', $docentesACargo)
                ->where('cuadernos_auxiliares.estado', '!=', 'borrador');
        }

        if ($user->hasRole('docente')) {
            return $query->where('cuadernos_auxiliares.docente_id', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = Auth::user();
        $ciclos = CicloLectivo::orderByDesc('anio')->get();
        $cicloActivo = $ciclos->firstWhere('cerrado', false) ?? $ciclos->first();

        $cicloIdSeleccionado = $request->filled('ciclo_id')
            ? (string) $request->input('ciclo_id')
            : ($cicloActivo?->id ? (string) $cicloActivo->id : '');

        $periodoFiltro = $request->filled('periodo')
            ? (string) $request->input('periodo')
            : '';

        $gradoFiltro = $request->filled('grado_id')
            ? (string) $request->input('grado_id')
            : '';

        $buscarFiltro = $request->filled('buscar')
            ? trim((string) $request->input('buscar'))
            : '';

        $ordenFiltro = $request->filled('orden')
            ? (string) $request->input('orden')
            : 'grado_asc';

        $query = $this->aplicarFiltroPorRol(
            CuadernoAuxiliar::query()
                ->leftJoin('grados', 'cuadernos_auxiliares.grado_id', '=', 'grados.id')
                ->select('cuadernos_auxiliares.*')
                ->with(['docente', 'grado', 'cicloLectivo']),
            $user
        );

        if ($cicloIdSeleccionado !== '' && $cicloIdSeleccionado !== 'todos') {
            $query->where('cuadernos_auxiliares.ciclo_lectivo_id', (int) $cicloIdSeleccionado);
        }

        if ($periodoFiltro !== '') {
            $query->where('cuadernos_auxiliares.periodo', $periodoFiltro);
        }

        if ($gradoFiltro !== '') {
            $query->where('cuadernos_auxiliares.grado_id', (int) $gradoFiltro);
        }

        if ($buscarFiltro !== '') {
            $query->where(function (Builder $q) use ($buscarFiltro) {
                // Ej: "3° B", "3 B", "3ro A", "3b"
                if (preg_match('/^\s*(\d+)\s*(?:°|º|ro|do|to|mo)?\s*([a-zA-Z])\s*$/iu', $buscarFiltro, $m)) {
                    $q->where('grados.numero', (int) $m[1])
                        ->where('grados.division', 'like', '%' . mb_strtoupper($m[2]) . '%');
                    return;
                }

                // Ej: "3", "3°", "3ro", "1ro", "2do"
                if (preg_match('/^\s*(\d+)\s*(?:°|º|ro|do|to|mo)?\s*$/iu', $buscarFiltro, $m)) {
                    $q->where('grados.numero', (int) $m[1]);
                    return;
                }

                // Ej: "A", "B", "Tarde", "Mañana" o apellido/nombre del docente
                $like = '%' . $buscarFiltro . '%';
                $q->where('grados.division', 'like',$like)
                    ->orWhere('grados.turno', 'like', $like)
                    ->orWhereRaw("CONCAT(grados.numero, '° ', grados.division) LIKE ?", [$like])
                    ->orWhereRaw("CONCAT(grados.numero, ' ', grados.division) LIKE ?", [$like])
                    ->orWhereHas('docente', function (Builder $docQuery) use ($like) {
                        $docQuery->where('apellido', 'like',$like)
                            ->orWhere('name', 'like', $like);
                    });
            });
        }

        match ($ordenFiltro) {
            'grado_desc' => $query->orderByDesc('grados.numero')->orderByDesc('grados.division'),
            'division_asc' => $query->orderBy('grados.division')->orderBy('grados.numero'),
            'division_desc' => $query->orderByDesc('grados.division')->orderBy('grados.numero'),
            default => $query->orderBy('grados.numero')->orderBy('grados.division'),
        };

        $cuadernos =$query
            ->orderByDesc('cuadernos_auxiliares.created_at')
            ->paginate(10)
            ->withQueryString();

        // Hojas disponibles para el modal de exportación según el rol y el ciclo seleccionado
        $cuadernosDisponiblesQuery =$this->aplicarFiltroPorRol(
            CuadernoAuxiliar::with(['docente', 'grado', 'cicloLectivo']),
            $user
        );

        if ($cicloIdSeleccionado !== '' &&$cicloIdSeleccionado !== 'todos') {
            $cuadernosDisponiblesQuery->where('cuadernos_auxiliares.ciclo_lectivo_id', (int)$cicloIdSeleccionado);
        }

        $cuadernosDisponibles =$cuadernosDisponiblesQuery
            ->get()
            ->sortBy([
                fn ($c) =>$c->grado?->numero ?? 99,
                fn ($c) =>$c->grado?->division ?? '',
                fn ($c) => match ($c->periodo) {
                    '1_trimestre' => 1,
                    '2_trimestre' => 2,
                    '3_trimestre' => 3,
                    'informe_final' => 4,
                    default => 5,
                },
            ])
            ->values();

        $gradosFiltroQuery = Grado::with('cicloLectivo')
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno');

        if ($cicloIdSeleccionado !== '' &&$cicloIdSeleccionado !== 'todos') {
            $gradosFiltroQuery->where('ciclo_lectivo_id', (int)$cicloIdSeleccionado);
        }

        if ($user->hasRole('vicedirector') && !$user->hasAnyRole(['super-admin', 'director'])) {
            $docentesACargo = User::where('vicedirector_id',$user->id)->pluck('id');
            $gradosFiltroQuery->whereIn('docente_titular_id',$docentesACargo);
        } elseif ($user->hasRole('docente') && !$user->hasAnyRole(['super-admin', 'director', 'vicedirector'])) {
            $gradosFiltroQuery->where('docente_titular_id',$user->id);
        }

        // Grados disponibles para CREAR una nueva hoja (solo ciclo activo y grado habilitado según rol)
        $gradosCrearQuery = Grado::where('estado', true)
            ->when($cicloActivo, fn ($q) => $q->where('ciclo_lectivo_id',$cicloActivo->id))
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno');

        if ($user->hasRole('vicedirector') && !$user->hasAnyRole(['super-admin', 'director'])) {
            $docentesACargo = User::where('vicedirector_id',$user->id)->pluck('id');
            $gradosCrearQuery->whereIn('docente_titular_id',$docentesACargo);
        } elseif ($user->hasRole('docente') && !$user->hasAnyRole(['super-admin', 'director', 'vicedirector'])) {
            $gradosCrearQuery->where('docente_titular_id',$user->id);
        }

        return Inertia::render('cuadernos/index', [
            'cuadernos' => $cuadernos,
            'cuadernosDisponibles' => $cuadernosDisponibles,
            'ciclos' => $ciclos,
            'cicloActivo' => $cicloActivo,
            'gradosFiltro' => $gradosFiltroQuery->get(),
            'gradosCrear' => $gradosCrearQuery->get(),
            'filtros' => [
                'ciclo_id' => $cicloIdSeleccionado,
                'periodo' => $periodoFiltro,
                'grado_id' => $gradoFiltro,
                'buscar' => $buscarFiltro,
                'orden' => $ordenFiltro,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $cicloActivo = CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first();

        if (! $cicloActivo) {
            return redirect()->back()->withErrors(['ciclo_lectivo_id' => 'No hay ningún ciclo lectivo activo configurado.']);
        }

        $request->validate([
            'ciclo_lectivo_id' => ['required', 'in:' . $cicloActivo->id],
            'grado_id' => ['required', 'exists:grados,id'],
            'periodo' => ['required', 'in:1_trimestre,2_trimestre,3_trimestre,informe_final'],
        ], [
            'ciclo_lectivo_id.in' => 'Solo se pueden crear planillas en el ciclo lectivo activo.',
        ]);

        $grado = Grado::with([
            'materias' => fn ($q) =>$q->where('estado', true)->orderBy('es_especial')->orderBy('nombre'),
            'matriculas' => fn ($q) => $q->where('ciclo_lectivo_id',$cicloActivo->id),
        ])->findOrFail($request->grado_id);

        if (Auth::user()->hasRole('docente') && (int) $grado->docente_titular_id !== (int) Auth::id()) {
            abort(403, 'Solo podés crear planillas para el grado del cual sos docente titular.');
        }

        if ($grado->materias->isEmpty()) {
            return redirect()->back()->withErrors(['grado_id' => 'Este grado no tiene materias activas asignadas.']);
        }

        $existente = CuadernoAuxiliar::where('grado_id',$grado->id)
            ->where('ciclo_lectivo_id', $cicloActivo->id)
            ->where('periodo', $request->periodo)
            ->first();

        if ($existente) {
            return redirect()->route('cuadernos.show', $existente->id)
                ->with('success', 'Ya existía una planilla para este grado y período; se abrió la existente.');
        }

        $alumnosInclusionIds = LegajoInclusion::pluck('alumno_id')
            ->map(fn ($id) => (int)$id)
            ->all();

        $cuaderno = DB::transaction(function () use ($request, $cicloActivo,$grado, $alumnosInclusionIds) {$nuevo = CuadernoAuxiliar::create([
                'docente_id' => Auth::id(),
                'grado_id' => $grado->id,
                'materia_id' => null,
                'ciclo_lectivo_id' => $cicloActivo->id,
                'periodo' => $request->periodo,
                'estado' => 'borrador',
            ]);

            foreach ($grado->matriculas as$matricula) {
                if (in_array((int) $matricula->alumno_id,$alumnosInclusionIds, true)) {
                    continue;
                }

                $calif = Calificacion::create([
                    'cuaderno_auxiliar_id' => $nuevo->id,
                    'alumno_id' => $matricula->alumno_id,
                    'inasistencias_total' => 0,
                ]);

                foreach ($grado->materias as$materia) {
                    CalificacionMateria::create([
                        'calificacion_id' => $calif->id,
                        'materia_id' => $materia->id,
                        'nota_numerica' => null,
                    ]);
                }
            }

            return $nuevo;
        });

        return redirect()->route('cuadernos.show', $cuaderno->id)
            ->with('success', 'Planilla trimestral creada con todas las materias activas del grado (excluyendo alumnos con legajo de inclusión).');
    }

    public function show($id): Response
    {
        $cuaderno = CuadernoAuxiliar::with([
            'docente',
            'grado.materias' => fn ($q) =>$q->where('estado', true)->orderBy('es_especial')->orderBy('nombre'),
            'cicloLectivo',
            'calificaciones.alumno',
            'calificaciones.notasMaterias',
        ])->findOrFail($id);

        $materiasActivas =$cuaderno->grado->materias;
        $alumnosInclusionIds = LegajoInclusion::pluck('alumno_id')
            ->map(fn ($alumnoId) => (int)$alumnoId)
            ->all();

        if (in_array($cuaderno->estado, ['borrador', 'visado_observado'], true) && ! empty($alumnosInclusionIds)) {
            Calificacion::where('cuaderno_auxiliar_id', $cuaderno->id)
                ->whereIn('alumno_id', $alumnosInclusionIds)
                ->delete();
        }

        $calificacionesFiltradas =$cuaderno->calificaciones
            ->reject(fn ($c) => in_array((int) $c->alumno_id,$alumnosInclusionIds, true));

        foreach ($calificacionesFiltradas as$calif) {
            $existentesIds =$calif->notasMaterias->pluck('materia_id')->all();
            foreach ($materiasActivas as$mat) {
                if (! in_array($mat->id, $existentesIds, true)) {$nuevaNota = CalificacionMateria::create([
                        'calificacion_id' => $calif->id,
                        'materia_id' => $mat->id,
                        'nota_numerica' => null,
                    ]);
                    $calif->notasMaterias->push($nuevaNota);
                }
            }
        }

        $calificacionesOrdenadas =$calificacionesFiltradas
            ->sortBy(fn ($c) => mb_strtolower(($c->alumno->apellido ?? '') . ' ' . ($c->alumno->nombre ?? '')))
            ->values();

        $cuaderno->setRelation('calificaciones',$calificacionesOrdenadas);

        return Inertia::render('cuadernos/show', [
            'cuaderno' => $cuaderno,
            'materias' => $materiasActivas,
        ]);
    }

    public function guardarCalificaciones(Request $request,$id): RedirectResponse
    {
        $cuaderno = CuadernoAuxiliar::findOrFail($id);

        if (! in_array($cuaderno->estado, ['borrador', 'visado_observado'], true)) {
            return redirect()->back()->withErrors(['estado' => 'Esta planilla ya fue enviada y no puede modificarse.']);
        }

        $validated =$request->validate([
            'sintesis_general' => ['nullable', 'string'],
            'calificaciones' => ['required', 'array'],
            'calificaciones.*.id' => ['required', 'exists:calificaciones,id'],
            'calificaciones.*.inasistencias_total' => ['required', 'numeric', 'min:0', 'max:300'],
            'calificaciones.*.sintesis_pedagogica_ia' => ['nullable', 'string'],
            'calificaciones.*.notas_materias' => ['required', 'array'],
            'calificaciones.*.notas_materias.*.materia_id' => ['required', 'exists:materias,id'],
            'calificaciones.*.notas_materias.*.nota_numerica' => ['nullable', 'numeric', 'min:1', 'max:10'],
        ], [
            'calificaciones.*.notas_materias.*.nota_numerica.min' => 'Las calificaciones cargadas deben estar entre 1 y 10 (dejá vacío si el alumno no asistió).',
            'calificaciones.*.notas_materias.*.nota_numerica.max' => 'Las calificaciones no pueden superar 10.',
        ]);

        DB::transaction(function () use ($cuaderno, $validated) {$cuaderno->update([
                'sintesis_general' => $validated['sintesis_general'] ?? null,
            ]);

            foreach ($validated['calificaciones'] as$califData) {
                Calificacion::where('id', $califData['id'])
                    ->where('cuaderno_auxiliar_id', $cuaderno->id)
                    ->update([
                        'inasistencias_total' => $califData['inasistencias_total'],
                        'sintesis_pedagogica_ia' => $califData['sintesis_pedagogica_ia'] ?? null,
                    ]);

                foreach ($califData['notas_materias'] as $notaMat) {
                    $valor = $notaMat['nota_numerica'];
                    CalificacionMateria::updateOrCreate(
                        [
                            'calificacion_id' => $califData['id'],
                            'materia_id' => $notaMat['materia_id'],
                        ],
                        [
                            'nota_numerica' => ($valor === '' || $valor === null) ? null : $valor,
                        ]
                    );
                }
            }
        });

        return redirect()->back()->with('success', 'Planilla y calificaciones guardadas correctamente.');
    }

    public function enviarAVisado($id): RedirectResponse
    {
        $cuaderno = CuadernoAuxiliar::findOrFail($id);$cuaderno->update(['estado' => 'enviado_vicedireccion']);

        return redirect()->back()->with('success', 'Planilla enviada a Vicedirección exitosamente.');
    }

    public function visar(Request $request,$id): RedirectResponse
    {
        $request->validate([
            'estado' => ['required', 'in:visado_observado,aprobado'],
            'observaciones_vicedireccion' => ['nullable', 'required_if:estado,visado_observado', 'string'],
            'sintesis_general' => ['nullable', 'string'],
        ], [
            'observaciones_vicedireccion.required_if' => 'Debés escribir una observación indicando qué debe corregir el docente.',
        ]);

        $cuaderno = CuadernoAuxiliar::findOrFail($id);

        $cuaderno->update([
            'estado' => $request->estado,
            'observaciones_vicedireccion' => $request->estado === 'aprobado'
                ? null
                : $request->observaciones_vicedireccion,
            'sintesis_general' => $request->sintesis_general,
        ]);

        $mensaje =$request->estado === 'aprobado'
            ? 'Planilla visada y aprobada. Ya se encuentra disponible para Dirección y descarga en Excel.'
            : 'Planilla devuelta al docente con observaciones.';

        return redirect()->back()->with('success', $mensaje);
    }

    /**
     * IA 1: Corrige ortografía, puntuación y redacción pedagógica de la observación de un alumno.
     */
    public function corregirObservacionIa(Request $request, $id): JsonResponse
    {
        $request->validate([
            'alumno_nombre' => ['required', 'string', 'max:150'],
            'texto' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $prompt = "Actuá como asesor pedagógico de una escuela primaria en Argentina. "
            . "Corregí los errores de ortografía, puntuación y redacción del siguiente comentario docente sobre el estudiante {$request->alumno_nombre}, "
            . "transformándolo en una observación formal, clara, objetiva y constructiva para su legajo escolar. "
            . "REGLAS ESTRICTAS: No inventes notas, materias ni hechos que no estén en el texto original. "
            . "Devolvé ÚNICAMENTE el texto corregido en un párrafo breve, sin saludos, comillas ni explicaciones.\n\n"
            . "Texto original del docente:\n\"{$request->texto}\"";

        $resultado = $this->consultarGemini($prompt);

        if (! $resultado['ok']) {
            return response()->json(['message' => $resultado['error']], 422);
        }

        return response()->json([
            'texto_corregido' => trim($resultado['texto']),
        ]);
    }

    /**
     * IA 2: Genera una síntesis general resumida del rendimiento del grado en el trimestre.
     */
    public function generarSintesisGeneralIa(Request $request, $id): JsonResponse
    {
        $cuaderno = CuadernoAuxiliar::with(['grado', 'cicloLectivo'])->findOrFail($id);

        $request->validate([
            'resumen_alumnos' => ['required', 'array', 'min:1'],
        ]);

        $lineas = [];
        foreach ($request->resumen_alumnos as $item) {
            $nombre = $item['alumno'] ?? 'Alumno';
            $promedio = $item['promedio'] ?? 'S/N';
            $faltas = $item['inasistencias'] ?? 0;
            $obs = trim((string) ($item['observacion'] ?? ''));
            $lineas[] = "- {$nombre}: Promedio {$promedio}, Inasistencias: {$faltas}" . ($obs !== '' ? ", Obs: {$obs}" : '');
        }

        $detalleCurso = implode("\n", $lineas);
        $periodoLabel = strtoupper(str_replace('_', ' ', $cuaderno->periodo));

        $prompt = "Actuá como docente de grado de nivel primario en Salta, Argentina. "
            . "Redactá una Síntesis Pedagógica General resumida (2 a 3 párrafos breves) para presentar a Vicedirección sobre el desempeño del curso "
            . "{$cuaderno->grado->nombre_completo} en el {$periodoLabel} (Ciclo {$cuaderno->cicloLectivo->anio}). "
            . "Analizá el rendimiento académico general, las áreas o dificultades recurrentes mencionadas en las observaciones y la asistencia general del grupo. "
            . "REGLAS: Mantené un tono institucional, claro y profesional. No menciones nombres propios de alumnos salvo que sea imprescindible, hablá en términos grupales. "
            . "Devolvé únicamente la síntesis lista para insertar en la planilla, sin títulos ni markdown.\n\n"
            . "Datos del curso:\n{$detalleCurso}";

        $resultado = $this->consultarGemini($prompt);

        if (! $resultado['ok']) {
            return response()->json(['message' => $resultado['error']], 422);
        }

        return response()->json([
            'sintesis_general' => trim($resultado['texto']),
        ]);
    }

    /**
     * Exporta múltiples planillas seleccionadas (una pestaña por planilla) respetando rol y período.
     */
    public function exportarMultiplesExcel(Request $request): StreamedResponse|RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $cuadernosIds = array_filter(array_map('intval', (array) $request->input('cuadernos', [])));
        $periodo = $request->input('periodo');
        $cicloId = $request->input('ciclo_id');

        $query = $this->aplicarFiltroPorRol(
            CuadernoAuxiliar::with([
                'docente',
                'grado.materias' => fn ($q) => $q->where('estado', true)->orderBy('es_especial')->orderBy('nombre'),
                'cicloLectivo',
                'calificaciones.alumno',
                'calificaciones.notasMaterias',
            ]),
            $user
        );

        if (! empty($cuadernosIds)) {
            $query->whereIn('cuadernos_auxiliares.id', $cuadernosIds);
        } else {
            if ($cicloId && $cicloId !== 'todos') {
                $query->where('cuadernos_auxiliares.ciclo_lectivo_id', (int) $cicloId);
            }
            if ($periodo) {
                $query->where('cuadernos_auxiliares.periodo', $periodo);
            }
        }

        $cuadernos = $query->get()->sortBy([
            fn ($c) => $c->grado?->numero ?? 99,
            fn ($c) => $c->grado?->division ?? '',
            fn ($c) => match ($c->periodo) {
                '1_trimestre' => 1,
                '2_trimestre' => 2,
                '3_trimestre' => 3,
                'informe_final' => 4,
                default => 5,
            },
        ])->values();

        if ($cuadernos->isEmpty()) {
            return back()->with('error', 'No se encontraron planillas habilitadas para exportar con los criterios seleccionados.');
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        $periodoCortoMap = [
            '1_trimestre' => '1er Trim',
            '2_trimestre' => '2do Trim',
            '3_trimestre' => '3er Trim',
            'informe_final' => 'Anual',
        ];

        $nombresUsados = [];

        foreach ($cuadernos as $cuaderno) {
            $periodoCorto = $periodoCortoMap[$cuaderno->periodo] ?? $cuaderno->periodo;
            $tituloBase = mb_substr("{$cuaderno->grado->numero}° {$cuaderno->grado->division} - {$periodoCorto}", 0, 27);
            $tituloHoja = $tituloBase;
            $contador = 2;

            while (in_array($tituloHoja, $nombresUsados, true)) {
                $tituloHoja = "{$tituloBase} ({$contador})";
                $contador++;
            }
            $nombresUsados[] = $tituloHoja;

            $sheet = new Worksheet($spreadsheet, $tituloHoja);
            $spreadsheet->addSheet($sheet);

            $this->poblarHojaCuaderno($sheet, $cuaderno);
        }

        $spreadsheet->setActiveSheetIndex(0);

        if ($cuadernos->count() === 1) {
            $c = $cuadernos->first();
            $gradoSlug = preg_replace('/[^A-Za-z0-9]/', '_', "{$c->grado->numero}_{$c->grado->division}");
            $nombreArchivo = "Planilla_{$gradoSlug}_{$c->periodo}_{$c->cicloLectivo->anio}.xlsx";
        } else {
            $anio = $cuadernos->first()->cicloLectivo?->anio ?? date('Y');
            $periodoSlug = $periodo ?: 'Consolidado';
            $nombreArchivo = "Cuadernos_Auxiliares_{$periodoSlug}_{$anio}.xlsx";
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Exporta a Excel (.xlsx) una planilla individual aprobada.
     */
    public function exportarExcel($id): StreamedResponse|RedirectResponse
    {
        $cuaderno = CuadernoAuxiliar::with([
            'docente',
            'grado.materias' => fn ($q) => $q->where('estado', true)->orderBy('es_especial')->orderBy('nombre'),
            'cicloLectivo',
            'calificaciones.alumno',
            'calificaciones.notasMaterias',
        ])->findOrFail($id);

        if ($cuaderno->estado !== 'aprobado') {
            return redirect()->back()->withErrors(['estado' => 'La planilla debe estar visada y aprobada por Vicedirección para poder exportarla a Excel.']);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Planilla Trimestral');

        $this->poblarHojaCuaderno($sheet, $cuaderno);

        $gradoSlug = preg_replace('/[^A-Za-z0-9]/', '_', "{$cuaderno->grado->numero}_{$cuaderno->grado->division}");
        $nombreArchivo = "Planilla_{$gradoSlug}_{$cuaderno->periodo}_{$cuaderno->cicloLectivo->anio}.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Rellena una hoja de PhpSpreadsheet con los datos formateados de una planilla de Cuaderno Auxiliar.
     */
    private function poblarHojaCuaderno(Worksheet $sheet, CuadernoAuxiliar $cuaderno): void
    {
        $materias = $cuaderno->grado->materias;

        $alumnosInclusionIds = LegajoInclusion::pluck('alumno_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $calificaciones = $cuaderno->calificaciones
            ->reject(fn ($c) => in_array((int) $c->alumno_id, $alumnosInclusionIds, true))
            ->sortBy(fn ($c) => mb_strtolower(($c->alumno->apellido ?? '') . ' ' . ($c->alumno->nombre ?? '')))
            ->values();

        $totalCols = 6 + $materias->count();
        $ultimaCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($totalCols);

        $sheet->mergeCells("A1:{$ultimaCol}1");
        $sheet->setCellValue('A1', 'ESCUELA N° 129 "DR. MARIANO BOEDO" — PLANILLA DE CALIFICACIONES Y SEGUIMIENTO');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A8A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $periodoMap = [
            '1_trimestre' => '1° Trimestre',
            '2_trimestre' => '2° Trimestre',
            '3_trimestre' => '3° Trimestre',
            'informe_final' => 'Informe Anual',
        ];
        $estadoMap = [
            'borrador' => 'BORRADOR',
            'enviado_vicedireccion' => 'EN VICEDIRECCIÓN',
            'visado_observado' => 'DEVUELTO CON OBS.',
            'aprobado' => 'VISADO Y APROBADO',
        ];
        $periodoTexto = $periodoMap[$cuaderno->periodo] ?? $cuaderno->periodo;
        $estadoTexto = $estadoMap[$cuaderno->estado] ?? strtoupper($cuaderno->estado);

        $sheet->mergeCells("A2:{$ultimaCol}2");
        $sheet->setCellValue(
            'A2',
            "Grado: {$cuaderno->grado->nombre_completo}  |  Período: {$periodoTexto} ({$cuaderno->cicloLectivo->anio})  |  Docente: {$cuaderno->docente->apellido}, {$cuaderno->docente->name}  |  Estado: {$estadoTexto}"
        );
        $sheet->getStyle('A2')->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '1E293B']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(2)->setRowHeight(22);

        $filaHeader = 4;
        $headers = ['N°', 'DNI', 'Apellido y Nombre'];
        foreach ($materias as $mat) {
            $headers[] = $mat->nombre;
        }
        $headers[] = 'Promedio';
        $headers[] = 'Inasist.';
        $headers[] = 'Observaciones Pedagógicas';

        foreach ($headers as $idx => $titulo) {
            $colLetra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($idx + 1);
            $sheet->setCellValue("{$colLetra}{$filaHeader}", $titulo);
        }

        $sheet->getStyle("A{$filaHeader}:{$ultimaCol}{$filaHeader}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F172A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
        ]);
        $sheet->getRowDimension($filaHeader)->setRowHeight(26);

        $filaActual = 5;
        foreach ($calificaciones as $i => $calif) {
            $notasMap = $calif->notasMaterias->keyBy('materia_id');
            $valoresNumericos = [];

            $sheet->setCellValue("A{$filaActual}", $i + 1);
            $sheet->setCellValue("B{$filaActual}", $calif->alumno->dni ?? '');
            $sheet->setCellValue("C{$filaActual}", "{$calif->alumno->apellido}, {$calif->alumno->nombre}");

            $colIdx = 4;
            foreach ($materias as $mat) {
                $colLetra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
                $notaVal = $notasMap->get($mat->id)?->nota_numerica;
                if ($notaVal !== null) {
                    $sheet->setCellValue("{$colLetra}{$filaActual}", (float) $notaVal);
                    $valoresNumericos[] = (float) $notaVal;
                } else {
                    $sheet->setCellValue("{$colLetra}{$filaActual}", '-');
                }
                $sheet->getStyle("{$colLetra}{$filaActual}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $colIdx++;
            }

            $colProm = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $promedio = count($valoresNumericos) > 0
                ? round(array_sum($valoresNumericos) / count($valoresNumericos), 2)
                : null;
            $sheet->setCellValue("{$colProm}{$filaActual}", $promedio ?? '-');
            $sheet->getStyle("{$colProm}{$filaActual}")->applyFromArray([
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $colIdx++;

            $colFaltas = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $sheet->setCellValue("{$colFaltas}{$filaActual}", (float) $calif->inasistencias_total);
            $sheet->getStyle("{$colFaltas}{$filaActual}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $colIdx++;

            $colObs = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $sheet->setCellValue("{$colObs}{$filaActual}", $calif->sintesis_pedagogica_ia ?? '');
            $sheet->getStyle("{$colObs}{$filaActual}")->getAlignment()->setWrapText(true);

            $sheet->getStyle("A{$filaActual}:{$ultimaCol}{$filaActual}")->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle("A{$filaActual}:B{$filaActual}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $filaActual++;
        }

        if (! empty($cuaderno->sintesis_general)) {
            $filaActual++;
            $sheet->mergeCells("A{$filaActual}:{$ultimaCol}{$filaActual}");
            $sheet->setCellValue("A{$filaActual}", 'SÍNTESIS PEDAGÓGICA GENERAL DEL GRADO');
            $sheet->getStyle("A{$filaActual}:{$ultimaCol}{$filaActual}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '1E3A8A']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '93C5FD']]],
            ]);

            $filaActual++;
            $sheet->mergeCells("A{$filaActual}:{$ultimaCol}{$filaActual}");
            $sheet->setCellValue("A{$filaActual}", $cuaderno->sintesis_general);
            $sheet->getStyle("A{$filaActual}:{$ultimaCol}{$filaActual}")->applyFromArray([
                'alignment' => ['wrapText' => true, 'vertical' => Alignment::VERTICAL_TOP],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
            ]);
            $sheet->getRowDimension($filaActual)->setRowHeight(75);
        }

        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(14);
        $sheet->getColumnDimension('C')->setWidth(28);
        for ($c = 4; $c <= 3 + $materias->count(); $c++) {
            $colLetra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($c);
            $sheet->getColumnDimension($colLetra)->setWidth(15);
        }
        $sheet->getColumnDimension(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(4 + $materias->count()))->setWidth(12);
        $sheet->getColumnDimension(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(5 + $materias->count()))->setWidth(11);
        $sheet->getColumnDimension($ultimaCol)->setWidth(45);
    }

    /**
     * Cliente HTTP hacia Google Gemini API con respaldo rápido ante demoras o alta demanda.
     */
    private function consultarGemini(string $prompt): array
    {
        $apiKey = env('GEMINI_API_KEY');
        if (empty($apiKey)) {
            return [
                'ok' => false,
                'error' => 'No está configurada la variable GEMINI_API_KEY en el archivo .env.',
            ];
        }
        $modelos = [
            'gemini-3.5-flash-lite',
            'gemini-3.8-flash',
        ];

        $ultimoError = 'No se pudo conectar con el servicio de IA.';

        foreach ($modelos as $modelo) {
            try {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelo}:generateContent?key={$apiKey}";

                $response = Http::withoutVerifying()
                    ->connectTimeout(5)
                    ->timeout(12)
                    ->post($url, [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => $prompt],
                                ],
                            ],
                        ],
                        'generationConfig' => [
                            'temperature' => 0.4,
                        ],
                    ]);

                if ($response->successful()) {
                    $texto = data_get($response->json(), 'candidates.0.content.parts.0.text');

                    if (! empty($texto)) {
                        return [
                            'ok' => true,
                            'texto' => $texto,
                        ];
                    }
                }

                $ultimoError = data_get($response->json(), 'error.message', 'Error HTTP ' . $response->status());

                if (in_array($response->status(), [400, 403], true)) {
                    break;
                }
            } catch (\Throwable $e) {
                report($e);
                $ultimoError = $e->getMessage();
            }
        }

        return [
            'ok' => false,
            'error' => "El asistente de IA no pudo responder en este momento ({$ultimoError}). Intentá nuevamente en unos segundos.",
        ];
    }
}