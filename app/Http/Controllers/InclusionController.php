<?php

namespace App\Http\Controllers;

use App\Mail\LegajoInclusionMail;
use App\Models\Alumno;
use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\InclusionInformeInicial;
use App\Models\InclusionInformePeriodo;
use App\Models\InclusionInformePeriodoMateria;
use App\Models\InclusionPpi;
use App\Models\InclusionPpiMateria;
use App\Models\LegajoInclusion;
use App\Models\Materia;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InclusionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar inclusion|gestionar inclusion'), only: ['index']),
            new Middleware(PermissionMiddleware::using('ver inclusion|gestionar inclusion'), only: [
                'show',
                'descargarCud',
                'guardarInformeInicial',
                'guardarPpi',
                'guardarInformePeriodo',
                'descargarPdf',
            ]),
            new Middleware(PermissionMiddleware::using('crear inclusion|gestionar inclusion'), only: ['create', 'store']),
            new Middleware(PermissionMiddleware::using('editar inclusion|gestionar inclusion'), only: ['edit', 'update']),
            new Middleware(PermissionMiddleware::using('eliminar inclusion|gestionar inclusion'), only: ['destroy']),
        ];
    }

    /**
     * Determina el alcance efectivo del usuario en Inclusión Escolar:
     * - total: super-admin o director
     * - vicedirector: alumnos matriculados en grados de docentes a su cargo
     * - mai: alumnos asignados a esta MAI
     * - docente: solo listado informativo de alumnos matriculados en su(s) grado(s)
     * - ninguno: sin acceso
     */
    private function resolverRolAlcance(User $user): string
    {
        if ($user->hasAnyRole(['super-admin', 'director'])) {
            return 'total';
        }

        if ($user->hasRole('vicedirector')) {
            return 'vicedirector';
        }

        if ($user->hasRole('docente-pedagogico')) {
            return 'mai';
        }

        if ($user->hasRole('docente')) {
            return 'docente';
        }

        return 'ninguno';
    }

    private function puedeAdministrarLegajos(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'director', 'vicedirector']);
    }

    private function obtenerDocentesACargoIds(User $vicedirector): array
    {
        return User::where('vicedirector_id', $vicedirector->id)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function aplicarFiltroMai(Builder $query, User $user): void
    {
        $query->where(function (Builder $q) use ($user) {
            $q->where('legajos_inclusion.docente_integrador_id', $user->id)
                ->orWhere(function (Builder $sq) use ($user) {
                    $sq->whereNull('legajos_inclusion.docente_integrador_id')
                        ->where('legajos_inclusion.docente_integrador_email', $user->email);
                });
        });
    }

    private function aplicarFiltroScopeLegajos(Builder $query, User $user, ?int $cicloId): void
    {
        $alcance = $this->resolverRolAlcance($user);

        if ($alcance === 'total') {
            return;
        }

        if ($alcance === 'vicedirector') {
            $docentesIds = $this->obtenerDocentesACargoIds($user);
            if (empty($docentesIds)) {
                $query->whereRaw('1 = 0');
                return;
            }

            $query->whereHas('alumno.matriculas', function (Builder $mq) use ($docentesIds, $cicloId) {
                $mq->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                    ->whereHas('grado', fn (Builder $gq) => $gq->whereIn('docente_titular_id', $docentesIds));
            });

            return;
        }

        if ($alcance === 'mai') {
            $this->aplicarFiltroMai($query, $user);
            return;
        }

        if ($alcance === 'docente') {
            $query->whereHas('alumno.matriculas', function (Builder $mq) use ($user, $cicloId) {
                $mq->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                    ->whereHas('grado', fn (Builder $gq) => $gq->where('docente_titular_id', $user->id));
            });

            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function legajoPerteneceAVicedirector(User $vicedirector, LegajoInclusion $legajo, ?int $cicloId = null): bool
    {
        $docentesIds = $this->obtenerDocentesACargoIds($vicedirector);
        if (empty($docentesIds)) {
            return false;
        }

        $cicloReferenciaId = $cicloId
            ?? CicloLectivo::where('cerrado', false)->orderByDesc('anio')->value('id');

        return $legajo->alumno()
            ->whereHas('matriculas', function (Builder $mq) use ($docentesIds, $cicloReferenciaId) {
                $mq->when($cicloReferenciaId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloReferenciaId))
                    ->whereHas('grado', fn (Builder $gq) => $gq->whereIn('docente_titular_id', $docentesIds));
            })
            ->exists();
    }

    private function puedeEditarInformes(User $user, LegajoInclusion $legajo, ?int $cicloId = null): bool
    {
        $alcance = $this->resolverRolAlcance($user);

        if ($alcance === 'total') {
            return true;
        }

        if ($alcance === 'vicedirector') {
            return $this->legajoPerteneceAVicedirector($user, $legajo, $cicloId);
        }

        if ($alcance === 'mai') {
            return (int) $legajo->docente_integrador_id === (int) $user->id
                || ($legajo->docente_integrador_id === null && $legajo->docente_integrador_email === $user->email);
        }

        return false;
    }

    /**
     * Verifica acceso al expediente completo (show, PDFs, CUD, informes).
     * Los docentes de aula solo tienen vista informativa en index y no acceden al expediente.
     */
    private function autorizarAccesoExpediente(User $user, LegajoInclusion $legajo, ?int $cicloId = null): void
    {
        $alcance = $this->resolverRolAlcance($user);

        if ($alcance === 'total') {
            return;
        }

        if ($alcance === 'vicedirector') {
            abort_unless(
                $this->legajoPerteneceAVicedirector($user, $legajo, $cicloId),
                403,
                'Este legajo no pertenece a un grado de los docentes a tu cargo.'
            );
            return;
        }

        if ($alcance === 'mai') {
            abort_unless(
                $this->puedeEditarInformes($user, $legajo, $cicloId),
                403,
                'No tenés permiso para acceder al legajo de este estudiante.'
            );
            return;
        }

        abort(403, 'No tenés autorización para acceder al expediente de inclusión.');
    }

    /**
     * Verifica autorización administrativa para crear, editar datos base/CUD o eliminar un legajo.
     * Solo super-admin, director y vicedirector (dentro de su alcance).
     */
    private function autorizarGestionLegajo(User $user, ?LegajoInclusion $legajo = null): void
    {
        abort_unless(
            $this->puedeAdministrarLegajos($user),
            403,
            'Solo Dirección, Vicedirección o Super-Admin pueden crear, editar o eliminar legajos de inclusión.'
        );

        if ($legajo !== null && $this->resolverRolAlcance($user) === 'vicedirector') {
            abort_unless(
                $this->legajoPerteneceAVicedirector($user, $legajo),
                403,
                'Solo podés gestionar legajos de alumnos que cursen en grados de docentes a tu cargo.'
            );
        }
    }

    private function obtenerMais()
    {
        return User::role('docente-pedagogico')
            ->where('estado', true)
            ->orderBy('apellido')
            ->orderBy('name')
            ->get(['id', 'apellido', 'name', 'dni', 'email']);
    }

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $alcance = $this->resolverRolAlcance($user);

        $ciclos = CicloLectivo::orderByDesc('anio')->get(['id', 'anio', 'cerrado']);
        $cicloActivo = $ciclos->firstWhere('cerrado', false);

        $cicloId = $request->filled('ciclo_id')
            ? (int) $request->input('ciclo_id')
            : ($cicloActivo?->id ?? $ciclos->first()?->id);

        $cicloSeleccionado = $ciclos->firstWhere('id', $cicloId);
        $gradoId = $request->input('grado_id');
        $buscar = trim((string) $request->input('buscar', ''));

        $docentesViceIds = $alcance === 'vicedirector' ? $this->obtenerDocentesACargoIds($user) : [];

        // Grados disponibles en el filtro estrictamente acotados al rol del usuario
        $gradosQuery = Grado::query()
            ->when($cicloId, fn ($q) => $q->where('ciclo_lectivo_id', $cicloId));

        if ($alcance === 'vicedirector') {
            if (empty($docentesViceIds)) {
                $gradosQuery->whereRaw('1 = 0');
            } else {
                $gradosQuery->whereIn('docente_titular_id', $docentesViceIds);
            }
        } elseif ($alcance === 'mai') {
            $gradosQuery->whereHas('matriculas.alumno.legajoInclusion', function (Builder $lq) use ($user) {
                $this->aplicarFiltroMai($lq, $user);
            });
        } elseif ($alcance === 'docente') {
            $gradosQuery->where('docente_titular_id', $user->id);
        } elseif ($alcance === 'ninguno') {
            $gradosQuery->whereRaw('1 = 0');
        }

        $grados = $gradosQuery
            ->withCount([
                'matriculas as inclusion_count' => fn ($q) => $q->whereHas('alumno.legajoInclusion', function (Builder $lq) use ($alcance, $user) {
                    if ($alcance === 'mai') {
                        $this->aplicarFiltroMai($lq, $user);
                    }
                }),
            ])
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno')
            ->get(['id', 'ciclo_lectivo_id', 'numero', 'division', 'turno']);

        // Evitar que un parámetro grado_id manipulado en la URL filtre un grado ajeno al rol
        $gradosPermitidosIds = $grados->pluck('id')->map(fn ($id) => (int) $id)->all();
        if ($gradoId && ! in_array((int) $gradoId, $gradosPermitidosIds, true)) {
            $gradoId = '';
        }

        $legajosQuery = LegajoInclusion::query();
        $this->aplicarFiltroScopeLegajos($legajosQuery, $user, $cicloId);

        $esDocenteAula = $alcance === 'docente';

        $legajos = $legajosQuery
            ->with([
                'alumno.matriculas' => fn ($q) => $q
                    ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                    ->with(['grado.docenteTitular', 'cicloLectivo']),
                'informesIniciales' => fn ($q) => $q->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId)),
                'ppis' => fn ($q) => $q->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId)),
                'informesPeriodos' => fn ($q) => $q->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId)),
            ])
            ->when($gradoId, function ($query) use ($gradoId, $cicloId) {
                $query->whereHas('alumno.matriculas', function ($q) use ($gradoId, $cicloId) {
                    $q->where('grado_id', (int) $gradoId)
                        ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId));
                });
            })
            ->when($buscar !== '', function ($query) use ($buscar) {
                $query->where(function ($q) use ($buscar) {
                    $q->where('diagnostico', 'like', "%{$buscar}%")
                        ->orWhere('docente_integrador', 'like', "%{$buscar}%")
                        ->orWhereHas('alumno', function ($aq) use ($buscar) {
                            $aq->where('apellido', 'like', "%{$buscar}%")
                                ->orWhere('nombre', 'like', "%{$buscar}%")
                                ->orWhere('dni', 'like', "%{$buscar}%");
                        });
                });
            })
            ->join('alumnos', 'legajos_inclusion.alumno_id', '=', 'alumnos.id')
            ->select('legajos_inclusion.*')
            ->orderBy('alumnos.apellido')
            ->orderBy('alumnos.nombre')
            ->paginate(5)
            ->withQueryString()
            ->through(function (LegajoInclusion $legajo) use ($esDocenteAula) {
                $estadoCud = 'sin_cud';

                if ($legajo->posee_cud && $legajo->vencimiento_cud) {
                    $hoy = Carbon::now()->startOfDay();
                    $vencimiento = Carbon::parse($legajo->vencimiento_cud)->startOfDay();
                    $diasRestantes = $hoy->diffInDays($vencimiento, false);

                    if ($diasRestantes < 0) {
                        $estadoCud = 'vencido';
                    } elseif ($diasRestantes <= 30) {
                        $estadoCud = 'por_vencer';
                    } else {
                        $estadoCud = 'al_dia';
                    }
                } elseif ($legajo->posee_cud) {
                    $estadoCud = 'al_dia';
                }

                $matricula = $legajo->alumno?->matriculas?->first();
                $grado = $matricula?->grado;

                $legajo->estado_semaforo_cud = $estadoCud;
                $legajo->archivo_url = (! $esDocenteAula && $legajo->archivo_cud)
                    ? route('inclusion.descargar-cud', $legajo->id)
                    : null;
                $legajo->grado_actual = $grado ? [
                    'id' => $grado->id,
                    'nombre_completo' => $grado->nombre_completo,
                    'docente_titular' => $grado->docenteTitular
                        ? "{$grado->docenteTitular->apellido}, {$grado->docenteTitular->name}"
                        : null,
                ] : null;
                $legajo->tiene_informe_inicial = $legajo->informesIniciales->isNotEmpty();
                $legajo->tiene_ppi = $legajo->ppis->isNotEmpty();
                $legajo->periodos_cargados = $legajo->informesPeriodos->pluck('periodo')->values()->all();

                return $legajo;
            });

        return Inertia::render('inclusion/index', [
            'legajos' => $legajos,
            'grados' => $grados,
            'ciclos' => $ciclos,
            'cicloSeleccionado' => $cicloSeleccionado,
            'esDocentePedagogico' => $alcance === 'mai',
            'esDocenteAula' => $esDocenteAula,
            'puedeAdministrarLegajos' => $this->puedeAdministrarLegajos($user),
            'puedeExportarExcel' => in_array($alcance, ['total', 'vicedirector', 'mai'], true),
            'filtros' => [
                'ciclo_id' => $cicloId ? (string) $cicloId : '',
                'grado_id' => $gradoId ? (string) $gradoId : '',
                'buscar' => $buscar,
            ],
        ]);
    }

    public function show(Request $request, LegajoInclusion $inclusion): Response
    {
        /** @var User $user */
        $user = $request->user();

        $ciclos = CicloLectivo::orderByDesc('anio')->get(['id', 'anio', 'cerrado']);
        $cicloActivo = $ciclos->firstWhere('cerrado', false);
        $cicloId = $request->filled('ciclo_id')
            ? (int) $request->input('ciclo_id')
            : ($cicloActivo?->id ?? $ciclos->first()?->id);

        $this->autorizarAccesoExpediente($user, $inclusion, $cicloId);

        $cicloSeleccionado = $ciclos->firstWhere('id', $cicloId);

        $inclusion->load([
            'alumno.matriculas' => fn ($q) => $q
                ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                ->with(['grado.docenteTitular', 'grado.materias' => fn ($mq) => $mq->where('estado', true)->orderBy('es_especial')->orderBy('nombre')]),
        ]);

        $matricula = $inclusion->alumno?->matriculas?->first();
        $grado = $matricula?->grado;

        $materias = $grado && $grado->materias->isNotEmpty()
            ? $grado->materias
            : Materia::where('estado', true)->orderBy('es_especial')->orderBy('nombre')->get(['id', 'codigo', 'nombre', 'es_especial']);

        $informeInicial = $cicloId
            ? InclusionInformeInicial::where('legajo_inclusion_id', $inclusion->id)
                ->where('ciclo_lectivo_id', $cicloId)
                ->first()
            : null;

        $ppi = $cicloId
            ? InclusionPpi::with('materias')
                ->where('legajo_inclusion_id', $inclusion->id)
                ->where('ciclo_lectivo_id', $cicloId)
                ->first()
            : null;

        $informesPeriodos = $cicloId
            ? InclusionInformePeriodo::with('materias')
                ->where('legajo_inclusion_id', $inclusion->id)
                ->where('ciclo_lectivo_id', $cicloId)
                ->get()
                ->keyBy('periodo')
            : collect();

        return Inertia::render('inclusion/show', [
            'legajo' => [
                'id' => $inclusion->id,
                'diagnostico' => $inclusion->diagnostico,
                'posee_cud' => (bool) $inclusion->posee_cud,
                'vencimiento_cud' => $inclusion->vencimiento_cud
                    ? Carbon::parse($inclusion->vencimiento_cud)->format('Y-m-d')
                    : null,
                'archivo_url' => $inclusion->archivo_cud ? route('inclusion.descargar-cud', $inclusion->id) : null,
                'docente_integrador' => $inclusion->docente_integrador,
                'docente_integrador_email' => $inclusion->docente_integrador_email,
                'observaciones_ppi' => $inclusion->observaciones_ppi,
                'alumno' => [
                    'id' => $inclusion->alumno->id,
                    'apellido' => $inclusion->alumno->apellido,
                    'nombre' => $inclusion->alumno->nombre,
                    'dni' => $inclusion->alumno->dni,
                    'fecha_nacimiento' => $inclusion->alumno->fecha_nacimiento?->format('d/m/Y'),
                    'tutor_nombre' => $inclusion->alumno->tutor_nombre,
                ],
                'grado_actual' => $grado ? [
                    'id' => $grado->id,
                    'nombre_completo' => $grado->nombre_completo,
                    'docente_titular' => $grado->docenteTitular
                        ? "{$grado->docenteTitular->apellido}, {$grado->docenteTitular->name}"
                        : 'Sin asignar',
                ] : null,
            ],
            'ciclos' => $ciclos,
            'cicloSeleccionado' => $cicloSeleccionado,
            'materias' => $materias->values(),
            'informeInicial' => $informeInicial,
            'ppi' => $ppi,
            'informesPeriodos' => $informesPeriodos,
            'puedeEditar' => $this->puedeEditarInformes($user, $inclusion, $cicloId) && ! ($cicloSeleccionado?->cerrado ?? false),
        ]);
    }

    public function guardarInformeInicial(Request $request, LegajoInclusion $inclusion): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $cicloId = $request->filled('ciclo_lectivo_id') ? (int) $request->input('ciclo_lectivo_id') : null;
        abort_unless($this->puedeEditarInformes($user, $inclusion, $cicloId), 403, 'No tenés permiso para editar este informe.');

        $validated = $request->validate([
            'ciclo_lectivo_id' => ['required', 'exists:ciclos_lectivos,id'],
            'escuela_especial' => ['nullable', 'string', 'max:255'],
            'vinculo_adaptacion' => ['nullable', 'string'],
            'fortalezas_estilo' => ['nullable', 'string'],
            'saberes_previos' => ['nullable', 'string'],
        ]);

        InclusionInformeInicial::updateOrCreate(
            [
                'legajo_inclusion_id' => $inclusion->id,
                'ciclo_lectivo_id' => $validated['ciclo_lectivo_id'],
            ],
            [
                'autor_id' => $user->id,
                'escuela_especial' => $validated['escuela_especial'] ?? null,
                'vinculo_adaptacion' => $validated['vinculo_adaptacion'] ?? null,
                'fortalezas_estilo' => $validated['fortalezas_estilo'] ?? null,
                'saberes_previos' => $validated['saberes_previos'] ?? null,
            ]
        );

        return back()->with('success', 'Informe Pedagógico Inicial guardado correctamente.');
    }

    public function guardarPpi(Request $request, LegajoInclusion $inclusion): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $cicloId = $request->filled('ciclo_lectivo_id') ? (int) $request->input('ciclo_lectivo_id') : null;
        abort_unless($this->puedeEditarInformes($user, $inclusion, $cicloId), 403, 'No tenés permiso para editar el PPI.');

        $validated = $request->validate([
            'ciclo_lectivo_id' => ['required', 'exists:ciclos_lectivos,id'],
            'barreras_contexto' => ['nullable', 'string'],
            'configuraciones_apoyo' => ['nullable', 'string'],
            'materias' => ['required', 'array'],
            'materias.*.materia_id' => ['required', 'exists:materias,id'],
            'materias.*.contenidos_priorizados' => ['nullable', 'string'],
            'materias.*.ajustes_evaluacion' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($inclusion, $user, $validated) {
            $ppi = InclusionPpi::updateOrCreate(
                [
                    'legajo_inclusion_id' => $inclusion->id,
                    'ciclo_lectivo_id' => $validated['ciclo_lectivo_id'],
                ],
                [
                    'autor_id' => $user->id,
                    'barreras_contexto' => $validated['barreras_contexto'] ?? null,
                    'configuraciones_apoyo' => $validated['configuraciones_apoyo'] ?? null,
                ]
            );

            foreach ($validated['materias'] as $matData) {
                InclusionPpiMateria::updateOrCreate(
                    [
                        'inclusion_ppi_id' => $ppi->id,
                        'materia_id' => $matData['materia_id'],
                    ],
                    [
                        'contenidos_priorizados' => $matData['contenidos_priorizados'] ?? null,
                        'ajustes_evaluacion' => $matData['ajustes_evaluacion'] ?? null,
                    ]
                );
            }
        });

        return back()->with('success', 'Proyecto Pedagógico Individual (PPI) guardado correctamente.');
    }

    public function guardarInformePeriodo(Request $request, LegajoInclusion $inclusion): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $cicloId = $request->filled('ciclo_lectivo_id') ? (int) $request->input('ciclo_lectivo_id') : null;
        abort_unless($this->puedeEditarInformes($user, $inclusion, $cicloId), 403, 'No tenés permiso para editar este informe.');

        $validated = $request->validate([
            'ciclo_lectivo_id' => ['required', 'exists:ciclos_lectivos,id'],
            'periodo' => ['required', 'in:1_trimestre,2_trimestre,3_trimestre,informe_final'],
            'inasistencias' => ['required', 'numeric', 'min:0', 'max:300'],
            'sintesis_periodo' => ['nullable', 'string'],
            'materias' => ['required', 'array'],
            'materias.*.materia_id' => ['required', 'exists:materias,id'],
            'materias.*.nota_numerica' => ['nullable', 'numeric', 'min:1', 'max:10'],
            'materias.*.contenidos_alcanzados' => ['nullable', 'string'],
            'materias.*.dificultades_sugerencias' => ['nullable', 'string'],
        ], [
            'materias.*.nota_numerica.min' => 'Las notas cargadas deben estar entre 1 y 10 (dejá vacío si no asistió).',
            'materias.*.nota_numerica.max' => 'Las notas no pueden superar 10.',
        ]);

        DB::transaction(function () use ($inclusion, $user, $validated) {
            $informe = InclusionInformePeriodo::updateOrCreate(
                [
                    'legajo_inclusion_id' => $inclusion->id,
                    'ciclo_lectivo_id' => $validated['ciclo_lectivo_id'],
                    'periodo' => $validated['periodo'],
                ],
                [
                    'autor_id' => $user->id,
                    'inasistencias' => $validated['inasistencias'],
                    'sintesis_periodo' => $validated['sintesis_periodo'] ?? null,
                ]
            );

            foreach ($validated['materias'] as $matData) {
                $nota = $matData['nota_numerica'];
                InclusionInformePeriodoMateria::updateOrCreate(
                    [
                        'inclusion_informe_periodo_id' => $informe->id,
                        'materia_id' => $matData['materia_id'],
                    ],
                    [
                        'nota_numerica' => ($nota === '' || $nota === null) ? null : $nota,
                        'contenidos_alcanzados' => $matData['contenidos_alcanzados'] ?? null,
                        'dificultades_sugerencias' => $matData['dificultades_sugerencias'] ?? null,
                    ]
                );
            }
        });

        return back()->with('success', 'Informe pedagógico y calificaciones del período guardados correctamente.');
    }

    public function descargarPdf(Request $request, LegajoInclusion $inclusion, string $tipo): HttpResponse
    {
        /** @var User $user */
        $user = $request->user();

        $cicloActivo = CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first();
        $cicloId = $request->filled('ciclo_id')
            ? (int) $request->input('ciclo_id')
            : $cicloActivo?->id;

        $this->autorizarAccesoExpediente($user, $inclusion, $cicloId);

        abort_unless(in_array($tipo, ['inicial', 'ppi', '1_trimestre', '2_trimestre', '3_trimestre', 'informe_final'], true), 404);

        $ciclo = $cicloId ? CicloLectivo::find($cicloId) : $cicloActivo;

        $inclusion->load([
            'alumno.matriculas' => fn ($q) => $q
                ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                ->with(['grado.docenteTitular', 'grado.materias' => fn ($mq) => $mq->where('estado', true)->orderBy('es_especial')->orderBy('nombre')]),
        ]);

        $matricula = $inclusion->alumno?->matriculas?->first();
        $grado = $matricula?->grado;
        $materias = $grado && $grado->materias->isNotEmpty()
            ? $grado->materias
            : Materia::where('estado', true)->orderBy('es_especial')->orderBy('nombre')->get();

        $informeInicial = $cicloId
            ? InclusionInformeInicial::where('legajo_inclusion_id', $inclusion->id)->where('ciclo_lectivo_id', $cicloId)->first()
            : null;

        $ppi = $cicloId
            ? InclusionPpi::with('materias')->where('legajo_inclusion_id', $inclusion->id)->where('ciclo_lectivo_id', $cicloId)->first()
            : null;

        $informePeriodo = ($cicloId && in_array($tipo, ['1_trimestre', '2_trimestre', '3_trimestre', 'informe_final'], true))
            ? InclusionInformePeriodo::with('materias')
                ->where('legajo_inclusion_id', $inclusion->id)
                ->where('ciclo_lectivo_id', $cicloId)
                ->where('periodo', $tipo)
                ->first()
            : null;

        $titulosMap = [
            'inicial' => 'INFORME PEDAGÓGICO INICIAL (LÍNEA BASE)',
            'ppi' => 'PROYECTO PEDAGÓGICO INDIVIDUAL PARA LA INCLUSIÓN (PPI)',
            '1_trimestre' => 'INFORME PEDAGÓGICO Y CALIFICACIONES — 1° TRIMESTRE',
            '2_trimestre' => 'INFORME PEDAGÓGICO Y CALIFICACIONES — 2° TRIMESTRE',
            '3_trimestre' => 'INFORME PEDAGÓGICO Y CALIFICACIONES — 3° TRIMESTRE',
            'informe_final' => 'INFORME PEDAGÓGICO FINAL ANUAL Y CALIFICACIONES',
        ];

        $pdf = Pdf::loadView('pdf.legajo-inclusion', [
            'tipo' => $tipo,
            'tituloDocumento' => $titulosMap[$tipo],
            'legajo' => $inclusion,
            'alumno' => $inclusion->alumno,
            'grado' => $grado,
            'ciclo' => $ciclo,
            'materias' => $materias,
            'informeInicial' => $informeInicial,
            'ppi' => $ppi,
            'informePeriodo' => $informePeriodo,
        ])->setPaper('a4', 'portrait');

        $alumnoSlug = preg_replace('/[^A-Za-z0-9]/', '_', "{$inclusion->alumno->apellido}_{$inclusion->alumno->nombre}");
        $anio = $ciclo?->anio ?? date('Y');
        $nombreArchivo = "Legajo_Inclusion_{$alumnoSlug}_{$tipo}_{$anio}.pdf";

        return $pdf->download($nombreArchivo);
    }

    public function create(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->autorizarGestionLegajo($user);

        $alcance = $this->resolverRolAlcance($user);
        $docentesViceIds = $alcance === 'vicedirector' ? $this->obtenerDocentesACargoIds($user) : [];

        $cicloActivo = CicloLectivo::where('cerrado', false)
            ->orderByDesc('anio')
            ->first();

        $gradosQuery = Grado::query()
            ->when($cicloActivo, fn ($q) => $q->where('ciclo_lectivo_id', $cicloActivo->id));

        if ($alcance === 'vicedirector') {
            if (empty($docentesViceIds)) {
                $gradosQuery->whereRaw('1 = 0');
            } else {
                $gradosQuery->whereIn('docente_titular_id', $docentesViceIds);
            }
        }

        $grados = $gradosQuery
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno')
            ->get(['id', 'numero', 'division', 'turno']);

        $alumnosQuery = Alumno::doesntHave('legajoInclusion')
            ->where('estado', true);

        if ($alcance === 'vicedirector') {
            if (empty($docentesViceIds)) {
                $alumnosQuery->whereRaw('1 = 0');
            } else {
                $alumnosQuery->whereHas('matriculas', function (Builder $mq) use ($cicloActivo, $docentesViceIds) {
                    $mq->when($cicloActivo, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloActivo->id))
                        ->whereHas('grado', fn (Builder $gq) => $gq->whereIn('docente_titular_id', $docentesViceIds));
                });
            }
        }

        $alumnosDisponibles = $alumnosQuery
            ->with([
                'matriculas' => fn ($q) => $q
                    ->when($cicloActivo, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloActivo->id))
                    ->with('grado'),
            ])
            ->orderBy('apellido')
            ->orderBy('nombre')
            ->get(['id', 'apellido', 'nombre', 'dni'])
            ->map(function ($alumno) {
                /** @var Alumno $alumno */
                $grado = $alumno->matriculas->first()?->grado;

                return [
                    'id' => $alumno->id,
                    'apellido' => $alumno->apellido,
                    'nombre' => $alumno->nombre,
                    'dni' => $alumno->dni,
                    'grado_id' => $grado?->id,
                    'grado_nombre' => $grado?->nombre_completo ?? 'Sin matricular en ciclo activo',
                ];
            });

        return Inertia::render('inclusion/create', [
            'alumnos' => $alumnosDisponibles,
            'grados' => $grados,
            'cicloActivo' => $cicloActivo,
            'docentesPedagogicos' => $this->obtenerMais(),
            'permiteSinGrado' => $alcance === 'total',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->autorizarGestionLegajo($user);

        $validated = $request->validate([
            'alumno_id' => ['required', 'exists:alumnos,id', 'unique:legajos_inclusion,alumno_id'],
            'diagnostico' => ['required', 'string', 'max:255'],
            'posee_cud' => ['required', 'boolean'],
            'vencimiento_cud' => ['nullable', 'required_if:posee_cud,true', 'date'],
            'archivo_cud' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'docente_integrador_id' => ['nullable', 'exists:users,id'],
            'enviar_correo' => ['nullable', 'boolean'],
            'observaciones_ppi' => ['nullable', 'string'],
        ]);

        // Si es Vicedirector, validar que el alumno pertenezca a un grado de sus docentes a cargo
        if ($this->resolverRolAlcance($user) === 'vicedirector') {
            $docentesViceIds = $this->obtenerDocentesACargoIds($user);
            $cicloActivo = CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first();

            $alumnoHabilitado = Alumno::whereKey($validated['alumno_id'])
                ->whereHas('matriculas', function (Builder $mq) use ($cicloActivo, $docentesViceIds) {
                    $mq->when($cicloActivo, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloActivo->id))
                        ->whereHas('grado', fn (Builder $gq) => $gq->whereIn('docente_titular_id', $docentesViceIds));
                })
                ->exists();

            abort_unless($alumnoHabilitado, 403, 'El alumno seleccionado no pertenece a los grados de tus docentes a cargo.');
        }

        $enviarCorreo = $request->boolean('enviar_correo');
        unset($validated['enviar_correo']);

        if (! empty($validated['docente_integrador_id'])) {
            $docente = User::role('docente-pedagogico')->find($validated['docente_integrador_id']);
            abort_unless($docente !== null, 422, 'El usuario seleccionado no tiene el rol de MAI / Docente Pedagógico.');

            $validated['docente_integrador'] = "{$docente->apellido}, {$docente->name}";
            $validated['docente_integrador_email'] = $docente->email;
        } else {
            $validated['docente_integrador_id'] = null;
            $validated['docente_integrador'] = null;
            $validated['docente_integrador_email'] = null;
        }

        if ($request->hasFile('archivo_cud')) {
            $validated['archivo_cud'] = $request->file('archivo_cud')->store('cud_archivos', 'local');
        }

        $legajo = LegajoInclusion::create($validated);

        $mensaje = 'Legajo de inclusión creado exitosamente.';

        if ($enviarCorreo && ! empty($legajo->docente_integrador_email)) {
            $enviado = $this->notificarDocenteIntegrador($legajo, false);
            $mensaje .= $enviado
                ? " Se envió la notificación con los datos y el CUD a {$legajo->docente_integrador_email}."
                : ' No se pudo enviar el correo electrónico (verificá la conexión SMTP).';
        }

        return redirect()->route('inclusion.show', $legajo->id)->with('success', $mensaje);
    }

    public function edit(Request $request, LegajoInclusion $inclusion): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->autorizarGestionLegajo($user, $inclusion);

        $inclusion->load('alumno');
        $inclusion->archivo_url = $inclusion->archivo_cud
            ? route('inclusion.descargar-cud', $inclusion->id)
            : null;

        return Inertia::render('inclusion/edit', [
            'legajo' => $inclusion,
            'docentesPedagogicos' => $this->obtenerMais(),
        ]);
    }

    public function update(Request $request, LegajoInclusion $inclusion): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->autorizarGestionLegajo($user, $inclusion);

        $validated = $request->validate([
            'diagnostico' => ['required', 'string', 'max:255'],
            'posee_cud' => ['required', 'boolean'],
            'vencimiento_cud' => ['nullable', 'required_if:posee_cud,true', 'date'],
            'archivo_cud' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'docente_integrador_id' => ['nullable', 'exists:users,id'],
            'enviar_correo' => ['nullable', 'boolean'],
            'observaciones_ppi' => ['nullable', 'string'],
        ]);
        $enviarCorreo = $request->boolean('enviar_correo');
        unset($validated['enviar_correo'], $validated['archivo_cud']);

        if (! empty($validated['docente_integrador_id'])) {
            $docente = User::role('docente-pedagogico')->find($validated['docente_integrador_id']);
            abort_unless($docente !== null, 422, 'El usuario seleccionado no tiene el rol de MAI / Docente Pedagógico.');

            $validated['docente_integrador'] = "{$docente->apellido}, {$docente->name}";
            $validated['docente_integrador_email'] = $docente->email;
        } else {
            $validated['docente_integrador_id'] = null;
            $validated['docente_integrador'] = null;
            $validated['docente_integrador_email'] = null;
        }

        if ($request->hasFile('archivo_cud')) {
            if ($inclusion->archivo_cud && Storage::disk('local')->exists($inclusion->archivo_cud)) {
                Storage::disk('local')->delete($inclusion->archivo_cud);
            }
            $validated['archivo_cud'] = $request->file('archivo_cud')->store('cud_archivos', 'local');
        }

        if (! $validated['posee_cud']) {
            $validated['vencimiento_cud'] = null;
            if ($inclusion->archivo_cud && ! isset($validated['archivo_cud'])) {
                Storage::disk('local')->delete($inclusion->archivo_cud);
                $validated['archivo_cud'] = null;
            }
        }

        $inclusion->update($validated);

        $mensaje = 'Legajo actualizado correctamente.';

        if ($enviarCorreo && ! empty($inclusion->docente_integrador_email)) {
            $enviado = $this->notificarDocenteIntegrador($inclusion, true);
            $mensaje .= $enviado
                ? " Se envió una actualización por correo a {$inclusion->docente_integrador_email}."
                : ' No se pudo enviar el correo electrónico (verificá la conexión SMTP).';
        }

        return redirect()->route('inclusion.index')->with('success', $mensaje);
    }

    private function notificarDocenteIntegrador(LegajoInclusion $legajo, bool $esActualizacion): bool
    {
        try {
            $cicloActivo = CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first();

            $legajo->load([
                'alumno.matriculas' => fn ($q) => $q
                    ->when($cicloActivo, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloActivo->id))
                    ->with('grado.docenteTitular'),
            ]);

            $grado = $legajo->alumno?->matriculas?->first()?->grado;

            $datosCurso = [
                'grado' => $grado?->nombre_completo ?? 'Sin matricular en el ciclo activo',
                'docente_aula' => $grado?->docenteTitular
                    ? "{$grado->docenteTitular->apellido}, {$grado->docenteTitular->name}"
                    : null,
            ];

            Mail::to($legajo->docente_integrador_email)
                ->send(new LegajoInclusionMail($legajo, $datosCurso, $esActualizacion));

            return true;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }

    public function destroy(Request $request, LegajoInclusion $inclusion): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->autorizarGestionLegajo($user, $inclusion);

        if ($inclusion->archivo_cud && Storage::disk('local')->exists($inclusion->archivo_cud)) {
            Storage::disk('local')->delete($inclusion->archivo_cud);
        }

        $inclusion->delete();

        return redirect()->route('inclusion.index')->with('success', 'Legajo de inclusión eliminado.');
    }

    public function exportarExcel(Request $request): StreamedResponse|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $alcance = $this->resolverRolAlcance($user);

        abort_unless(
            in_array($alcance, ['total', 'vicedirector', 'mai'], true),
            403,
            'No tenés autorización para exportar la nómina de inclusión.'
        );

        $gradosIds = array_filter(array_map('intval', (array) $request->input('grados', [])));
        $incluirSinGrado = $alcance === 'total' && $request->boolean('sin_grado');

        $cicloActivo = CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first();
        $cicloId = $request->filled('ciclo_id')
            ? (int) $request->input('ciclo_id')
            : $cicloActivo?->id;

        $ciclo = $cicloId ? CicloLectivo::find($cicloId) : $cicloActivo;
        $anio = $ciclo?->anio ?? date('Y');

        $legajosQuery = LegajoInclusion::query();
        $this->aplicarFiltroScopeLegajos($legajosQuery, $user, $cicloId);

        $legajos = $legajosQuery
            ->with([
                'alumno.matriculas' => fn ($q) => $q
                    ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                    ->with('grado.docenteTitular'),
            ])
            ->get()
            ->map(function ($legajo) {
                /** @var LegajoInclusion $legajo */
                $matricula = $legajo->alumno?->matriculas?->first();
                $grado = $matricula?->grado;

                return [
                    'legajo' => $legajo,
                    'alumno' => $legajo->alumno,
                    'grado' => $grado,
                ];
            })
            ->filter(function (array $item) use ($gradosIds, $incluirSinGrado) {
                if (! $item['alumno']) {
                    return false;
                }

                if (empty($gradosIds) && ! $incluirSinGrado) {
                    return true;
                }

                if ($item['grado'] === null) {
                    return $incluirSinGrado;
                }

                return in_array($item['grado']->id, $gradosIds, true);
            })
            ->sortBy(function (array $item) {
                $g = $item['grado'];
                $ordenGrado = $g
                    ? sprintf('%02d-%s-%s', $g->numero, $g->division, $g->turno)
                    : '99-ZZZ-ZZZ';
                $ordenAlumno = mb_strtoupper("{$item['alumno']->apellido} {$item['alumno']->nombre}", 'UTF-8');

                return "{$ordenGrado}|{$ordenAlumno}";
            })
            ->values();

        if ($legajos->isEmpty()) {
            return back()->with('error', 'No se encontraron alumnos en inclusión escolar para los filtros elegidos.');
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Inclusión Escolar');

        $sheet->setCellValue('A1', 'Gabinete e Inclusión Escolar - Nómina de Alumnos con Seguimiento PPI');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);

        $sheet->setCellValue('A2', "660030900 - DOCTOR MARIANO BOEDO EX N° 129 - Primario - Común (Ciclo Lectivo {$anio})");
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10);

        $subtitulo = $alcance === 'mai'
            ? "MAI / Docente Pedagógico: {$user->apellido}, {$user->name} | Total alumnos a cargo: " . $legajos->count()
            : 'Listado agrupado por Grado y Sección | Total alumnos listados: ' . $legajos->count();

        $sheet->setCellValue('A3', $subtitulo);
        $sheet->getStyle('A3')->getFont()->setItalic(true)->setSize(9)->getColor()->setRGB('1E3A8A');

        $encabezados = [
            'Grado y Sección',
            'Turno',
            'Apellidos',
            'Nombres',
            'DNI',
            'Diagnóstico Principal',
            'Docente de Aula',
            'MAI / Docente Integrador',
            'Estado CUD',
            'Vencimiento CUD',
            'Observaciones / PPI',
        ];

        $sheet->fromArray($encabezados, null, 'A5');

        $sheet->getStyle('A5:K5')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 10,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A8A'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CBD5E1'],
                ],
            ],
        ]);
        $sheet->getRowDimension(5)->setRowHeight(22);

        $filaActual = 6;
        foreach ($legajos as $item) {
            /** @var LegajoInclusion $leg */
            $leg = $item['legajo'];
            $al = $item['alumno'];
            $gr = $item['grado'];

            $etiquetaSeccion = $gr ? "{$gr->numero}° Grado \"{$gr->division}\"" : 'Sin matricular';
            $turno = $gr?->turno ?? '—';
            $docenteAula = $gr?->docenteTitular
                ? "{$gr->docenteTitular->apellido}, {$gr->docenteTitular->name}"
                : 'Sin asignar';

            $estadoCudTexto = 'Sin CUD';
            if ($leg->posee_cud) {
                if ($leg->vencimiento_cud) {
                    $dias = Carbon::now()->startOfDay()->diffInDays(Carbon::parse($leg->vencimiento_cud)->startOfDay(), false);
                    $estadoCudTexto = $dias < 0 ? 'Vencido' : ($dias <= 30 ? 'Por vencer' : 'Vigente');
                } else {
                    $estadoCudTexto = 'Vigente';
                }
            }

            $sheet->setCellValue("A{$filaActual}", $etiquetaSeccion);
            $sheet->setCellValue("B{$filaActual}", $turno);
            $sheet->setCellValue("C{$filaActual}", $al->apellido);
            $sheet->setCellValue("D{$filaActual}", $al->nombre);
            $sheet->setCellValueExplicit("E{$filaActual}", (string) $al->dni, DataType::TYPE_STRING);
            $sheet->setCellValue("F{$filaActual}", $leg->diagnostico);
            $sheet->setCellValue("G{$filaActual}", $docenteAula);
            $sheet->setCellValue("H{$filaActual}", $leg->docente_integrador ?: 'No asignado');
            $sheet->setCellValue("I{$filaActual}", $estadoCudTexto);
            $sheet->setCellValue(
                "J{$filaActual}",
                $leg->vencimiento_cud ? Carbon::parse($leg->vencimiento_cud)->format('d/m/Y') : '—'
            );
            $sheet->setCellValue("K{$filaActual}", $leg->observaciones_ppi ?: '');

            $sheet->getStyle("A{$filaActual}:K{$filaActual}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);

            $filaActual++;
        }

        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getColumnDimension('K')->setWidth(45);
        $sheet->getStyle('K5:K' . ($filaActual - 1))->getAlignment()->setWrapText(true);

        $nombreArchivo = "Inclusion_Escolar_Ciclo_{$anio}.xlsx";
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function descargarCud(Request $request, LegajoInclusion $inclusion)
    {
        /** @var User $user */
        $user = $request->user();
        $this->autorizarAccesoExpediente($user, $inclusion);

        if (! $inclusion->archivo_cud || ! Storage::disk('local')->exists($inclusion->archivo_cud)) {
            abort(404, 'El documento CUD no se encuentra disponible.');
        }

        $rutaAbsoluta = Storage::disk('local')->path($inclusion->archivo_cud);
        $mimeType = mime_content_type($rutaAbsoluta) ?: 'application/octet-stream';

        return response()->file($rutaAbsoluta, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . basename($rutaAbsoluta) . '"',
        ]);
    }
}