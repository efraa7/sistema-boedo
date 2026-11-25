<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\Matricula;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CopaLecheController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar copa leche'), only: ['index', 'show', 'exportarExcel', 'toggleAlumno']),
        ];
    }

    private function esSoloDocente(User $user): bool
    {
        return $user->hasRole('docente')
            && !$user->hasAnyRole(['super-admin', 'director', 'vicedirector', 'administrativo']);
    }

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $cicloId = $request->input('ciclo_lectivo_id');
        $buscar = trim((string) $request->input('buscar', ''));
        $turno = (string) $request->input('turno', '');

        // Filtros para la pestaña de Padrón Rápido de Alumnos
        $tab = (string) $request->input('tab', 'grados');
        $buscarAlumno = trim((string) $request->input('buscar_alumno', ''));
        $gradoAlumnoId = (string) $request->input('grado_alumno_id', '');
        $estadoCopa = (string) $request->input('estado_copa', '');

        $ciclos = CicloLectivo::orderByDesc('anio')->get();

        $cicloActivo = $cicloId
            ? CicloLectivo::find($cicloId)
            : (CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first() ?? $ciclos->first());

        if (!$cicloActivo) {
            return Inertia::render('copa-leche/index', [
                'ciclos' => $ciclos,
                'cicloSeleccionado' => null,
                'grados' => [
                    'data' => [],
                    'links' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'from' => null,
                    'to' => null,
                    'total' => 0,
                ],
                'gradosLista' => [],
                'alumnosPadron' => [
                    'data' => [],
                    'links' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'from' => null,
                    'to' => null,
                    'total' => 0,
                ],
                'resumen' => [
                    'total_raciones' => 0,
                    'turno_manana' => 0,
                    'turno_tarde' => 0,
                ],
                'filtros' => [
                    'tab' => 'grados',
                    'buscar' => '',
                    'turno' => '',
                    'buscar_alumno' => '',
                    'grado_alumno_id' => '',
                    'estado_copa' => '',
                ],
            ]);
        }

        $esDocente = $this->esSoloDocente($user);

        // 1. Consulta para totales reales (sin paginar)
        $gradosTotalesQuery = Grado::query()
            ->where('ciclo_lectivo_id', $cicloActivo->id)
            ->where('estado', true)
            ->when($esDocente, fn($q) => $q->where('docente_titular_id', $user->id))
            ->withCount([
                'matriculas as total_copa_leche' => function ($query) {
                    $query->whereHas('alumno', function ($q) {
                        $q->where('recibe_copa_leche', true)->where('estado', true);
                    });
                },
            ])
            ->orderBy('numero')
            ->orderBy('division');

        $gradosTotales = $gradosTotalesQuery->get();

        $totalRaciones = $gradosTotales->sum('total_copa_leche');
        $turnoManana = $gradosTotales->where('turno', 'Mañana')->sum('total_copa_leche');
        $turnoTarde = $gradosTotales->where('turno', 'Tarde')->sum('total_copa_leche');

        // 2. Consulta paginada por Grado y Sección (soporta minúsculas, "1", "1°", "a", "1 a", etc.)
        $gradosPaginados = Grado::query()
            ->where('ciclo_lectivo_id', $cicloActivo->id)
            ->where('estado', true)
            ->when($esDocente, fn($q) => $q->where('docente_titular_id', $user->id))
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
            ->when($turno !== '', fn($query) => $query->where('turno', $turno))
            ->withCount([
                'matriculas as total_matriculados' => function ($query) {
                    $query->whereHas('alumno', fn($q) => $q->where('estado', true));
                },
                'matriculas as total_copa_leche' => function ($query) {
                    $query->whereHas('alumno', function ($q) {
                        $q->where('recibe_copa_leche', true)->where('estado', true);
                    });
                },
            ])
            ->orderBy('numero')
            ->orderBy('division')
            ->paginate(5, ['*'], 'page')
            ->withQueryString();

        // 3. Consulta paginada del Padrón Rápido de Alumnos (insensible a mayúsculas/minúsculas)
        $alumnosPadron = Matricula::query()
            ->join('alumnos', 'matriculas.alumno_id', '=', 'alumnos.id')
            ->join('grados', 'matriculas.grado_id', '=', 'grados.id')
            ->where('grados.ciclo_lectivo_id', $cicloActivo->id)
            ->where('alumnos.estado', true)
            ->where('grados.estado', true)
            ->when($esDocente, fn($q) => $q->where('grados.docente_titular_id', $user->id))
            ->when($gradoAlumnoId !== '', fn($q) => $q->where('grados.id', (int) $gradoAlumnoId))
            ->when($estadoCopa === 'reciben', fn($q) => $q->where('alumnos.recibe_copa_leche', true))
            ->when($estadoCopa === 'no_reciben', fn($q) => $q->where('alumnos.recibe_copa_leche', false))
            ->when($buscarAlumno !== '', function ($query) use ($buscarAlumno) {
                $termino = mb_strtolower(trim(preg_replace('/\s+/', ' ', $buscarAlumno)));
                $like = "%{$termino}%";

                $query->where(function ($q) use ($like) {
                    $q->whereRaw('LOWER(alumnos.apellido) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(alumnos.nombre) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(alumnos.dni) LIKE ?', [$like])
                        ->orWhereRaw("LOWER(CONCAT(alumnos.apellido, ' ', alumnos.nombre)) LIKE ?", [$like])
                        ->orWhereRaw("LOWER(CONCAT(alumnos.nombre, ' ', alumnos.apellido)) LIKE ?", [$like])
                        ->orWhereRaw("LOWER(CONCAT(alumnos.apellido, ', ', alumnos.nombre)) LIKE ?", [$like]);
                });
            })
            ->select([
                'alumnos.id as id',
                'alumnos.dni',
                'alumnos.legajo',
                'alumnos.apellido',
                'alumnos.nombre',
                'alumnos.recibe_copa_leche',
                'grados.id as grado_id',
                'grados.numero as grado_numero',
                'grados.division as grado_division',
                'grados.turno as grado_turno',
            ])
            ->orderBy('alumnos.apellido')
            ->orderBy('alumnos.nombre')
            ->paginate(8, ['*'], 'alumnos_page')
            ->withQueryString()
            ->through(function ($row) {
                return [
                    'id' => (int) $row->id,
                    'dni' => $row->dni,
                    'legajo' => $row->legajo,
                    'nombre_completo' => "{$row->apellido}, {$row->nombre}",
                    'recibe_copa_leche' => (bool) $row->recibe_copa_leche,
                    'grado_texto' => "{$row->grado_numero}.° \"{$row->grado_division}\" ({$row->grado_turno})",
                ];
            });

        return Inertia::render('copa-leche/index', [
            'ciclos' => $ciclos,
            'cicloSeleccionado' => $cicloActivo,
            'grados' => $gradosPaginados,
            'gradosLista' => $gradosTotales->map(fn($g) => [
                'id' => $g->id,
                'nombre' => "{$g->numero}.° \"{$g->division}\" - {$g->turno}",
            ])->values(),
            'alumnosPadron' => $alumnosPadron,
            'resumen' => [
                'total_raciones' => $totalRaciones,
                'turno_manana' => $turnoManana,
                'turno_tarde' => $turnoTarde,
            ],
            'filtros' => [
                'tab' => $tab,
                'buscar' => $buscar,
                'turno' => $turno,
                'buscar_alumno' => $buscarAlumno,
                'grado_alumno_id' => $gradoAlumnoId,
                'estado_copa' => $estadoCopa,
            ],
        ]);
    }

    /**
     * Devuelve TODOS los alumnos activos del grado para poder marcar o desmarcar desde el modal.
     */
    public function show(Request $request, Grado $grado): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->esSoloDocente($user)) {
            abort_if((int) $grado->docente_titular_id !== (int) $user->id, 403, 'No tiene autorización para consultar un grado no asignado.');
        }

        $alumnos = $grado->matriculas()
            ->whereHas('alumno', fn($q) => $q->where('estado', true))
            ->with('alumno')
            ->get()
            ->pluck('alumno')
            ->filter()
            ->sortBy(fn($a) => mb_strtolower("{$a->apellido} {$a->nombre}"))
            ->values()
            ->map(fn(Alumno $a) => [
                'id' => $a->id,
                'dni' => $a->dni,
                'legajo' => $a->legajo,
                'nombre_completo' => $a->nombre_completo,
                'tutor_nombre' => $a->tutor_nombre,
                'tutor_telefono' => $a->tutor_telefono,
                'recibe_copa_leche' => (bool) $a->recibe_copa_leche,
            ]);

        return response()->json([
            'grado' => $grado->nombre_completo,
            'alumnos' => $alumnos,
        ]);
    }

    /**
     * Activa o desactiva rápidamente si un alumno recibe Copa de Leche.
     */
    public function toggleAlumno(Request $request, Alumno $alumno): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($this->esSoloDocente($user)) {
            $esSuAlumno = $alumno->matriculas()
                ->whereHas('grado', fn($q) => $q->where('docente_titular_id', $user->id))
                ->exists();

            abort_unless($esSuAlumno, 403, 'Solo podés modificar alumnos matriculados en tu grado.');
        }

        $nuevoValor = $request->has('recibe_copa_leche')
            ? $request->boolean('recibe_copa_leche')
            : !(bool) $alumno->recibe_copa_leche;

        $alumno->update([
            'recibe_copa_leche' => $nuevoValor,
        ]);

        return response()->json([
            'ok' => true,
            'alumno_id' => $alumno->id,
            'recibe_copa_leche' => (bool) $alumno->recibe_copa_leche,
        ]);
    }

    /**
     * Genera el reporte Excel oficial con Resumen General, Subtotales por Turno,
     * Desglose por Grado/División (Hoja 1) y Nómina por Aula (Hoja 2).
     */
    public function exportarExcel(Request $request): StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();
        $cicloId = $request->input('ciclo_lectivo_id');

        $ciclo = $cicloId
            ? CicloLectivo::find($cicloId)
            : (CicloLectivo::where('cerrado', false)->orderByDesc('anio')->first() ?? CicloLectivo::orderByDesc('anio')->first());

        $anio = $ciclo?->anio ?? date('Y');
        $esDocente = $this->esSoloDocente($user);

        $grados = Grado::query()
            ->when($ciclo, fn($q) => $q->where('ciclo_lectivo_id', $ciclo->id))
            ->where('estado', true)
            ->when($esDocente, fn($q) => $q->where('docente_titular_id', $user->id))
            ->with([
                'docenteTitular',
                'matriculas' => fn($q) => $q->whereHas('alumno', fn($aq) => $aq->where('estado', true))->with('alumno'),
            ])
            ->withCount([
                'matriculas as total_matriculados' => fn($q) => $q->whereHas('alumno', fn($aq) => $aq->where('estado', true)),
                'matriculas as total_copa_leche' => fn($q) => $q->whereHas('alumno', fn($aq) => $aq->where('recibe_copa_leche', true)->where('estado', true)),
            ])
            ->orderBy('numero')
            ->orderBy('division')
            ->get();

        $gradosManana = $grados->where('turno', 'Mañana')->values();
        $gradosTarde = $grados->where('turno', 'Tarde')->values();

        $totalRaciones = (int) $grados->sum('total_copa_leche');
        $totalMatriculados = (int) $grados->sum('total_matriculados');

        $racionesManana = (int) $gradosManana->sum('total_copa_leche');
        $matriculadosManana = (int) $gradosManana->sum('total_matriculados');

        $racionesTarde = (int) $gradosTarde->sum('total_copa_leche');
        $matriculadosTarde = (int) $gradosTarde->sum('total_matriculados');

        $spreadsheet = new Spreadsheet();

        // =========================================================================
        // HOJA 1: RESUMEN GENERAL, POR TURNO Y DESGLOSE POR GRADO
        // =========================================================================
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Resumen por Turno y Grado');

        // Encabezado Institucional
        $sheet->mergeCells('A1:E1');
        $sheet->setCellValue('A1', 'ESCUELA N° 129 "DR. MARIANO BOEDO" — REPORTE DE PROYECCIÓN COPA DE LECHE');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '065F46']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $sheet->mergeCells('A2:E2');
        $sheet->setCellValue('A2', 'CUE 660030900 · Nivel Primario · Ciclo Lectivo ' . $anio . ' · Emitido el ' . now()->format('d/m/Y H:i'));
        $sheet->getStyle('A2')->applyFromArray([
            'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => '1E293B']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D1FAE5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(2)->setRowHeight(20);

        // Cuadro Resumen General (Totales)
        $sheet->mergeCells('A4:E4');
        $sheet->setCellValue('A4', '1. RESUMEN GENERAL DE RACIONES DIARIAS');
        $sheet->getStyle('A4:E4')->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F172A']],
        ]);
        $sheet->getRowDimension(4)->setRowHeight(22);

        $resumenFilas = [
            ['TOTAL GENERAL DE RACIONES (AMBOS TURNOS)', $totalRaciones, $totalMatriculados, '065F46', 'ECFDF5'],
            ['TOTAL RACIONES — TURNO MAÑANA', $racionesManana, $matriculadosManana, '92400E', 'FFFBEB'],
            ['TOTAL RACIONES — TURNO TARDE', $racionesTarde, $matriculadosTarde, '1E40AF', 'EFF6FF'],
        ];

        $fila = 5;
        foreach ($resumenFilas as [$etiqueta, $raciones, $matriculados, $colorTexto, $colorFondo]) {
            $porc = $matriculados > 0 ? round(($raciones / $matriculados) * 100, 1) . '%' : '0%';
            $sheet->mergeCells("A{$fila}:B{$fila}");
            $sheet->setCellValue("A{$fila}", $etiqueta);
            $sheet->setCellValue("C{$fila}", "Matrícula: {$matriculados}");
            $sheet->setCellValue("D{$fila}", "{$raciones} raciones");
            $sheet->setCellValue("E{$fila}", "Cobertura: {$porc}");

            $sheet->getStyle("A{$fila}:E{$fila}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => $colorTexto]],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $colorFondo]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle("C{$fila}:E{$fila}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getRowDimension($fila)->setRowHeight(22);
            $fila++;
        }

        // Helper para dibujar bloque de cada turno
        $escribirBloqueTurno = function (Worksheet $s, int $filaInicio, string $tituloBloque, string $colorHeader, string $colorSubtotal, $listaGrados, int $subRaciones, int $subMatriculados): int {
            $f = $filaInicio + 1;

            $s->mergeCells("A{$f}:E{$f}");
            $s->setCellValue("A{$f}", $tituloBloque);
            $s->getStyle("A{$f}:E{$f}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $colorHeader]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $s->getRowDimension($f)->setRowHeight(22);
            $f++;

            $headers = ['Grado y Sección', 'Docente Titular', 'Matriculados', 'Reciben Copa de Leche', '% Cobertura'];
            $s->fromArray($headers, null, "A{$f}");
            $s->getStyle("A{$f}:E{$f}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => '0F172A']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '94A3B8']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $s->getStyle("A{$f}:B{$f}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $s->getRowDimension($f)->setRowHeight(20);
            $f++;

            if ($listaGrados->isEmpty()) {
                $s->mergeCells("A{$f}:E{$f}");
                $s->setCellValue("A{$f}", 'Sin grados activos registrados en este turno.');
                $s->getStyle("A{$f}:E{$f}")->applyFromArray([
                    'font' => ['italic' => true, 'color' => ['rgb' => '64748B']],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
                ]);
                $f++;
            } else {
                foreach ($listaGrados as $g) {
                    $docente = $g->docenteTitular
                        ? "{$g->docenteTitular->apellido}, {$g->docenteTitular->name}"
                        : 'Sin asignar';
                    $porc = $g->total_matriculados > 0
                        ? round(($g->total_copa_leche / $g->total_matriculados) * 100) . '%'
                        : '0%';

                    $s->setCellValue("A{$f}", "{$g->numero}.° Grado \"{$g->division}\"");
                    $s->setCellValue("B{$f}", $docente);
                    $s->setCellValue("C{$f}", (int) $g->total_matriculados);
                    $s->setCellValue("D{$f}", (int) $g->total_copa_leche);
                    $s->setCellValue("E{$f}", $porc);

                    $s->getStyle("A{$f}:E{$f}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);
                    $s->getStyle("A{$f}")->getFont()->setBold(true);
                    $s->getStyle("C{$f}:E{$f}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $s->getStyle("D{$f}")->getFont()->setBold(true);
                    $s->getRowDimension($f)->setRowHeight(19);
                    $f++;
                }
            }

            $porcSub = $subMatriculados > 0 ? round(($subRaciones / $subMatriculados) * 100) . '%' : '0%';
            $s->setCellValue("A{$f}", "SUBTOTAL {$tituloBloque}");
            $s->setCellValue("B{$f}", '—');
            $s->setCellValue("C{$f}", $subMatriculados);
            $s->setCellValue("D{$f}", $subRaciones);
            $s->setCellValue("E{$f}", $porcSub);

            $s->getStyle("A{$f}:E{$f}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '0F172A']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $colorSubtotal]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '94A3B8']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $s->getStyle("B{$f}:E{$f}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $s->getRowDimension($f)->setRowHeight(21);

            return $f + 1;
        };

        $fila = $escribirBloqueTurno(
            $sheet,
            $fila,
            '2. DETALLE TURNO MAÑANA',
            'B45309',
            'FEF3C7',
            $gradosManana,
            $racionesManana,
            $matriculadosManana
        );

        $fila = $escribirBloqueTurno(
            $sheet,
            $fila,
            '3. DETALLE TURNO TARDE',
            '1D4ED8',
            'DBEAFE',
            $gradosTarde,
            $racionesTarde,
            $matriculadosTarde
        );

        // Fila Total Final
        $fila++;
        $porcTotal = $totalMatriculados > 0 ? round(($totalRaciones / $totalMatriculados) * 100) . '%' : '0%';
        $sheet->setCellValue("A{$fila}", 'TOTAL GENERAL DIARIO (MAÑANA + TARDE)');
        $sheet->setCellValue("B{$fila}", '—');
        $sheet->setCellValue("C{$fila}", $totalMatriculados);
        $sheet->setCellValue("D{$fila}", $totalRaciones);
        $sheet->setCellValue("E{$fila}", $porcTotal);
        $sheet->getStyle("A{$fila}:E{$fila}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '065F46']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '065F46']]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getStyle("B{$fila}:E{$fila}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getRowDimension($fila)->setRowHeight(24);

        // Bloque de Firmas al pie de la planilla
        $fila += 3;
        $sheet->mergeCells("A{$fila}:B{$fila}");
        $sheet->setCellValue("A{$fila}", '________________________________________');
        $sheet->mergeCells("D{$fila}:E{$fila}");
        $sheet->setCellValue("D{$fila}", '________________________________________');
        $sheet->getStyle("A{$fila}:E{$fila}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $fila++;
        $sheet->mergeCells("A{$fila}:B{$fila}");
        $sheet->setCellValue("A{$fila}", 'Firma y Sello Dirección / Secretaría');
        $sheet->mergeCells("D{$fila}:E{$fila}");
        $sheet->setCellValue("D{$fila}", 'Firma Responsable de Cocina / Portería');
        $sheet->getStyle("A{$fila}:E{$fila}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => '475569']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $sheet->getColumnDimension('A')->setWidth(24);
        $sheet->getColumnDimension('B')->setWidth(32);
        $sheet->getColumnDimension('C')->setWidth(18);
        $sheet->getColumnDimension('D')->setWidth(24);
        $sheet->getColumnDimension('E')->setWidth(18);

        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $sheet->getPageSetup()->setPaperSize(PageSetup::PAPERSIZE_A4);
        $sheet->getPageSetup()->setFitToPage(true);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(1);

        // =========================================================================
        // HOJA 2: NÓMINA NOMINAL POR AULA (PARA CONTROL EN COCINA / AULAS)
        // =========================================================================
        $sheetNomina = new Worksheet($spreadsheet, 'Nómina por Aula');
        $spreadsheet->addSheet($sheetNomina);

        $sheetNomina->mergeCells('A1:G1');
        $sheetNomina->setCellValue('A1', "NÓMINA DE BENEFICIARIOS COPA DE LECHE POR AULA — CICLO LECTIVO {$anio}");
        $sheetNomina->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A8A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheetNomina->getRowDimension(1)->setRowHeight(26);

        $headersNomina = ['N°', 'Turno', 'Grado y Sección', 'DNI', 'Apellido y Nombre', 'Tutor Responsable', 'Teléfono'];
        $sheetNomina->fromArray($headersNomina, null, 'A3');
        $sheetNomina->getStyle('A3:G3')->applyFromArray([
            'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F172A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheetNomina->getRowDimension(3)->setRowHeight(22);

        $gradosOrdenadosTurno = $grados->sortBy(function ($g) {
            $ordenTurno = $g->turno === 'Mañana' ? 1 : 2;

            return sprintf('%d-%02d-%s', $ordenTurno, $g->numero, $g->division);
        });

        $filaNomina = 4;
        $contador = 1;

        foreach ($gradosOrdenadosTurno as $g) {
            $beneficiarios = $g->matriculas
                ->pluck('alumno')
                ->filter(fn($a) => $a && $a->estado && $a->recibe_copa_leche)
                ->sortBy(fn($a) => mb_strtolower("{$a->apellido} {$a->nombre}"));

            foreach ($beneficiarios as $al) {
                $sheetNomina->setCellValue("A{$filaNomina}", $contador++);
                $sheetNomina->setCellValue("B{$filaNomina}", $g->turno);
                $sheetNomina->setCellValue("C{$filaNomina}", "{$g->numero}.° Grado \"{$g->division}\"");
                $sheetNomina->setCellValueExplicit("D{$filaNomina}", (string) $al->dni, DataType::TYPE_STRING);
                $sheetNomina->setCellValue("E{$filaNomina}", $al->nombre_completo);
                $sheetNomina->setCellValue("F{$filaNomina}", $al->tutor_nombre ?? '—');
                $sheetNomina->setCellValueExplicit("G{$filaNomina}", (string) ($al->tutor_telefono ?? '—'), DataType::TYPE_STRING);

                $sheetNomina->getStyle("A{$filaNomina}:G{$filaNomina}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
                ]);
                $sheetNomina->getStyle("A{$filaNomina}:D{$filaNomina}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $filaNomina++;
            }
        }

        foreach (range('A', 'G') as $col) {
            $sheetNomina->getColumnDimension($col)->setAutoSize(true);
        }

        $spreadsheet->setActiveSheetIndex(0);

        $nombreArchivo = "Copa_de_Leche_Ciclo_{$anio}.xlsx";
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}