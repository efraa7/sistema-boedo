<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Calificacion;
use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\Matricula;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Middleware\RoleMiddleware;

class EstadisticaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(RoleMiddleware::using(['super-admin', 'director']), only: ['index']),
        ];
    }

    public function index(Request $request): Response
    {
        $ciclos = CicloLectivo::orderByDesc('anio')->get(['id', 'anio', 'cerrado']);
        $turno = (string) $request->input('turno', '');

        if ($ciclos->isEmpty()) {
            return Inertia::render('estadisticas/index', [
                'ciclos' => [],
                'cicloActual' => null,
                'cicloComparar' => null,
                'metricasActual' => null,
                'metricasComparar' => null,
                'filtros' => [
                    'turno' => $turno,
                ],
            ]);
        }

        $cicloActualPorDefecto = $ciclos->firstWhere('cerrado', false) ?? $ciclos->first();

        $cicloActual = $request->filled('ciclo_actual_id')
            ? ($ciclos->firstWhere('id', (int) $request->input('ciclo_actual_id')) ?? $cicloActualPorDefecto)
            : $cicloActualPorDefecto;

        $cicloAnteriorPorDefecto = $ciclos->firstWhere('anio', '<', $cicloActual->anio)
            ?? $ciclos->firstWhere('id', '!=', $cicloActual->id)
            ?? $cicloActual;

        $cicloComparar = $request->filled('ciclo_comparar_id')
            ? ($ciclos->firstWhere('id', (int) $request->input('ciclo_comparar_id')) ?? $cicloAnteriorPorDefecto)
            : $cicloAnteriorPorDefecto;

        $metricasActual = $this->calcularMetricasCiclo($cicloActual, $turno);
        $metricasComparar = $cicloComparar->id === $cicloActual->id
            ? $metricasActual
            : $this->calcularMetricasCiclo($cicloComparar, $turno);

        return Inertia::render('estadisticas/index', [
            'ciclos' => $ciclos,
            'cicloActual' => $cicloActual,
            'cicloComparar' => $cicloComparar,
            'metricasActual' => $metricasActual,
            'metricasComparar' => $metricasComparar,
            'filtros' => [
                'turno' => $turno,
            ],
        ]);
    }

    /**
     * Calcula todos los indicadores estadísticos de un ciclo lectivo dado.
     *
     * @return array<string, mixed>
     */
    private function calcularMetricasCiclo(CicloLectivo $ciclo, string $turno = ''): array
    {
        $gradosBase = Grado::query()
            ->where('ciclo_lectivo_id', $ciclo->id)
            ->where('estado', true)
            ->when($turno !== '', fn ($q) => $q->where('turno', $turno));

        $cantidadGrados = (clone $gradosBase)->count();

        $cantidadDocentes = (clone $gradosBase)
            ->whereNotNull('docente_titular_id')
            ->distinct('docente_titular_id')
            ->count('docente_titular_id');

        $filtroGradoCiclo = function ($q) use ($ciclo, $turno) {
            $q->where('ciclo_lectivo_id', $ciclo->id)
                ->where('estado', true)
                ->when($turno !== '', fn ($sq) => $sq->where('turno', $turno));
        };

        $cantidadAlumnos = Alumno::query()
            ->where('estado', true)
            ->whereHas('matriculas.grado', $filtroGradoCiclo)
            ->count();

        $cantidadInclusion = Alumno::query()
            ->where('estado', true)
            ->whereHas('legajoInclusion')
            ->whereHas('matriculas.grado', $filtroGradoCiclo)
            ->count();

        $cantidadCopaLeche = Alumno::query()
            ->where('estado', true)
            ->where('recibe_copa_leche', true)
            ->whereHas('matriculas.grado', $filtroGradoCiclo)
            ->count();
        $matriculasPorNumero = Matricula::query()
            ->join('alumnos', 'matriculas.alumno_id', '=', 'alumnos.id')
            ->join('grados', 'matriculas.grado_id', '=', 'grados.id')
            ->where('grados.ciclo_lectivo_id', $ciclo->id)
            ->where('alumnos.estado', true)
            ->where('grados.estado', true)
            ->when($turno !== '', fn ($q) => $q->where('grados.turno', $turno))
            ->selectRaw('grados.numero as numero, COUNT(DISTINCT alumnos.id) as total')
            ->groupBy('grados.numero')
            ->pluck('total', 'numero');

        $alumnosPorGrado = [];
        for ($num = 1; $num <= 7; $num++) {
            $alumnosPorGrado[] = [
                'numero' => $num,
                'etiqueta' => "{$num}.°",
                'cantidad' => (int) ($matriculasPorNumero[$num] ?? 0),
            ];
        }
        $calificaciones = Calificacion::query()
            ->whereHas('cuadernoAuxiliar', function ($q) use ($ciclo, $turno) {
                $q->where('ciclo_lectivo_id', $ciclo->id)
                    ->whereIn('estado', ['visado', 'aprobado'])
                    ->when($turno !== '', function ($sq) use ($turno) {
                        $sq->whereHas('grado', fn ($gq) => $gq->where('turno', $turno));
                    });
            })
            ->whereHas('alumno', fn ($q) => $q->where('estado', true)->whereDoesntHave('legajoInclusion'))
            ->with([
                'cuadernoAuxiliar.grado',
                'notasMaterias' => fn ($q) => $q->whereNotNull('nota_numerica'),
            ])
            ->get();

        $sumaTotalNotas = 0.0;
        $cantidadNotas = 0;
        $notasPorGrado = [];

        foreach ($calificaciones as $calificacion) {
            $numGrado = (int) ($calificacion->cuadernoAuxiliar?->grado?->numero ?? 0);

            foreach ($calificacion->notasMaterias as $nm) {
                if ($nm->nota_numerica === null) {
                    continue;
                }

                $valor = (float) $nm->nota_numerica;
                $sumaTotalNotas += $valor;
                $cantidadNotas++;

                if ($numGrado >= 1 && $numGrado <= 7) {
                    $notasPorGrado[$numGrado][] = $valor;
                }
            }
        }

        $promedioNotas = $cantidadNotas > 0
            ? round($sumaTotalNotas / $cantidadNotas, 2)
            : 0.0;

        $promediosPorGrado = [];
        for ($num = 1; $num <= 7; $num++) {
            $lista = $notasPorGrado[$num] ?? [];
            $promediosPorGrado[] = [
                'numero' => $num,
                'etiqueta' => "{$num}.°",
                'promedio' => count($lista) > 0 ? round(array_sum($lista) / count($lista), 2) : 0.0,
            ];
        }

        return [
            'ciclo_id' => $ciclo->id,
            'anio' => $ciclo->anio,
            'cantidad_docentes' => $cantidadDocentes,
            'cantidad_grados' => $cantidadGrados,
            'cantidad_alumnos' => $cantidadAlumnos,
            'cantidad_inclusion' => $cantidadInclusion,
            'cantidad_copa_leche' => $cantidadCopaLeche,
            'promedio_notas' => $promedioNotas,
            'cantidad_evaluaciones' => $cantidadNotas,
            'alumnos_por_grado' => $alumnosPorGrado,
            'promedios_por_grado' => $promediosPorGrado,
        ];
    }
}