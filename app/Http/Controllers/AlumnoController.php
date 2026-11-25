<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\Materia;
use App\Models\Matricula;
use App\Models\User;
use Carbon\Carbon;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AlumnoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar alumnos'), only: ['index', 'exportarExcel']),
            new Middleware(PermissionMiddleware::using('crear alumnos'), only: ['create', 'store', 'importarExcel']),
            new Middleware(PermissionMiddleware::using('ver alumnos'), only: ['show']),
            new Middleware(PermissionMiddleware::using('editar alumnos'), only: ['edit', 'update']),
            new Middleware(PermissionMiddleware::using('eliminar alumnos'), only: ['destroy']),
        ];
    }

    /**
     * Construye el contexto de filtros, grados permitidos y query base de alumnos
     * compartido entre index() y exportarExcel().
     *
     * @return array{
     *     alumnosQuery: Builder,
     *     grados: \Illuminate\Database\Eloquent\Collection,
     *     ciclos: \Illuminate\Database\Eloquent\Collection,
     *     cicloActivo: CicloLectivo|null,
     *     cicloSeleccionado: CicloLectivo|null,
     *     cicloId: int|null,
     *     gradoId: mixed,
     *     sinMatricula: bool,
     *     buscar: string,
     *     orden: string,
     *     esDocente: bool
     * }
     */
    private function construirConsultaAlumnos(Request $request): array
    {
        /** @var User $user */
        $user = $request->user();
        $buscar = trim((string) $request->input('buscar', ''));
        $gradoId = $request->input('grado_id');
        $sinMatricula = $request->boolean('sin_matricula');

        $ciclos = CicloLectivo::orderByDesc('anio')->get(['id', 'anio', 'cerrado']);
        $cicloActivo = $ciclos->firstWhere('cerrado', false);

        $cicloId = $request->filled('ciclo_id')
            ? (int) $request->input('ciclo_id')
            : ($cicloActivo?->id ?? $ciclos->first()?->id);

        $cicloSeleccionado = $ciclos->firstWhere('id', $cicloId);

        $esDocente = $user->hasRole('docente')
            && ! $user->hasAnyRole(['super-admin', 'director', 'vicedirector', 'administrativo']);

        $gradosQuery = Grado::query()
            ->when($cicloId, fn ($q) => $q->where('ciclo_lectivo_id', $cicloId))
            ->where('estado', true);

        if ($esDocente) {
            $gradosQuery->where('docente_titular_id', $user->id);
        }

        $grados = $gradosQuery->orderBy('numero')->orderBy('division')->get();
        $gradosPermitidosIds = $grados->pluck('id')->toArray();

        $alumnosQuery = Alumno::query()
            ->with([
                'matriculaActual.grado',
                'matriculaActual.cicloLectivo',
                'matriculas' => fn ($q) => $q
                    ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId))
                    ->with(['grado', 'cicloLectivo']),
            ])
            ->when($esDocente, function ($query) use ($gradosPermitidosIds, $cicloId) {
                $query->whereHas('matriculas', function ($q) use ($gradosPermitidosIds, $cicloId) {
                    $q->whereIn('grado_id', $gradosPermitidosIds)
                        ->when($cicloId, fn ($sq) => $sq->where('ciclo_lectivo_id', $cicloId));
                });
            })
            ->when(! $esDocente && $sinMatricula && $cicloActivo, function ($query) use ($cicloActivo) {
                $query->where('estado', true)
                    ->whereDoesntHave('matriculas', function ($q) use ($cicloActivo) {
                        $q->where('ciclo_lectivo_id', $cicloActivo->id);
                    });
            })
            ->when(! $sinMatricula && $cicloId, function ($query) use ($cicloId, $gradoId, $esDocente, $gradosPermitidosIds) {
                $query->whereHas('matriculas', function ($q) use ($cicloId, $gradoId, $esDocente, $gradosPermitidosIds) {
                    $q->where('ciclo_lectivo_id', $cicloId);

                    if ($gradoId && (! $esDocente || in_array((int) $gradoId, $gradosPermitidosIds, true))) {
                        $q->where('grado_id', $gradoId);
                    }
                });
            })
            ->when($buscar !== '', function ($query) use ($buscar) {
                $query->where(function ($q) use ($buscar) {
                    $q->where('dni', 'like', "%{$buscar}%")
                        ->orWhere('legajo', 'like', "%{$buscar}%")
                        ->orWhere('apellido', 'like', "%{$buscar}%")
                        ->orWhere('nombre', 'like', "%{$buscar}%");
                });
            });

        $orden = (string) $request->input('orden', 'apellido_asc');
        $ordenesPermitidos = [
            'apellido_asc',
            'apellido_desc',
            'grado_asc',
            'grado_desc',
            'turno_manana',
            'turno_tarde',
        ];
        if (! in_array($orden, $ordenesPermitidos, true)) {
            $orden = 'apellido_asc';
        }

        $subGradoNumero = Matricula::select('grados.numero')
            ->join('grados', 'matriculas.grado_id', '=', 'grados.id')
            ->whereColumn('matriculas.alumno_id', 'alumnos.id')
            ->when(! $sinMatricula && $cicloId, fn ($q) => $q->where('matriculas.ciclo_lectivo_id', $cicloId))
            ->orderByDesc('matriculas.id')
            ->limit(1);

        $subGradoDivision = Matricula::select('grados.division')
            ->join('grados', 'matriculas.grado_id', '=', 'grados.id')
            ->whereColumn('matriculas.alumno_id', 'alumnos.id')
            ->when(! $sinMatricula && $cicloId, fn ($q) => $q->where('matriculas.ciclo_lectivo_id', $cicloId))
            ->orderByDesc('matriculas.id')
            ->limit(1);

        $subGradoTurno = Matricula::select('grados.turno')
            ->join('grados', 'matriculas.grado_id', '=', 'grados.id')
            ->whereColumn('matriculas.alumno_id', 'alumnos.id')
            ->when(! $sinMatricula && $cicloId, fn ($q) => $q->where('matriculas.ciclo_lectivo_id', $cicloId))
            ->orderByDesc('matriculas.id')
            ->limit(1);

        match ($orden) {
            'apellido_desc' => $alumnosQuery
                ->orderByDesc('apellido')
                ->orderByDesc('nombre'),
            'grado_asc' => $alumnosQuery
                ->orderBy($subGradoNumero, 'asc')
                ->orderBy($subGradoDivision, 'asc')
                ->orderBy($subGradoTurno, 'asc')
                ->orderBy('apellido')
                ->orderBy('nombre'),
            'grado_desc' => $alumnosQuery
                ->orderBy($subGradoNumero, 'desc')
                ->orderBy($subGradoDivision, 'asc')
                ->orderBy($subGradoTurno, 'asc')
                ->orderBy('apellido')
                ->orderBy('nombre'),
            'turno_manana' => $alumnosQuery
                ->orderBy($subGradoTurno, 'asc')
                ->orderBy($subGradoNumero, 'asc')
                ->orderBy($subGradoDivision, 'asc')
                ->orderBy('apellido')
                ->orderBy('nombre'),
            'turno_tarde' => $alumnosQuery
                ->orderBy($subGradoTurno, 'desc')
                ->orderBy($subGradoNumero, 'asc')
                ->orderBy($subGradoDivision, 'asc')
                ->orderBy('apellido')
                ->orderBy('nombre'),
            default => $alumnosQuery
                ->orderBy('apellido')
                ->orderBy('nombre'),
        };

        return [
            'alumnosQuery' => $alumnosQuery,
            'grados' => $grados,
            'ciclos' => $ciclos,
            'cicloActivo' => $cicloActivo,
            'cicloSeleccionado' => $cicloSeleccionado,
            'cicloId' => $cicloId,
            'gradoId' => $gradoId,
            'sinMatricula' => $sinMatricula,
            'buscar' => $buscar,
            'orden' => $orden,
            'esDocente' => $esDocente,
        ];
    }

    public function index(Request $request): Response
    {
        $contexto = $this->construirConsultaAlumnos($request);
        $alumnosQuery = $contexto['alumnosQuery'];

        $estadisticas = [
            'total' => (clone $alumnosQuery)->count(),
            'activos' => (clone $alumnosQuery)->where('estado', true)->count(),
            'copa_leche' => (clone $alumnosQuery)->where('estado', true)->where('recibe_copa_leche', true)->count(),
        ];

        $alumnos = $alumnosQuery
            ->paginate(5)
            ->withQueryString();

        return Inertia::render('alumnos/index', [
            'alumnos' => $alumnos,
            'estadisticas' => $estadisticas,
            'grados' => $contexto['grados'],
            'ciclos' => $contexto['ciclos'],
            'cicloActivo' => $contexto['cicloActivo'],
            'cicloSeleccionado' => $contexto['cicloSeleccionado'],
            'filtros' => [
                'ciclo_id' => $contexto['cicloId'] ? (string) $contexto['cicloId'] : '',
                'buscar' => $contexto['buscar'],
                'grado_id' => $contexto['gradoId'] ? (string) $contexto['gradoId'] : '',
                'sin_matricula' => $contexto['sinMatricula'],
                'orden' => $contexto['orden'],
            ],
        ]);
    }

    public function exportarExcel(Request $request): StreamedResponse|RedirectResponse
    {
        $contexto = $this->construirConsultaAlumnos($request);
        $alumnos = $contexto['alumnosQuery']->get();

        if ($alumnos->isEmpty()) {
            return back()->with('error', 'No hay alumnos para exportar con los filtros seleccionados.');
        }

        $cicloSeleccionado = $contexto['cicloSeleccionado'];
        $sinMatricula = $contexto['sinMatricula'];
        $gradoSeleccionado = (! $sinMatricula && $contexto['gradoId'])
            ? $contexto['grados']->firstWhere('id', (int) $contexto['gradoId'])
            : null;

        $anio = $sinMatricula
            ? ($contexto['cicloActivo']?->anio ?? date('Y'))
            : ($cicloSeleccionado?->anio ?? date('Y'));

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Nómina de Alumnos');

        $sheet->setCellValue('A1', 'Nómina de Alumnos');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);

        $sheet->setCellValue('A2', "660030900 - DOCTOR MARIANO BOEDO EX N° 129 - Primario - Común (Ciclo Lectivo {$anio})");
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(10);

        if ($sinMatricula) {
            $subtitulo = "Alumnos activos sin matricular en el Ciclo Lectivo {$anio}";
        } elseif ($gradoSeleccionado) {
            $docente = $gradoSeleccionado->docenteTitular
                ? " | Docente Titular: {$gradoSeleccionado->docenteTitular->apellido}, {$gradoSeleccionado->docenteTitular->name}"
                : '';
            $subtitulo = "Sección: {$gradoSeleccionado->nombre_completo}{$docente}";
        } else {
            $subtitulo = "Padrón general — Ciclo Lectivo {$anio}" . ($contexto['buscar'] !== '' ? " | Filtro: \"{$contexto['buscar']}\"" : '');
        }

        $sheet->setCellValue('A3', $subtitulo);
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(10)->getColor()->setRGB('1E3A8A');

        $encabezados = [
            'Apellidos',
            'Nombres',
            'Tipo doc.',
            'Nro. doc.',
            'Fecha nac.',
            'Legajo',
            $sinMatricula ? 'Última Matrícula' : 'Grado y Sección',
            'Tutor Responsable',
            'Teléfono Tutor',
            'Copa de Leche',
            'Condición',
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
        foreach ($alumnos as $alumno) {
            $matriculaEnCiclo = $alumno->matriculas->first();

            if ($sinMatricula) {
                $gradoTexto = $alumno->matriculaActual?->grado
                    ? "{$alumno->matriculaActual->grado->nombre_completo} ({$alumno->matriculaActual->cicloLectivo?->anio})"
                    : 'Nunca matriculado';
            } else {
                $gradoTexto = $matriculaEnCiclo?->grado?->nombre_completo ?? 'Sin matricular';
            }

            $sheet->setCellValue("A{$filaActual}", $alumno->apellido);
            $sheet->setCellValue("B{$filaActual}", $alumno->nombre);
            $sheet->setCellValue("C{$filaActual}", 'DNI');
            $sheet->setCellValueExplicit("D{$filaActual}", (string) $alumno->dni, DataType::TYPE_STRING);
            $sheet->setCellValue(
                "E{$filaActual}",
                $alumno->fecha_nacimiento ? $alumno->fecha_nacimiento->format('d/m/Y') : ''
            );
            $sheet->setCellValue("F{$filaActual}", $alumno->legajo);
            $sheet->setCellValue("G{$filaActual}", $gradoTexto);
            $sheet->setCellValue("H{$filaActual}", $alumno->tutor_nombre);
            $sheet->setCellValueExplicit("I{$filaActual}", (string) $alumno->tutor_telefono, DataType::TYPE_STRING);
            $sheet->setCellValue("J{$filaActual}", $alumno->recibe_copa_leche ? 'Sí' : 'No');
            $sheet->setCellValue("K{$filaActual}", $alumno->estado ? 'Regular' : 'Inactivo / Pase');

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

        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        if ($sinMatricula) {
            $nombreArchivo = "Nomina_Alumnos_Sin_Matricular_{$anio}.xlsx";
        } elseif ($gradoSeleccionado) {
            $turnoSlug = $gradoSeleccionado->turno === 'Mañana' ? 'Manana' : 'Tarde';
            $nombreArchivo = "Nomina_{$gradoSeleccionado->numero}Grado_{$gradoSeleccionado->division}_{$turnoSlug}_{$anio}.xlsx";
        } else {
            $nombreArchivo = "Nomina_Alumnos_Ciclo_{$anio}.xlsx";
        }

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function create(): Response
    {
        $cicloActivo = CicloLectivo::where('cerrado', false)
            ->orderByDesc('anio')
            ->first();

        $grados = Grado::query()
            ->when($cicloActivo, fn ($q) => $q->where('ciclo_lectivo_id', $cicloActivo->id))
            ->where('estado', true)
            ->orderBy('numero')
            ->orderBy('division')
            ->get();

        $anio = $cicloActivo ? $cicloActivo->anio : date('Y');
        $proximoNumero = Alumno::count() + 1;
        $legajoSugerido = sprintf('BOE-%d-%03d', $anio, $proximoNumero);

        return Inertia::render('alumnos/create', [
            'cicloActivo' => $cicloActivo,
            'grados' => $grados,
            'legajoSugerido' => $legajoSugerido,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'dni' => ['required', 'string', 'max:20', 'unique:alumnos,dni'],
            'legajo' => ['required', 'string', 'max:20', 'unique:alumnos,legajo'],
            'apellido' => ['required', 'string', 'max:100'],
            'nombre' => ['required', 'string', 'max:100'],
            'fecha_nacimiento' => ['required', 'date'],
            'domicilio' => ['nullable', 'string', 'max:200'],
            'tutor_nombre' => ['required', 'string', 'max:150'],
            'tutor_telefono' => ['required', 'string', 'max:50'],
            'tutor_email' => ['nullable', 'email', 'max:150'],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'recibe_copa_leche' => ['required', 'boolean'],
            'estado' => ['required', 'boolean'],
            'grado_id' => ['nullable', 'exists:grados,id'],
        ], [
            'dni.unique' => 'Ya existe un alumno registrado con este número de DNI.',
            'legajo.unique' => 'Este número de legajo ya se encuentra en uso.',
        ]);

        DB::transaction(function () use ($request, $validated) {
            $datosAlumno = collect($validated)->except(['grado_id', 'foto'])->toArray();
            $datosAlumno['legajo'] = strtoupper(trim($datosAlumno['legajo']));

            if ($request->hasFile('foto')) {
                $datosAlumno['foto'] = $request->file('foto')->store('alumnos', 'public');
            }

            $alumno = Alumno::create($datosAlumno);

            if (! empty($validated['grado_id'])) {
                $grado = Grado::with('cicloLectivo')->findOrFail($validated['grado_id']);

                if ($grado->cicloLectivo && ! $grado->cicloLectivo->cerrado) {
                    Matricula::create([
                        'alumno_id' => $alumno->id,
                        'grado_id' => $grado->id,
                        'ciclo_lectivo_id' => $grado->ciclo_lectivo_id,
                        'dictamen_3er_trimestre' => 'En Curso',
                    ]);
                }
            }
        });

        return redirect()->route('alumnos.index')
            ->with('success', 'Alumno registrado y matriculado correctamente.');
    }

    public function show(Request $request, Alumno $alumno): Response
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->hasRole('docente') && ! $user->hasAnyRole(['super-admin', 'director', 'vicedirector', 'administrativo'])) {
            $esAlumnoSuyo = $alumno->matriculas()
                ->whereHas('grado', fn ($q) => $q->where('docente_titular_id', $user->id))
                ->exists();

            abort_if(! $esAlumnoSuyo, 403, 'No tiene autorización para consultar legajos de alumnos fuera de sus grados asignados.');
        }

        $alumno->load([
            'matriculas' => fn ($q) => $q->with(['grado.docenteTitular', 'cicloLectivo'])->orderByDesc('id'),
        ]);

        return Inertia::render('alumnos/show', [
            'alumno' => $alumno,
        ]);
    }

    public function edit(Alumno $alumno): Response
    {
        $cicloActivo = CicloLectivo::where('cerrado', false)
            ->orderByDesc('anio')
            ->first();

        $alumno->load([
            'matriculas' => fn ($q) => $q->with(['grado', 'cicloLectivo'])->orderByDesc('id'),
        ]);

        $matriculaActiva = $cicloActivo
            ? $alumno->matriculas->firstWhere('ciclo_lectivo_id', $cicloActivo->id)
            : null;

        $grados = Grado::query()
            ->when($cicloActivo, fn ($q) => $q->where('ciclo_lectivo_id', $cicloActivo->id))
            ->where('estado', true)
            ->orderBy('numero')
            ->orderBy('division')
            ->get();

        return Inertia::render('alumnos/edit', [
            'alumno' => $alumno,
            'cicloActivo' => $cicloActivo,
            'grados' => $grados,
            'gradoActualId' => $matriculaActiva?->grado_id ?? '',
        ]);
    }

    public function update(Request $request, Alumno $alumno): RedirectResponse
    {
        $validated = $request->validate([
            'dni' => [
                'required',
                'string',
                'max:20',
                Rule::unique('alumnos', 'dni')->ignore($alumno->id),
            ],
            'legajo' => [
                'required',
                'string',
                'max:20',
                Rule::unique('alumnos', 'legajo')->ignore($alumno->id),
            ],
            'apellido' => ['required', 'string', 'max:100'],
            'nombre' => ['required', 'string', 'max:100'],
            'fecha_nacimiento' => ['required', 'date'],
            'domicilio' => ['nullable', 'string', 'max:200'],
            'tutor_nombre' => ['required', 'string', 'max:150'],
            'tutor_telefono' => ['required', 'string', 'max:50'],
            'tutor_email' => ['nullable', 'email', 'max:150'],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'recibe_copa_leche' => ['required', 'boolean'],
            'estado' => ['required', 'boolean'],
            'grado_id' => ['nullable', 'exists:grados,id'],
        ], [
            'dni.unique' => 'Otro alumno ya posee este número de DNI.',
            'legajo.unique' => 'Otro alumno ya posee este código de legajo.',
        ]);

        DB::transaction(function () use ($request, $validated, $alumno) {
            $datosAlumno = collect($validated)->except(['grado_id', 'foto'])->toArray();
            $datosAlumno['legajo'] = strtoupper(trim($datosAlumno['legajo']));

            if ($request->hasFile('foto')) {
                if ($alumno->foto && Storage::disk('public')->exists($alumno->foto)) {
                    Storage::disk('public')->delete($alumno->foto);
                }
                $datosAlumno['foto'] = $request->file('foto')->store('alumnos', 'public');
            }

            $alumno->update($datosAlumno);

            if (! empty($validated['grado_id'])) {
                $grado = Grado::with('cicloLectivo')->findOrFail($validated['grado_id']);

                if ($grado->cicloLectivo && ! $grado->cicloLectivo->cerrado) {
                    Matricula::updateOrCreate(
                        [
                            'alumno_id' => $alumno->id,
                            'ciclo_lectivo_id' => $grado->ciclo_lectivo_id,
                        ],
                        [
                            'grado_id' => $grado->id,
                        ]
                    );
                }
            }
        });

        return redirect()->route('alumnos.index')
            ->with('success', 'Datos del alumno y matrícula actualizados correctamente.');
    }

    public function destroy(Alumno $alumno): RedirectResponse
    {
        if ($alumno->foto && Storage::disk('public')->exists($alumno->foto)) {
            Storage::disk('public')->delete($alumno->foto);
        }

        $alumno->delete();

        return redirect()->route('alumnos.index')
            ->with('success', 'Alumno eliminado del padrón correctamente.');
    }

    public function importarExcel(Request $request): RedirectResponse
    {
        $request->validate([
            'archivo' => ['required', 'file', 'max:10240'],
        ], [
            'archivo.required' => 'Seleccioná el archivo descargado (.xls o .xlsx).',
        ]);

        $extension = strtolower($request->file('archivo')->getClientOriginalExtension());
        if (! in_array($extension, ['xls', 'xlsx', 'html', 'htm', 'xml'], true)) {
            return back()->with('error', 'Formato no soportado. Subí un archivo .xls o .xlsx.');
        }

        $cicloActivo = CicloLectivo::where('cerrado', false)
            ->orderByDesc('anio')
            ->first();

        if (! $cicloActivo) {
            return back()->with('error', 'No hay un ciclo lectivo activo. Aperture un ciclo antes de importar alumnos.');
        }

        try {
            $hojas = $this->leerHojasDesdeArchivo($request->file('archivo')->getRealPath());
        } catch (\Throwable $e) {
            return back()->with('error', 'No se pudo leer el archivo. Verificá que sea un reporte válido.');
        }

        if (empty($hojas)) {
            return back()->with('error', 'El archivo no contiene hojas con datos para procesar.');
        }

        $materiasActivasIds = Materia::where('estado', true)->pluck('id')->toArray();

        $nuevosAlumnos = 0;
        $rematriculados = 0;
        $gradosCreados = [];
        $seccionesProcesadas = [];
        $erroresFilas = [];

        DB::transaction(function () use (
            $hojas,
            $cicloActivo,
            $materiasActivasIds,
            &$nuevosAlumnos,
            &$rematriculados,
            &$gradosCreados,
            &$seccionesProcesadas,
            &$erroresFilas
        ) {
            $contadorLegajo = Alumno::count();

            foreach ($hojas as $hoja) {
                $nombreHoja = $hoja['nombre'];
                $filas = $hoja['filas'];

                if (count($filas) < 5) {
                    continue;
                }

                $metaGrado = $this->extraerMetadatosGrado($filas);
                if (! $metaGrado) {
                    $erroresFilas[] = "Hoja '{$nombreHoja}': no se pudo detectar Grado, División y Turno en la cabecera.";
                    continue;
                }

                $indiceHeader = null;
                $mapaColumnas = [];

                foreach ($filas as $idx => $fila) {
                    $normalizadas = array_map(fn ($celda) => $this->normalizarTexto((string) $celda), $fila);

                    $colApellido = array_search('apellidos', $normalizadas, true);
                    $colNombre = array_search('nombres', $normalizadas, true);
                    $colDni = array_search('nro_doc', $normalizadas, true);
                    $colFecha = array_search('fecha_nac', $normalizadas, true);

                    if ($colApellido !== false && $colNombre !== false && $colDni !== false && $colFecha !== false) {
                        $indiceHeader = $idx;
                        $mapaColumnas = [
                            'apellido' => $colApellido,
                            'nombre' => $colNombre,
                            'dni' => $colDni,
                            'fecha_nac' => $colFecha,
                        ];
                        break;
                    }
                }

                if ($indiceHeader === null) {
                    $erroresFilas[] = "Hoja '{$nombreHoja}': no se encontraron las columnas ('Apellidos', 'Nombres', 'Nro. doc.', 'Fecha nac.').";
                    continue;
                }

                $grado = Grado::firstOrCreate(
                    [
                        'ciclo_lectivo_id' => $cicloActivo->id,
                        'numero' => $metaGrado['numero'],
                        'division' => $metaGrado['division'],
                        'turno' => $metaGrado['turno'],
                    ],
                    [
                        'estado' => true,
                    ]
                );

                $etiquetaGrado = "{$metaGrado['numero']}° \"{$metaGrado['division']}\" ({$metaGrado['turno']})";
                $seccionesProcesadas[] = $etiquetaGrado;

                if ($grado->wasRecentlyCreated) {
                    $gradosCreados[] = $etiquetaGrado;
                    if (! empty($materiasActivasIds)) {
                        $grado->materias()->sync($materiasActivasIds);
                    }
                }

                $filasAlumnos = array_slice($filas, $indiceHeader + 1);

                foreach ($filasAlumnos as $offset => $fila) {
                    $numeroFila = $indiceHeader + 2 + $offset;

                    $apellidoRaw = trim((string) ($fila[$mapaColumnas['apellido']] ?? ''));
                    $nombreRaw = trim((string) ($fila[$mapaColumnas['nombre']] ?? ''));
                    $dniRaw = trim((string) ($fila[$mapaColumnas['dni']] ?? ''));
                    $fechaRaw = trim((string) ($fila[$mapaColumnas['fecha_nac']] ?? ''));

                    if ($apellidoRaw === '' && $nombreRaw === '' && $dniRaw === '') {
                        continue;
                    }

                    if (str_starts_with(mb_strtolower($apellidoRaw, 'UTF-8'), 'sin alumnos matriculados')) {
                        continue;
                    }

                    $dni = preg_replace('/[^0-9]/', '', $dniRaw);
                    if ($dni === '' || strlen($dni) < 6) {
                        $erroresFilas[] = "[{$etiquetaGrado}] Fila {$numeroFila}: DNI inválido ('{$dniRaw}').";
                        continue;
                    }

                    if ($apellidoRaw === '' || $nombreRaw === '') {
                        $erroresFilas[] = "[{$etiquetaGrado}] Fila {$numeroFila} (DNI {$dni}): Falta apellido o nombre.";
                        continue;
                    }

                    $fechaNacimiento = $this->parsearFechaExcel($fechaRaw);
                    if ($fechaNacimiento === null) {
                        $erroresFilas[] = "[{$etiquetaGrado}] Fila {$numeroFila} (DNI {$dni}): Fecha de nacimiento inválida ('{$fechaRaw}').";
                        continue;
                    }

                    $apellido = mb_convert_case(preg_replace('/\s+/', ' ', $apellidoRaw), MB_CASE_TITLE, 'UTF-8');
                    $nombre = mb_convert_case(preg_replace('/\s+/', ' ', $nombreRaw), MB_CASE_TITLE, 'UTF-8');

                    $alumno = Alumno::where('dni', $dni)->first();

                    if ($alumno) {
                        $alumno->update([
                            'apellido' => $apellido,
                            'nombre' => $nombre,
                            'fecha_nacimiento' => $fechaNacimiento,
                            'estado' => true,
                        ]);
                        $rematriculados++;
                    } else {
                        $contadorLegajo++;
                        $legajo = sprintf('BOE-%d-%03d', $cicloActivo->anio, $contadorLegajo);

                        while (Alumno::where('legajo', $legajo)->exists()) {
                            $contadorLegajo++;
                            $legajo = sprintf('BOE-%d-%03d', $cicloActivo->anio, $contadorLegajo);
                        }

                        $alumno = Alumno::create([
                            'dni' => $dni,
                            'legajo' => $legajo,
                            'apellido' => $apellido,
                            'nombre' => $nombre,
                            'fecha_nacimiento' => $fechaNacimiento,
                            'tutor_nombre' => 'A completar',
                            'tutor_telefono' => '-',
                            'recibe_copa_leche' => true,
                            'estado' => true,
                        ]);
                        $nuevosAlumnos++;
                    }

                    Matricula::updateOrCreate(
                        [
                            'alumno_id' => $alumno->id,
                            'ciclo_lectivo_id' => $cicloActivo->id,
                        ],
                        [
                            'grado_id' => $grado->id,
                            'dictamen_3er_trimestre' => 'En Curso',
                        ]
                    );
                }
            }
        });

        $totalProcesados = $nuevosAlumnos + $rematriculados;
        $seccionesUnicas = array_values(array_unique($seccionesProcesadas));

        $resumen = sprintf(
            'Importación al Ciclo %d completada (%d %s: %s): %d alumnos procesados (%d ingresos nuevos, %d re-matriculados).',
            $cicloActivo->anio,
            count($seccionesUnicas),
            count($seccionesUnicas) === 1 ? 'sección' : 'secciones',
            implode(', ', $seccionesUnicas),
            $totalProcesados,
            $nuevosAlumnos,
            $rematriculados
        );

        if (! empty($gradosCreados)) {
            $resumen .= ' Se crearon automáticamente: ' . implode(', ', array_unique($gradosCreados)) . '.';
        }

        $redirect = redirect()->route('alumnos.index', ['ciclo_id' => $cicloActivo->id]);

        if ($totalProcesados > 0 || ! empty($seccionesUnicas)) {
            $redirect->with('success', $resumen);
        }

        if (! empty($erroresFilas)) {
            $detalleErrores = implode(' | ', array_slice($erroresFilas, 0, 5));
            if (count($erroresFilas) > 5) {
                $detalleErrores .= ' (y ' . (count($erroresFilas) - 5) . ' avisos más).';
            }
            $redirect->with('error', 'Observaciones: ' . $detalleErrores);
        }

        return $redirect;
    }

    /**
     * Lee todas las hojas de un archivo Excel (.xlsx/.xls) o reporte HTML/XML ministerial.
     *
     * @return array<int, array{nombre: string, filas: array<int, array<int, mixed>>}>
     */
    private function leerHojasDesdeArchivo(string $rutaArchivo): array
    {
        $contenido = file_get_contents($rutaArchivo);
        if ($contenido === false || trim($contenido) === '') {
            throw new \RuntimeException('Archivo vacío');
        }

        $inicio = ltrim(substr($contenido, 0, 512));

        if (str_starts_with($inicio, '<') || stripos($inicio, '<html') !== false || stripos($inicio, '<table') !== false) {
            try {
                $reader = stripos($inicio, '<?xml') === 0
                    ? IOFactory::createReader('Xml')
                    : IOFactory::createReader('Html');

                $spreadsheet = $reader->load($rutaArchivo);
                $resultado = [];

                foreach ($spreadsheet->getAllSheets() as $sheet) {
                    $resultado[] = [
                        'nombre' => $sheet->getTitle(),
                        'filas' => $sheet->toArray(null, true, true, false),
                    ];
                }

                return $resultado;
            } catch (\Throwable) {
                return [
                    [
                        'nombre' => 'Hoja 1',
                        'filas' => $this->parsearTablaHtmlNativa($contenido),
                    ],
                ];
            }
        }

        $spreadsheet = IOFactory::load($rutaArchivo);
        $resultado = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $resultado[] = [
                'nombre' => $sheet->getTitle(),
                'filas' => $sheet->toArray(null, true, true, false),
            ];
        }

        return $resultado;
    }

    private function parsearTablaHtmlNativa(string $html): array
    {
        if (! mb_check_encoding($html, 'UTF-8')) {
            $html = mb_convert_encoding($html, 'UTF-8', 'Windows-1252');
        }

        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);
        $filas = [];

        foreach ($xpath->query('//tr') as $tr) {
            $filaActual = [];
            foreach ($xpath->query('./th|./td', $tr) as $celda) {
                $texto = html_entity_decode($celda->textContent, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $texto = trim(preg_replace('/\s+/u', ' ', $texto));
                $filaActual[] = $texto;

                $colspan = $celda instanceof DOMElement ? (int) $celda->getAttribute('colspan') : 1;
                for ($i = 1; $i < $colspan; $i++) {
                    $filaActual[] = '';
                }
            }
            if (! empty($filaActual)) {
                $filas[] = $filaActual;
            }
        }

        return $filas;
    }

    private function extraerMetadatosGrado(array $filas): ?array
    {
        $primerasFilas = array_slice($filas, 0, 8);

        foreach ($primerasFilas as $fila) {
            foreach ($fila as $celda) {
                $texto = trim((string) $celda);
                if ($texto === '') {
                    continue;
                }

                if (preg_match('/([1-7])(?:ro|do|to|mo|er)?\s*Grado(?:\/Año)?\s*-\s*([A-Za-z0-9]+)\s*\|.*?-\s*(Mañana|Manana|Tarde)\b/iu', $texto, $m)) {
                    $turnoRaw = mb_strtolower($m[3], 'UTF-8');
                    $turno = str_starts_with($turnoRaw, 't') ? 'Tarde' : 'Mañana';

                    return [
                        'numero' => (int) $m[1],
                        'division' => mb_strtoupper(trim($m[2]), 'UTF-8'),
                        'turno' => $turno,
                    ];
                }
            }
        }

        return null;
    }

    private function normalizarTexto(string $texto): string
    {
        $texto = mb_strtolower(trim($texto), 'UTF-8');
        $texto = str_replace(['á', 'é', 'í', 'ó', 'ú', 'ñ'], ['a', 'e', 'i', 'o', 'u', 'n'], $texto);
        $texto = preg_replace('/[^a-z0-9]+/', '_', $texto);

        return trim($texto, '_');
    }

    private function parsearFechaExcel(string $valor): ?string
    {
        $valor = trim($valor);
        if ($valor === '') {
            return null;
        }

        try {
            if (is_numeric($valor)) {
                return ExcelDate::excelToDateTimeObject((float) $valor)->format('Y-m-d');
            }

            if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $valor)) {
                return Carbon::createFromFormat('d/m/Y', $valor)->format('Y-m-d');
            }

            if (preg_match('/^\d{1,2}-\d{1,2}-\d{4}$/', $valor)) {
                return Carbon::createFromFormat('d-m-Y', $valor)->format('Y-m-d');
            }

            return Carbon::parse($valor)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}