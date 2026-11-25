<?php

namespace Database\Seeders;

use App\Models\Calificacion;
use App\Models\CalificacionMateria;
use App\Models\CicloLectivo;
use App\Models\CuadernoAuxiliar;
use App\Models\Grado;
use App\Models\LegajoInclusion;
use Illuminate\Database\Seeder;

class CuadernoAuxiliarSeeder extends Seeder
{
    public function run(): void
    {
        $ciclos = CicloLectivo::whereIn('anio', [2025, 2026])
            ->orderBy('anio')
            ->get();

        $alumnosInclusionIds = LegajoInclusion::pluck('alumno_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $observacionesDestacadas = [
            'Excelente desempeño académico, participa activamente en clase y cumple en tiempo y forma con todas las actividades propuestas.',
            'Muy buen rendimiento general. Demuestra autonomía en la resolución de consignas y buena predisposición para el trabajo grupal.',
            'Evidencia un progreso sostenido en todas las áreas curriculares, con lectura fluida y adecuada comprensión de textos.',
        ];

        $observacionesBuenas = [
            'Buen desempeño trimestral. Alcanza los objetivos esperados en las distintas áreas; se sugiere continuar reforzando hábitos de estudio.',
            'Participa con interés en las propuestas áulicas y logra resolver las actividades con acompañamiento docente habitual.',
            'Cumple con las tareas diarias y mantiene una actitud respetuosa con sus pares y docentes.',
        ];

        $observacionesRegulares = [
            'Alcanza los contenidos mínimos del trimestre. Se recomienda mayor ejercitación en Lengua y Matemática para afianzar aprendizajes.',
            'Logra resolver las actividades con guía constante; necesita fortalecer la atención sostenida y el cumplimiento de tareas en el hogar.',
        ];

        foreach ($ciclos as $ciclo) {
            $grados = Grado::where('ciclo_lectivo_id', $ciclo->id)
                ->where('estado', true)
                ->with([
                    'materias' => fn ($q) => $q->where('estado', true),
                    'matriculas.alumno',
                ])
                ->get();

            foreach ($grados as $grado) {
                if (! $grado->docente_titular_id || $grado->materias->isEmpty()) {
                    continue;
                }

                $cuaderno = CuadernoAuxiliar::updateOrCreate(
                    [
                        'grado_id' => $grado->id,
                        'ciclo_lectivo_id' => $ciclo->id,
                        'periodo' => '1_trimestre',
                    ],
                    [
                        'docente_id' => $grado->docente_titular_id,
                        'materia_id' => null,
                        'estado' => 'aprobado',
                        'observaciones_vicedireccion' => null,
                        'sintesis_general' => "Durante el 1.° Trimestre del ciclo lectivo {$ciclo->anio}, el grupo de {$grado->numero}.° Grado \"{$grado->division}\" (Turno {$grado->turno}) mostró una adecuada adaptación y compromiso con las propuestas pedagógicas. Se consolidaron los contenidos prioritarios de alfabetización, comprensión lectora y resolución de situaciones problemáticas, manteniendo buenos niveles de asistencia.",
                    ]
                );

                // Excluir alumnos con legajo de inclusión (se evalúan por PPI)
                $alumnosRegulares = $grado->matriculas
                    ->pluck('alumno')
                    ->filter(fn ($al) => $al && $al->estado && ! in_array((int) $al->id, $alumnosInclusionIds, true))
                    ->values();

                // Notas posibles entre 6 y 10 (en enteros y medios puntos)
                $escalaNotas = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

                foreach ($alumnosRegulares as $idx => $alumno) {
                    // Definir un perfil de rendimiento distinto por alumno para variedad realista
                    $perfil = ($idx + $ciclo->anio + $grado->numero) % 3;
                    $rangoIndices = match ($perfil) {
                        0 => [5, 8], // Notas altas: 8.5 a 10.0
                        1 => [2, 6], // Notas medias-altas: 7.0 a 9.0
                        default => [0, 4], // Notas aprobadas base: 6.0 a 8.0
                    };

                    $notasGeneradas = [];
                    foreach ($grado->materias as $materia) {
                        $nota = $escalaNotas[random_int($rangoIndices[0], $rangoIndices[1])];
                        $notasGeneradas[$materia->id] = $nota;
                    }

                    $promedioAlumno = array_sum($notasGeneradas) / count($notasGeneradas);

                    $observacion = match (true) {
                        $promedioAlumno >= 8.8 => $observacionesDestacadas[array_rand($observacionesDestacadas)],
                        $promedioAlumno >= 7.2 => $observacionesBuenas[array_rand($observacionesBuenas)],
                        default => $observacionesRegulares[array_rand($observacionesRegulares)],
                    };

                    $calificacion = Calificacion::updateOrCreate(
                        [
                            'cuaderno_auxiliar_id' => $cuaderno->id,
                            'alumno_id' => $alumno->id,
                        ],
                        [
                            'inasistencias_total' => random_int(0, 4),
                            'sintesis_pedagogica_ia' => $observacion,
                        ]
                    );

                    foreach ($notasGeneradas as $materiaId => $valorNota) {
                        CalificacionMateria::updateOrCreate(
                            [
                                'calificacion_id' => $calificacion->id,
                                'materia_id' => $materiaId,
                            ],
                            [
                                'nota_numerica' => $valorNota,
                            ]
                        );
                    }
                }
            }
        }
    }
}