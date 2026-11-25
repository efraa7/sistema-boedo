<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Calificacion;
use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Middleware\PermissionMiddleware;

class CuadroHonorController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('ver cuadro honor'), only: ['index', 'actualizarFoto', 'descargarPdf']),
        ];
    }

    private function esSoloDocente(User $user): bool
    {
        return $user->hasRole('docente')
            && ! $user->hasAnyRole(['super-admin', 'director', 'vicedirector', 'administrativo']);
    }

    /**
     * Calcula los alumnos evaluados (excluyendo legajos de inclusión),
     * los cuerpos de banderas por turno y los mejores 5 promedios de cada grado.
     */
    private function construirDatosMerito(CicloLectivo $cicloActivo, string $periodo = '', bool $soloSinDesaprobadas = true): array
    {
        $etiquetasPeriodo = [
            '1_trimestre' => '1.º Trimestre',
            '2_trimestre' => '2.º Trimestre',
            '3_trimestre' => '3.º Trimestre',
            'informe_final' => 'Informe Final',
        ];

        $alumnosModel = Alumno::query()
            ->where('estado', true)
            ->whereDoesntHave('legajoInclusion')
            ->whereHas('matriculas', fn ($q) => $q->where('ciclo_lectivo_id', $cicloActivo->id))
            ->with([
                'matriculas' => fn ($q) => $q->where('ciclo_lectivo_id', $cicloActivo->id)->with('grado'),
            ])
            ->get();

        $alumnosEvaluados = [];

        foreach ($alumnosModel as $alumno) {
            $matricula = $alumno->matriculas->first();
            $grado = $matricula?->grado;

            if (! $grado || ! $grado->estado) {
                continue;
            }

            $calificaciones = Calificacion::query()
                ->where('alumno_id', $alumno->id)
                ->whereHas('cuadernoAuxiliar', function ($q) use ($cicloActivo, $periodo) {
                    $q->where('ciclo_lectivo_id', $cicloActivo->id)
                        ->whereIn('estado', ['visado', 'aprobado'])
                        ->when($periodo !== '', fn ($query) => $query->where('periodo', $periodo));
                })
                ->with([
                    'cuadernoAuxiliar',
                    'notasMaterias' => fn ($q) => $q->whereNotNull('nota_numerica')->with('materia'),
                ])
                ->get();

            if ($calificaciones->isEmpty()) {
                continue;
            }

            $detalleNotas = [];
            $todasLasNotas = [];

            foreach ($calificaciones as $c) {
                $clavePeriodo = $c->cuadernoAuxiliar?->periodo ?? '';
                $etiquetaPeriodo = $etiquetasPeriodo[$clavePeriodo] ?? $clavePeriodo;

                foreach ($c->notasMaterias as $nm) {
                    if ($nm->nota_numerica === null) {
                        continue;
                    }

                    $valorNota = (float) $nm->nota_numerica;
                    $todasLasNotas[] = $valorNota;

                    $detalleNotas[] = [
                        'materia' => $nm->materia?->nombre ?? 'Materia',
                        'periodo' => $etiquetaPeriodo,
                        'nota' => $valorNota,
                        'conceptual' => $c->nota_conceptual,
                    ];
                }
            }

            if (empty($todasLasNotas)) {
                continue;
            }

            $tieneDesaprobadas = collect($todasLasNotas)->contains(fn ($n) => $n < 6);
            if ($soloSinDesaprobadas && $tieneDesaprobadas) {
                continue;
            }

            $alumnosEvaluados[] = [
                'id' => $alumno->id,
                'dni' => $alumno->dni,
                'legajo' => $alumno->legajo,
                'nombre_completo' => $alumno->nombre_completo,
                'foto_path' => $alumno->foto,
                'foto_url' => $alumno->foto_url,
                'grado_id' => $grado->id,
                'grado_numero' => (int) $grado->numero,
                'grado_division' => $grado->division,
                'grado_nombre' => $grado->nombre_completo,
                'turno' => $grado->turno,
                'cantidad_notas' => count($todasLasNotas),
                'promedio' => round(array_sum($todasLasNotas) / count($todasLasNotas), 2),
                'total_inasistencias' => (float) $calificaciones->sum('inasistencias_total'),
                'detalle_notas' => $detalleNotas,
            ];
        }

        $ordenarMerito = function (array $lista): array {
            usort($lista, function (array $a, array $b) {
                if ($a['promedio'] !== $b['promedio']) {
                    return $b['promedio'] <=> $a['promedio'];
                }
                if ($a['total_inasistencias'] !== $b['total_inasistencias']) {
                    return $a['total_inasistencias'] <=> $b['total_inasistencias'];
                }

                return strcmp($a['nombre_completo'], $b['nombre_completo']);
            });

            return $lista;
        };

        $abanderadosPorTurno = [];
        $todosAbanderadosIds = [];

        foreach (['Mañana', 'Tarde'] as $turnoNombre) {
            $delTurno = array_filter($alumnosEvaluados, fn ($a) => $a['turno'] === $turnoNombre);

            $top7 = array_slice($ordenarMerito(array_filter($delTurno, fn ($a) => $a['grado_numero'] === 7)), 0, 2);
            $top6 = array_slice($ordenarMerito(array_filter($delTurno, fn ($a) => $a['grado_numero'] === 6)), 0, 2);
            $top5 = array_slice($ordenarMerito(array_filter($delTurno, fn ($a) => $a['grado_numero'] === 5)), 0, 2);

            $listaCargos = [];

            $asignarCargo = function (?array $alumno, string $bandera, string $cargo, string $origenEsperado) use (&$listaCargos, &$todosAbanderadosIds) {
                if ($alumno) {
                    $todosAbanderadosIds[] = $alumno['id'];
                }
                $listaCargos[] = [
                    'bandera' => $bandera,
                    'cargo' => $cargo,
                    'origen' => $origenEsperado,
                    'alumno' => $alumno,
                ];
            };

            $asignarCargo($top7[0] ?? null, 'nacional', 'Abanderado/a', '7.º Grado');
            $asignarCargo($top7[1] ?? null, 'nacional', '1.º Escolta', '7.º Grado');
            $asignarCargo($top6[0] ?? null, 'nacional', '2.º Escolta', '6.º Grado');

            $asignarCargo($top6[1] ?? null, 'salta', 'Abanderado/a', '6.º Grado');
            $asignarCargo($top5[0] ?? null, 'salta', '1.º Escolta', '5.º Grado');
            $asignarCargo($top5[1] ?? null, 'salta', '2.º Escolta', '5.º Grado');

            $abanderadosPorTurno[$turnoNombre] = $listaCargos;
        }

        return [
            'alumnosEvaluados' => $alumnosEvaluados,
            'abanderadosPorTurno' => $abanderadosPorTurno,
            'abanderadosIds' => array_values(array_unique($todosAbanderadosIds)),
            'ordenarMerito' => $ordenarMerito,
        ];
    }

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $cicloId = $request->input('ciclo_lectivo_id');
        $buscar = trim((string) $request->input('buscar', ''));
        $turno = (string) $request->input('turno', '');
        $periodo = (string) $request->input('periodo', '');
        $soloSinDesaprobadas = $request->boolean('sin_desaprobadas', true);

        $ciclos = CicloLectivo::orderByDesc('anio')->get();

        $cicloActivo = $cicloId
            ? CicloLectivo::find($cicloId)
            : (CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first() ?? $ciclos->first());

        if (! $cicloActivo) {
            return Inertia::render('cuadro-honor/index', [
                'ciclos' => $ciclos,
                'cicloSeleccionado' => null,
                'abanderadosPorTurno' => [
                    'Mañana' => [],
                    'Tarde' => [],
                ],
                'gradosPaginados' => [
                    'data' => [],
                    'links' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'from' => null,
                    'to' => null,
                    'total' => 0,
                ],
                'filtros' => [
                    'buscar' => '',
                    'turno' => '',
                    'periodo' => '',
                    'sin_desaprobadas' => true,
                ],
            ]);
        }

        $datos = $this->construirDatosMerito($cicloActivo, $periodo, $soloSinDesaprobadas);
        $alumnosEvaluados = $datos['alumnosEvaluados'];
        $abanderadosIds = $datos['abanderadosIds'];
        $ordenarMerito = $datos['ordenarMerito'];

        $esDocente = $this->esSoloDocente($user);

        $gradosPaginados = Grado::query()
            ->where('ciclo_lectivo_id', $cicloActivo->id)
            ->where('estado', true)
            ->when($esDocente, fn ($q) => $q->where('docente_titular_id', $user->id))
            ->when($buscar !== '', function ($query) use ($buscar) {
                $termino = mb_strtolower(trim($buscar));
                $limpio = trim(preg_replace('/\s+/', ' ', str_replace(['°', '.', '"', "'", 'grado'], '', $termino)));
                $compacto = str_replace(' ', '', $limpio);

                $query->where(function ($q) use ($termino, $limpio, $compacto) {
                    $q->whereRaw('LOWER(CAST(numero AS CHAR)) LIKE ?', ["%{$limpio}%"])
                        ->orWhereRaw('LOWER(division) LIKE ?', ["%{$termino}%"])
                        ->orWhereRaw('LOWER(division) LIKE ?', ["%{$limpio}%"])
                        ->orWhereRaw("LOWER(CONCAT(CAST(numero AS CHAR), ' ', division)) LIKE ?", ["%{$limpio}%"])
                        ->orWhereRaw("LOWER(CONCAT(CAST(numero AS CHAR), division)) LIKE ?", ["%{$compacto}%"]);
                });
            })
            ->when($turno !== '', fn ($query) => $query->where('turno', $turno))
            ->orderBy('numero')
            ->orderBy('division')
            ->paginate(5)
            ->withQueryString()
            ->through(function (Grado $grado) use ($alumnosEvaluados, $abanderadosIds, $ordenarMerito) {
                $alumnosDelGrado = array_filter(
                    $alumnosEvaluados,
                    fn ($a) => $a['grado_id'] === $grado->id && ! in_array($a['id'], $abanderadosIds, true)
                );

                $top5Grado = array_slice($ordenarMerito($alumnosDelGrado), 0, 5);

                foreach ($top5Grado as $idx => &$al) {
                    $al['puesto'] = $idx + 1;
                }
                unset($al);

                return [
                    'id' => $grado->id,
                    'numero' => $grado->numero,
                    'division' => $grado->division,
                    'turno' => $grado->turno,
                    'nombre_completo' => $grado->nombre_completo,
                    'cuadro_honor' => $top5Grado,
                ];
            });

        return Inertia::render('cuadro-honor/index', [
            'ciclos' => $ciclos,
            'cicloSeleccionado' => $cicloActivo,
            'abanderadosPorTurno' => $datos['abanderadosPorTurno'],
            'gradosPaginados' => $gradosPaginados,
            'filtros' => [
                'buscar' => $buscar,
                'turno' => $turno,
                'periodo' => $periodo,
                'sin_desaprobadas' => $soloSinDesaprobadas,
            ],
        ]);
    }

    /**
     * Sube o actualiza la foto de perfil de un alumno directamente en la tabla alumnos.
     */
    public function actualizarFoto(Request $request, Alumno $alumno): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->esSoloDocente($user)) {
            $esSuAlumno = $alumno->matriculas()
                ->whereHas('grado', fn ($q) => $q->where('docente_titular_id', $user->id))
                ->exists();

            abort_unless($esSuAlumno, 403, 'Solo podés actualizar fotos de alumnos de tus grados asignados.');
        }

        $request->validate([
            'foto' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'foto.required' => 'Seleccioná una imagen válida.',
            'foto.image' => 'El archivo debe ser una imagen.',
            'foto.mimes' => 'Formatos permitidos: JPG, JPEG, PNG o WEBP.',
            'foto.max' => 'La imagen no debe superar los 2 MB.',
        ]);

        if ($alumno->foto && Storage::disk('public')->exists($alumno->foto)) {
            Storage::disk('public')->delete($alumno->foto);
        }

        $rutaNueva = $request->file('foto')->store('alumnos', 'public');
        $alumno->update([
            'foto' => $rutaNueva,
        ]);

        return response()->json([
            'ok' => true,
            'alumno_id' => $alumno->id,
            'foto_url' => $alumno->fresh()->foto_url,
        ]);
    }

    /**
     * Convierte la foto guardada en Storage::disk('public') a Base64 Data URI para que DomPDF la renderice sin fallos.
     */
    private function fotoADataUri(?string $fotoPath): ?string
    {
        if (! $fotoPath || ! Storage::disk('public')->exists($fotoPath)) {
            return null;
        }

        $contenido = Storage::disk('public')->get($fotoPath);
        $ext = strtolower(pathinfo($fotoPath, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return 'data:' . $mime . ';base64,' . base64_encode($contenido);
    }

    /**
     * Descarga el Cuadro de Honor en PDF (Ambos turnos, Solo Turno Mañana o Solo Turno Tarde).
     */
    public function descargarPdf(Request $request): HttpResponse
    {
        /** @var User $user */
        $user = $request->user();

        $cicloId = $request->input('ciclo_lectivo_id');
        $periodo = (string) $request->input('periodo', '');
        $soloSinDesaprobadas = $request->boolean('sin_desaprobadas', true);
        $turnoPdf = (string) $request->input('turno_pdf', 'ambos');

        $ciclo = $cicloId
            ? CicloLectivo::find($cicloId)
            : (CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first() ?? CicloLectivo::orderByDesc('anio')->first());

        abort_if(! $ciclo, 404, 'No hay un ciclo lectivo configurado.');

        $datos = $this->construirDatosMerito($ciclo, $periodo, $soloSinDesaprobadas);
        $alumnosEvaluados = $datos['alumnosEvaluados'];
        $abanderadosIds = $datos['abanderadosIds'];
        $ordenarMerito = $datos['ordenarMerito'];

        $turnosAIncluir = match ($turnoPdf) {
            'Mañana' => ['Mañana'],
            'Tarde' => ['Tarde'],
            default => ['Mañana', 'Tarde'],
        };

        $esDocente = $this->esSoloDocente($user);

        $seccionesPorTurno = [];

        foreach ($turnosAIncluir as $turnoNombre) {
            $abanderadosTurno = array_map(function (array $cargo) {
                if ($cargo['alumno']) {
                    $cargo['alumno']['foto_data_uri'] = $this->fotoADataUri($cargo['alumno']['foto_path'] ?? null);
                }

                return $cargo;
            }, $datos['abanderadosPorTurno'][$turnoNombre] ?? []);

            $gradosTurno = Grado::query()
                ->where('ciclo_lectivo_id', $ciclo->id)
                ->where('estado', true)
                ->where('turno', $turnoNombre)
                ->when($esDocente, fn ($q) => $q->where('docente_titular_id', $user->id))
                ->orderBy('numero')
                ->orderBy('division')
                ->get()
                ->map(function ($grado) use ($alumnosEvaluados, $abanderadosIds, $ordenarMerito) {
                /** @var Grado $grado */
                $alumnosDelGrado = array_filter(
                    $alumnosEvaluados,
                    fn ($a) => $a['grado_id'] === $grado->id && ! in_array($a['id'], $abanderadosIds, true)
                );

                    $top5Grado = array_slice($ordenarMerito($alumnosDelGrado), 0, 5);

                    foreach ($top5Grado as $idx => &$al) {
                        $al['puesto'] = $idx + 1;
                        $al['foto_data_uri'] = $this->fotoADataUri($al['foto_path'] ?? null);
                    }
                    unset($al);

                    return [
                        'id' => $grado->id,
                        'numero' => $grado->numero,
                        'division' => $grado->division,
                        'turno' => $grado->turno,
                        'nombre_completo' => $grado->nombre_completo,
                        'cuadro_honor' => $top5Grado,
                    ];
                })
                ->values();

            $seccionesPorTurno[] = [
                'turno' => $turnoNombre,
                'abanderados' => $abanderadosTurno,
                'grados' => $gradosTurno,
            ];
        }

        $etiquetasPeriodo = [
            '' => 'Consolidado Anual',
            '1_trimestre' => '1.º Trimestre',
            '2_trimestre' => '2.º Trimestre',
            '3_trimestre' => '3.º Trimestre',
            'informe_final' => 'Informe Final',
        ];

        $periodoLabel = $etiquetasPeriodo[$periodo] ?? 'Consolidado Anual';
        $turnoSlug = match ($turnoPdf) {
            'Mañana' => 'Turno_Manana',
            'Tarde' => 'Turno_Tarde',
            default => 'Ambos_Turnos',
        };

        $pdf = Pdf::loadView('pdf.cuadro-honor', [
            'ciclo' => $ciclo,
            'periodoLabel' => $periodoLabel,
            'soloSinDesaprobadas' => $soloSinDesaprobadas,
            'seccionesPorTurno' => $seccionesPorTurno,
            'fechaEmision' => now()->format('d/m/Y'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("Cuadro_de_Honor_{$ciclo->anio}_{$turnoSlug}.pdf");
    }
}