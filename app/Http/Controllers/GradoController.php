<?php

namespace App\Http\Controllers;

use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\Materia;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GradoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar grados'), only: ['index', 'exportarExcel', 'alumnos']),
            new Middleware(PermissionMiddleware::using('crear grados'), only: ['create', 'store']),
            new Middleware(PermissionMiddleware::using('editar grados'), only: ['edit', 'update', 'editMaterias', 'updateMaterias']),
            new Middleware(PermissionMiddleware::using('eliminar grados'), only: ['destroy']),
        ];
    }

    /**
     * Determina el alcance de visualización del usuario sobre los grados:
     * - total: super-admin, director, administrativo
     * - vicedirector: grados de los docentes titulares a su cargo
     * - docente: únicamente el/los grado(s) donde es docente titular
     */
    private function resolverAlcanceGrados(?User $user): string
    {
        if (!$user) {
            return 'ninguno';
        }

        if ($user->hasAnyRole(['super-admin', 'director', 'administrativo'])) {
            return 'total';
        }

        if ($user->hasRole('vicedirector')) {
            return 'vicedirector';
        }

        if ($user->hasRole('docente')) {
            return 'docente';
        }

        return 'ninguno';
    }

    private function obtenerDocentesACargoIds(User $vicedirector): array
    {
        return User::where('vicedirector_id', $vicedirector->id)
            ->pluck('id')
            ->map(fn($id) => (int) $id)
            ->all();
    }

    private function obtenerDocentesDisponibles(?User $user)
    {
        $alcance = $this->resolverAlcanceGrados($user);

        $query = User::role('docente')
            ->where('estado', true)
            ->orderBy('apellido')
            ->orderBy('name');

        if ($alcance === 'vicedirector' && $user) {
            $query->where('vicedirector_id', $user->id);
        } elseif (!in_array($alcance, ['total', 'vicedirector'], true)) {
            $query->whereRaw('1 = 0');
        }

        return $query->get(['id', 'dni', 'apellido', 'name']);
    }

    private function reglasDocenteTitular(?User $user): array
    {
        $alcance = $this->resolverAlcanceGrados($user);

        return [
            'nullable',
            'integer',
            function (string $attribute, mixed $value, \Closure $fail) use ($alcance, $user) {
                if ($value === null || $value === '') {
                    return;
                }

                if (!in_array($alcance, ['total', 'vicedirector'], true)) {
                    $fail('No tenés autorización para asignar un docente titular.');
                    return;
                }

                $query = User::role('docente')
                    ->where('estado', true)
                    ->where('id', (int) $value);

                if ($alcance === 'vicedirector' && $user) {
                    $query->where('vicedirector_id', $user->id);
                }

                if (!$query->exists()) {
                    $fail(
                        $alcance === 'vicedirector'
                        ? 'El docente seleccionado no es válido o no se encuentra bajo tu cargo.'
                        : 'El docente titular seleccionado no es válido o está inactivo.'
                    );
                }
            },
        ];
    }

    private function aplicarFiltroScopeGrados(EloquentBuilder|QueryBuilder $query, ?User $user): void
    {
        $alcance = $this->resolverAlcanceGrados($user);

        if ($alcance === 'total') {
            return;
        }

        if ($alcance === 'vicedirector' && $user) {
            $docentesIds = $this->obtenerDocentesACargoIds($user);
            $query->where(function ($q) use ($docentesIds) {
                if (!empty($docentesIds)) {
                    $q->whereIn('docente_titular_id', $docentesIds);
                }
                $q->orWhereNull('docente_titular_id');
            });
            return;
        }

        if ($alcance === 'docente' && $user) {
            $query->where('docente_titular_id', $user->id);
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function autorizarAccesoGrado(?User $user, Grado $grado): void
    {
        $alcance = $this->resolverAlcanceGrados($user);

        if ($alcance === 'total') {
            return;
        }

        if ($alcance === 'vicedirector' && $user) {
            $docentesIds = $this->obtenerDocentesACargoIds($user);
            $pertenece = $grado->docente_titular_id !== null
                && in_array((int) $grado->docente_titular_id, $docentesIds, true);

            abort_unless($pertenece, 403, 'Este grado no corresponde a los docentes a tu cargo.');
            return;
        }

        if ($alcance === 'docente' && $user) {
            abort_unless(
                (int) $grado->docente_titular_id === (int) $user->id,
                403,
                'Solo podés acceder al grado en el que estás asignado como docente titular.'
            );
            return;
        }

        abort(403, 'No tenés autorización para acceder a este grado.');
    }

    public function index(Request $request): Response
    {
        /** @var User|null $user */
        $user = $request->user();
        $alcance = $this->resolverAlcanceGrados($user);

        $ciclos = CicloLectivo::orderByDesc('anio')->get(['id', 'anio', 'cerrado']);
        $cicloActivo = $ciclos->firstWhere('cerrado', false);

        $cicloId = $request->filled('ciclo_id')
            ? (int) $request->input('ciclo_id')
            : ($cicloActivo?->id ?? $ciclos->first()?->id);

        $cicloSeleccionado = $ciclos->firstWhere('id', $cicloId);
        $numero = $request->input('numero');
        $turno = $request->input('turno');
        $buscar = trim((string) $request->input('buscar', ''));

        $gradosQuery = Grado::query()
            ->with([
                'cicloLectivo',
                'docenteTitular',
                'materias' => fn($q) => $q->where('materias.estado', true),
            ])
            ->withCount('matriculas')
            ->when($cicloId, function ($query) use ($cicloId) {
                $query->where('ciclo_lectivo_id', $cicloId);
            })
            ->when($numero, function ($query) use ($numero) {
                $query->where('numero', (int) $numero);
            })
            ->when($turno, function ($query, $turno) {
                $query->where('turno', $turno);
            })
            ->when($buscar !== '', function ($query) use ($buscar) {
                $texto = mb_strtolower($buscar, 'UTF-8');
                $texto = str_replace(
                    ['á', 'é', 'í', 'ó', 'ú'],
                    ['a', 'e', 'i', 'o', 'u'],
                    $texto
                );

                $ordinales = [
                    'primero' => '1',
                    'primer' => '1',
                    '1ro' => '1',
                    '1er' => '1',
                    'segundo' => '2',
                    '2do' => '2',
                    'tercero' => '3',
                    'tercer' => '3',
                    '3ro' => '3',
                    '3er' => '3',
                    'cuarto' => '4',
                    '4to' => '4',
                    'quinto' => '5',
                    '5to' => '5',
                    'sexto' => '6',
                    '6to' => '6',
                    'septimo' => '7',
                    '7mo' => '7',
                ];
                $texto = str_replace(array_keys($ordinales), array_values($ordinales), $texto);

                $texto = preg_replace('/\bgrados?\b/u', ' ', $texto);
                $texto = preg_replace('/[°º\-_\/\.]+/u', ' ', $texto);
                $texto = trim((string) preg_replace('/\s+/u', ' ', $texto));

                $numeroBuscado = null;
                $divisionBuscada = null;

                if (preg_match('/\b([1-7])\b/', $texto, $matchNum)) {
                    $numeroBuscado = (int) $matchNum[1];
                    $resto = trim((string) preg_replace('/\b[1-7]\b/', '', $texto, 1));
                    if ($resto !== '') {
                        $divisionBuscada = mb_strtoupper($resto, 'UTF-8');
                    }
                } elseif (preg_match('/^([1-7])\s*([a-zA-Z]+)$/u', $texto, $matchPegado)) {
                    $numeroBuscado = (int) $matchPegado[1];
                    $divisionBuscada = mb_strtoupper($matchPegado[2], 'UTF-8');
                } else {
                    $divisionBuscada = mb_strtoupper($texto, 'UTF-8');
                }

                $query->where(function ($q) use ($numeroBuscado, $divisionBuscada, $buscar) {
                    if ($numeroBuscado !== null && $divisionBuscada !== null) {
                        $q->where('numero', $numeroBuscado)
                            ->where('division', 'like', "%{$divisionBuscada}%");
                    } elseif ($numeroBuscado !== null) {
                        $q->where('numero', $numeroBuscado);
                    } elseif ($divisionBuscada !== null) {
                        $q->where('division', 'like', "%{$divisionBuscada}%")
                            ->orWhere('aula', 'like', "%{$buscar}%");
                    }
                });
            });

        $this->aplicarFiltroScopeGrados($gradosQuery, $user);

        $grados = $gradosQuery
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno')
            ->paginate(5)
            ->withQueryString();

        $gradosDisponiblesQuery = Grado::query()
            ->withCount('matriculas')
            ->when($cicloId, fn($q) => $q->where('ciclo_lectivo_id', $cicloId));

        $this->aplicarFiltroScopeGrados($gradosDisponiblesQuery, $user);

        $gradosDisponibles = $gradosDisponiblesQuery
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno')
            ->get(['id', 'ciclo_lectivo_id', 'numero', 'division', 'turno']);

        return Inertia::render('grados/index', [
            'grados' => $grados,
            'gradosDisponibles' => $gradosDisponibles,
            'ciclos' => $ciclos,
            'cicloSeleccionado' => $cicloSeleccionado,
            'cicloSeleccionadoCerrado' => (bool) ($cicloSeleccionado?->cerrado ?? false),
            'puedeEditarDatosGrado' => (bool) ($user?->hasAnyRole(['super-admin', 'director']) ?? false),
            'esDocente' => $alcance === 'docente',
            'filtros' => [
                'ciclo_id' => $cicloId ? (string) $cicloId : '',
                'numero' => $numero ? (string) $numero : '',
                'turno' => $turno ?? '',
                'buscar' => $buscar,
            ],
        ]);
    }

    public function alumnos(Request $request, Grado $grado): Response
    {
        $this->autorizarAccesoGrado($request->user(), $grado);

        $grado->load([
            'cicloLectivo',
            'docenteTitular',
        ]);

        $buscar = trim((string) $request->input('buscar', ''));

        $totalMatriculados = $grado->matriculas()
            ->whereHas('alumno')
            ->count();

        $alumnos = $grado->matriculas()
            ->whereHas('alumno')
            ->join('alumnos', 'matriculas.alumno_id', '=', 'alumnos.id')
            ->select('matriculas.*')
            ->with('alumno')
            ->when($buscar !== '', function ($query) use ($buscar) {
                $like = '%' . $buscar . '%';
                $query->where(function ($q) use ($like) {
                    $q->where('alumnos.apellido', 'like', $like)
                        ->orWhere('alumnos.nombre', 'like', $like)
                        ->orWhere('alumnos.dni', 'like', $like)
                        ->orWhere('alumnos.legajo', 'like', $like)
                        ->orWhere('alumnos.tutor_nombre', 'like', $like)
                        ->orWhereRaw("CONCAT(alumnos.apellido, ' ', alumnos.nombre) LIKE ?", [$like])
                        ->orWhereRaw("CONCAT(alumnos.nombre, ' ', alumnos.apellido) LIKE ?", [$like]);
                });
            })
            ->orderBy('alumnos.apellido')
            ->orderBy('alumnos.nombre')
            ->paginate(5)
            ->withQueryString()
            ->through(function ($matricula) {
                $al = $matricula->alumno;

                return [
                    'id' => $al->id,
                    'matricula_id' => $matricula->id,
                    'legajo' => $al->legajo,
                    'apellido' => $al->apellido,
                    'nombre' => $al->nombre,
                    'dni' => $al->dni,
                    'fecha_nacimiento' => $al->fecha_nacimiento?->format('d/m/Y') ?? '—',
                    'tutor_nombre' => $al->tutor_nombre ?? '—',
                    'tutor_telefono' => $al->tutor_telefono ?? '—',
                    'recibe_copa_leche' => (bool) $al->recibe_copa_leche,
                    'estado' => (bool) $al->estado,
                ];
            });

        return Inertia::render('grados/alumnos', [
            'grado' => [
                'id' => $grado->id,
                'nombre_completo' => $grado->nombre_completo,
                'numero' => $grado->numero,
                'division' => $grado->division,
                'turno' => $grado->turno,
                'aula' => $grado->aula,
                'ciclo_anio' => $grado->cicloLectivo?->anio,
                'docente_titular' => $grado->docenteTitular
                    ? "{$grado->docenteTitular->apellido}, {$grado->docenteTitular->name}"
                    : null,
            ],
            'alumnos' => $alumnos,
            'totalMatriculados' => $totalMatriculados,
            'filtros' => [
                'buscar' => $buscar,
            ],
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        $ciclosAbiertos = CicloLectivo::where('cerrado', false)
            ->orderByDesc('anio')
            ->get();

        if ($ciclosAbiertos->isEmpty()) {
            return redirect()->route('grados.index')
                ->with('error', 'No hay ningún ciclo lectivo activo. Aperture un ciclo lectivo antes de crear grados.');
        }

        return Inertia::render('grados/create', [
            'ciclosLectivos' => $ciclosAbiertos,
            'docentes' => $this->obtenerDocentesDisponibles($request->user()),
            'materias' => Materia::where('estado', true)
                ->orderBy('es_especial')
                ->orderBy('nombre')
                ->get(['id', 'codigo', 'nombre', 'es_especial']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ciclo_lectivo_id' => [
                'required',
                Rule::exists('ciclos_lectivos', 'id')->where('cerrado', false),
            ],
            'docente_titular_id' => $this->reglasDocenteTitular($request->user()),
            'numero' => ['required', 'integer', 'between:1,7'],
            'division' => [
                'required',
                'string',
                'max:10',
                Rule::unique('grados')->where(function ($query) use ($request) {
                    return $query->where('ciclo_lectivo_id', $request->ciclo_lectivo_id)
                        ->where('numero', $request->numero)
                        ->where('division', strtoupper(trim((string) $request->division)))
                        ->where('turno', $request->turno);
                }),
            ],
            'turno' => ['required', 'in:Mañana,Tarde'],
            'aula' => ['nullable', 'string', 'max:50'],
            'estado' => ['required', 'boolean'],
            'materias' => ['nullable', 'array'],
            'materias.*' => ['integer', 'exists:materias,id'],
        ], [
            'ciclo_lectivo_id.exists' => 'No se pueden crear grados en un ciclo lectivo cerrado.',
            'division.unique' => 'Ya existe este grado, división y turno en el ciclo lectivo seleccionado.',
        ]);

        $validated['division'] = strtoupper(trim($validated['division']));
        $materiasIds = $validated['materias'] ?? [];
        unset($validated['materias']);

        $grado = Grado::create($validated);
        $grado->materias()->sync($materiasIds);

        return redirect()->route('grados.index')
            ->with('success', 'Grado creado y materias vinculadas correctamente.');
    }

    public function edit(Request $request, Grado $grado): Response|RedirectResponse
    {
        abort_unless(
            $request->user()?->hasAnyRole(['super-admin', 'director']),
            403,
            'Solo el Super Administrador y Director pueden editar los datos principales del grado.'
        );

        $grado->load('cicloLectivo');

        if ($grado->cicloLectivo?->cerrado) {
            return redirect()->route('grados.index', ['ciclo_id' => $grado->ciclo_lectivo_id])
                ->with('error', 'Este grado pertenece a un ciclo lectivo cerrado y no puede modificarse.');
        }

        return Inertia::render('grados/edit', [
            'grado' => [
                'id' => $grado->id,
                'ciclo_lectivo_id' => $grado->ciclo_lectivo_id,
                'docente_titular_id' => $grado->docente_titular_id,
                'numero' => $grado->numero,
                'division' => $grado->division,
                'turno' => $grado->turno,
                'aula' => $grado->aula ?? '',
                'estado' => $grado->estado,
            ],
            'ciclosLectivos' => CicloLectivo::where('cerrado', false)->orderByDesc('anio')->get(),
            'docentes' => $this->obtenerDocentesDisponibles($request->user()),
        ]);
    }

    public function update(Request $request, Grado $grado): RedirectResponse
    {
        abort_unless(
            $request->user()?->hasAnyRole(['super-admin', 'director']),
            403,
            'Solo el Super Administrador y Director pueden editar los datos principales del grado.'
        );

        $grado->load('cicloLectivo');

        if ($grado->cicloLectivo?->cerrado) {
            return redirect()->route('grados.index', ['ciclo_id' => $grado->ciclo_lectivo_id])
                ->with('error', 'No se puede modificar un grado de un ciclo lectivo cerrado.');
        }

        $validated = $request->validate([
            'ciclo_lectivo_id' => [
                'required',
                Rule::exists('ciclos_lectivos', 'id')->where('cerrado', false),
            ],
            'docente_titular_id' => $this->reglasDocenteTitular($request->user()),
            'numero' => ['required', 'integer', 'between:1,7'],
            'division' => [
                'required',
                'string',
                'max:10',
                Rule::unique('grados')->where(function ($query) use ($request) {
                    return $query->where('ciclo_lectivo_id', $request->ciclo_lectivo_id)
                        ->where('numero', $request->numero)
                        ->where('division', strtoupper(trim((string) $request->division)))
                        ->where('turno', $request->turno);
                })->ignore($grado->id),
            ],
            'turno' => ['required', 'in:Mañana,Tarde'],
            'aula' => ['nullable', 'string', 'max:50'],
            'estado' => ['required', 'boolean'],
        ], [
            'ciclo_lectivo_id.exists' => 'El ciclo lectivo seleccionado está cerrado.',
            'division.unique' => 'Ya existe otro grado con el mismo número, división y turno en este ciclo lectivo.',
        ]);

        $validated['division'] = strtoupper(trim($validated['division']));

        $grado->update($validated);

        return redirect()->route('grados.index')
            ->with('success', 'Datos del grado actualizados correctamente.');
    }

    public function editMaterias(Request $request, Grado $grado): Response|RedirectResponse
    {
        $this->autorizarAccesoGrado($request->user(), $grado);

        $grado->load(['materias:id', 'cicloLectivo', 'docenteTitular']);

        if ($grado->cicloLectivo?->cerrado) {
            return redirect()->route('grados.index', ['ciclo_id' => $grado->ciclo_lectivo_id])
                ->with('error', 'Este grado pertenece a un ciclo lectivo cerrado y no puede modificarse.');
        }

        return Inertia::render('grados/materias', [
            'grado' => [
                'id' => $grado->id,
                'nombre_completo' => $grado->nombre_completo,
                'numero' => $grado->numero,
                'division' => $grado->division,
                'turno' => $grado->turno,
                'aula' => $grado->aula ?? '',
                'ciclo_anio' => $grado->cicloLectivo?->anio,
                'docente_titular' => $grado->docenteTitular
                    ? "{$grado->docenteTitular->apellido}, {$grado->docenteTitular->name}"
                    : null,
                'materias_ids' => $grado->materias->pluck('id')->toArray(),
            ],
            'materias' => Materia::where('estado', true)
                ->orderBy('es_especial')
                ->orderBy('nombre')
                ->get(['id', 'codigo', 'nombre', 'es_especial']),
        ]);
    }

    public function updateMaterias(Request $request, Grado $grado): RedirectResponse
    {
        $this->autorizarAccesoGrado($request->user(), $grado);

        $grado->load('cicloLectivo');

        if ($grado->cicloLectivo?->cerrado) {
            return redirect()->route('grados.index', ['ciclo_id' => $grado->ciclo_lectivo_id])
                ->with('error', 'No se pueden modificar las materias de un grado en un ciclo lectivo cerrado.');
        }

        $validated = $request->validate([
            'materias' => ['nullable', 'array'],
            'materias.*' => ['integer', 'exists:materias,id'],
        ]);

        $grado->materias()->sync($validated['materias'] ?? []);

        return redirect()->route('grados.index')
            ->with('success', 'Materias del grado actualizadas correctamente.');
    }

    public function destroy(Request $request, Grado $grado): RedirectResponse
    {
        $this->autorizarAccesoGrado($request->user(), $grado);

        $grado->load('cicloLectivo');

        if ($grado->cicloLectivo?->cerrado) {
            return back()->with(
                'error',
                'No se puede eliminar un grado perteneciente a un ciclo lectivo cerrado.'
            );
        }

        if ($grado->matriculas()->exists()) {
            return back()->with(
                'error',
                'No se puede eliminar el grado porque posee alumnos matriculados.'
            );
        }

        $grado->delete();

        return redirect()->route('grados.index')
            ->with('success', 'Grado eliminado correctamente.');
    }

    public function exportarExcel(Request $request): StreamedResponse|RedirectResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        $gradosIds = array_filter(array_map('intval', (array) $request->input('grados', [])));
        $cicloId = $request->input('ciclo_id');

        $query = Grado::query()
            ->with([
                'cicloLectivo',
                'docenteTitular',
                'matriculas.alumno',
            ])
            ->orderBy('numero')
            ->orderBy('division')
            ->orderBy('turno');

        $this->aplicarFiltroScopeGrados($query, $user);

        if (!empty($gradosIds)) {
            $query->whereIn('id', $gradosIds);
        } elseif ($cicloId) {
            $query->where('ciclo_lectivo_id', (int) $cicloId);
        } else {
            $cicloActivo = CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first();
            if ($cicloActivo) {
                $query->where('ciclo_lectivo_id', $cicloActivo->id);
            }
        }

        $grados = $query->get();

        if ($grados->isEmpty()) {
            if (!empty($gradosIds) && $this->resolverAlcanceGrados($user) !== 'total') {
                abort(403, 'No tenés autorización para exportar la nómina de los grados seleccionados.');
            }

            return back()->with('error', 'No se encontraron grados para exportar con los criterios seleccionados.');
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        $ordinalesCortos = [
            1 => '1ro',
            2 => '2do',
            3 => '3ro',
            4 => '4to',
            5 => '5to',
            6 => '6to',
            7 => '7mo',
        ];

        $nombresUsados = [];

        foreach ($grados as $grado) {
            $turnoAbrev = $grado->turno === 'Mañana' ? 'TM' : 'TT';
            $tituloBase = "{$grado->numero}° {$grado->division} ({$turnoAbrev})";
            $tituloHoja = $tituloBase;
            $contador = 2;
            while (in_array($tituloHoja, $nombresUsados, true)) {
                $tituloHoja = "{$tituloBase} ({$contador})";
                $contador++;
            }
            $nombresUsados[] = $tituloHoja;

            $sheet = new Worksheet($spreadsheet, $tituloHoja);
            $spreadsheet->addSheet($sheet);

            $ordinal = $ordinalesCortos[$grado->numero] ?? "{$grado->numero}°";
            $anio = $grado->cicloLectivo?->anio ?? date('Y');
            $docente = $grado->docenteTitular
                ? "{$grado->docenteTitular->apellido}, {$grado->docenteTitular->name}"
                : 'Sin asignar';

            $sheet->setCellValue('A1', 'Alumnos');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);

            $sheet->setCellValue('A2', "660030900 - DOCTOR MARIANO BOEDO EX N° 129 - Primario - Común (Ciclo Lectivo {$anio})");
            $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10);

            $sheet->setCellValue('A3', "{$ordinal} Grado/Año - {$grado->division} | Ciclo Básico - PRIMARIO COMÚN - {$grado->turno}");
            $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(10)->getColor()->setRGB('1E3A8A');

            $sheet->setCellValue('A4', "Docente Titular: {$docente}" . ($grado->aula ? " | Aula: {$grado->aula}" : ''));
            $sheet->getStyle('A4')->getFont()->setItalic(true)->setSize(9)->getColor()->setRGB('4B5563');

            $encabezados = [
                'Apellidos',
                'Nombres',
                'Tipo doc.',
                'Nro. doc.',
                'Fecha nac.',
                'Legajo',
                'Tutor Responsable',
                'Teléfono Tutor',
                'Copa de Leche',
                'Condición',
            ];

            $sheet->fromArray($encabezados, null, 'A5');

            $headerRange = 'A5:J5';
            $sheet->getStyle($headerRange)->applyFromArray([
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

            $matriculasOrdenadas = $grado->matriculas
                ->filter(fn($m) => $m->alumno !== null)
                ->sortBy(fn($m) => mb_strtoupper("{$m->alumno->apellido} {$m->alumno->nombre}", 'UTF-8'))
                ->values();

            $filaActual = 6;
            foreach ($matriculasOrdenadas as $matricula) {
                $alumno = $matricula->alumno;

                $sheet->setCellValue("A{$filaActual}", $alumno->apellido);
                $sheet->setCellValue("B{$filaActual}", $alumno->nombre);
                $sheet->setCellValue("C{$filaActual}", 'DNI');
                $sheet->setCellValueExplicit("D{$filaActual}", (string) $alumno->dni, DataType::TYPE_STRING);
                $sheet->setCellValue(
                    "E{$filaActual}",
                    $alumno->fecha_nacimiento ? $alumno->fecha_nacimiento->format('d/m/Y') : ''
                );
                $sheet->setCellValue("F{$filaActual}", $alumno->legajo);
                $sheet->setCellValue("G{$filaActual}", $alumno->tutor_nombre);
                $sheet->setCellValueExplicit("H{$filaActual}", (string) $alumno->tutor_telefono, DataType::TYPE_STRING);
                $sheet->setCellValue("I{$filaActual}", $alumno->recibe_copa_leche ? 'Sí' : 'No');
                $sheet->setCellValue("J{$filaActual}", $alumno->estado ? 'Regular' : 'Inactivo / Pase');

                $sheet->getStyle("A{$filaActual}:J{$filaActual}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'E2E8F0'],
                        ],
                    ],
                ]);

                $filaActual++;
            }

            if ($matriculasOrdenadas->isEmpty()) {
                $sheet->setCellValue('A6', 'Sin alumnos matriculados en esta sección.');
                $sheet->getStyle('A6')->getFont()->setItalic(true)->getColor()->setRGB('64748B');
            }

            foreach (range('A', 'J') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }
        }

        $spreadsheet->setActiveSheetIndex(0);

        if ($grados->count() === 1) {
            $g = $grados->first();
            $anio = $g->cicloLectivo?->anio ?? date('Y');
            $turnoSlug = $g->turno === 'Mañana' ? 'Manana' : 'Tarde';
            $nombreArchivo = "Nomina_{$g->numero}Grado_{$g->division}_{$turnoSlug}_{$anio}.xlsx";
        } else {
            $anio = $grados->first()->cicloLectivo?->anio ?? date('Y');
            $nombreArchivo = "Nominas_Grados_Ciclo_{$anio}.xlsx";
        }

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}