<?php

namespace Database\Seeders;

use App\Models\Alumno;
use App\Models\CicloLectivo;
use App\Models\Grado;
use App\Models\LegajoInclusion;
use App\Models\Materia;
use App\Models\Matricula;
use App\Models\User;
use Illuminate\Database\Seeder;

class EstructuraAcademicaSeeder extends Seeder
{
    public function run(): void
    {
        $ciclo2025 = CicloLectivo::firstOrCreate(
            ['anio' => 2025],
            [
                'fecha_inicio' => '2025-03-03',
                'fecha_fin' => '2025-12-19',
                'cerrado' => true,
            ]
        );

        $ciclo2026 = CicloLectivo::firstOrCreate(
            ['anio' => 2026],
            [
                'fecha_inicio' => '2026-03-02',
                'fecha_fin' => '2026-12-18',
                'cerrado' => false,
            ]
        );

        $catalogoMaterias = [
            ['codigo' => 'LEN', 'nombre' => 'Lengua', 'es_especial' => false],
            ['codigo' => 'MAT', 'nombre' => 'Matemática', 'es_especial' => false],
            ['codigo' => 'CSO', 'nombre' => 'Ciencias Sociales', 'es_especial' => false],
            ['codigo' => 'CNA', 'nombre' => 'Ciencias Naturales', 'es_especial' => false],
            ['codigo' => 'FCE', 'nombre' => 'Formación Ética y Ciudadana', 'es_especial' => false],
            ['codigo' => 'TEC', 'nombre' => 'Educación Tecnológica', 'es_especial' => true],
            ['codigo' => 'EFI', 'nombre' => 'Educación Física', 'es_especial' => true],
            ['codigo' => 'ART', 'nombre' => 'Educación Artística', 'es_especial' => true],
            ['codigo' => 'ING', 'nombre' => 'Lengua Extranjera (Inglés)', 'es_especial' => true],
        ];

        $materiasIds = [];
        foreach ($catalogoMaterias as $item) {
            $materia = Materia::firstOrCreate(
                ['codigo' => $item['codigo']],
                [
                    'nombre' => $item['nombre'],
                    'es_especial' => $item['es_especial'],
                    'estado' => true,
                ]
            );
            $materiasIds[] = $materia->id;
        }

        $grados2025 = $this->crearGradosParaCiclo($ciclo2025, $materiasIds);
        $grados2026 = $this->crearGradosParaCiclo($ciclo2026, $materiasIds);

        $alumnos2025PorAula = [
            'Mañana' => [],
            'Tarde' => [],
        ];

        foreach (['Mañana', 'Tarde'] as $turno) {
            for ($num = 1; $num <= 7; $num++) {
                $grado2025 = $grados2025[$turno][$num];
                $alumnosCreados = Alumno::factory()
                    ->count(5)
                    ->paraIngreso($num, 2025)
                    ->create();

                $alumnos2025PorAula[$turno][$num] = $alumnosCreados;

                foreach ($alumnosCreados as $alumno) {
                    Matricula::create([
                        'alumno_id' => $alumno->id,
                        'grado_id' => $grado2025->id,
                        'ciclo_lectivo_id' => $ciclo2025->id,
                        'dictamen_3er_trimestre' => $num === 7 ? 'Egresado' : 'Promovido',
                    ]);
                }
            }
        }

        foreach (['Mañana', 'Tarde'] as $turno) {
            for ($num = 1; $num <= 7; $num++) {
                $grado2026 = $grados2026[$turno][$num];

                if ($num === 1) {
                    $ingresantes = Alumno::factory()
                        ->count(7)
                        ->paraIngreso(1, 2026)
                        ->create();

                    foreach ($ingresantes as $alumno) {
                        Matricula::create([
                            'alumno_id' => $alumno->id,
                            'grado_id' => $grado2026->id,
                            'ciclo_lectivo_id' => $ciclo2026->id,
                            'dictamen_3er_trimestre' => 'En Curso',
                        ]);
                    }
                } else {
                    $promovidos = $alumnos2025PorAula[$turno][$num - 1];

                    foreach ($promovidos as $alumnoPromovido) {
                        Matricula::create([
                            'alumno_id' => $alumnoPromovido->id,
                            'grado_id' => $grado2026->id,
                            'ciclo_lectivo_id' => $ciclo2026->id,
                            'dictamen_3er_trimestre' => 'En Curso',
                        ]);
                    }

                    $companerosNuevos = Alumno::factory()
                        ->count(2)
                        ->paraIngreso($num, 2026)
                        ->create();

                    foreach ($companerosNuevos as $nuevo) {
                        Matricula::create([
                            'alumno_id' => $nuevo->id,
                            'grado_id' => $grado2026->id,
                            'ciclo_lectivo_id' => $ciclo2026->id,
                            'dictamen_3er_trimestre' => 'En Curso',
                        ]);
                    }
                }
            }
        }

        $mai1 = User::where('email', 'pedagogico1@escuelaboedo.edu.ar')->first();
        $mai2 = User::where('email', 'pedagogico2@escuelaboedo.edu.ar')->first();

        $casosInclusion = [
            [
                'mai' => $mai1,
                'turno' => 'Mañana',
                'grado_2025' => 1,
                'diagnostico' => 'Trastorno del Espectro Autista (TEA) - Nivel 1',
                'posee_cud' => true,
                'vencimiento_cud' => '2028-06-15',
            ],
            [
                'mai' => $mai1,
                'turno' => 'Mañana',
                'grado_2025' => 3,
                'diagnostico' => 'Trastorno por Déficit de Atención e Hiperactividad (TDAH)',
                'posee_cud' => true,
                'vencimiento_cud' => '2027-11-20',
            ],
            [
                'mai' => $mai1,
                'turno' => 'Mañana',
                'grado_2025' => 5,
                'diagnostico' => 'Dislexia evolutiva y dificultades específicas del aprendizaje',
                'posee_cud' => false,
                'vencimiento_cud' => null,
            ],
            [
                'mai' => $mai2,
                'turno' => 'Tarde',
                'grado_2025' => 2,
                'diagnostico' => 'Trastorno Específico del Lenguaje (TEL)',
                'posee_cud' => true,
                'vencimiento_cud' => '2028-03-10',
            ],
            [
                'mai' => $mai2,
                'turno' => 'Tarde',
                'grado_2025' => 4,
                'diagnostico' => 'Discapacidad intelectual leve con apoyo pedagógico',
                'posee_cud' => true,
                'vencimiento_cud' => '2029-08-30',
            ],
            [
                'mai' => $mai2,
                'turno' => 'Tarde',
                'grado_2025' => 6,
                'diagnostico' => 'Hipoacusia neurosensorial bilateral moderada',
                'posee_cud' => true,
                'vencimiento_cud' => '2028-12-01',
            ],
        ];

        foreach ($casosInclusion as $caso) {
            $gradoNum2025 = $caso['grado_2025'];
            $gradoNum2026 = $gradoNum2025 + 1;
            $turno = $caso['turno'];

            $alumnoInc = Alumno::factory()
                ->paraIngreso($gradoNum2025, 2025)
                ->create();

            Matricula::create([
                'alumno_id' => $alumnoInc->id,
                'grado_id' => $grados2025[$turno][$gradoNum2025]->id,
                'ciclo_lectivo_id' => $ciclo2025->id,
                'dictamen_3er_trimestre' => 'Promovido',
            ]);

            Matricula::create([
                'alumno_id' => $alumnoInc->id,
                'grado_id' => $grados2026[$turno][$gradoNum2026]->id,
                'ciclo_lectivo_id' => $ciclo2026->id,
                'dictamen_3er_trimestre' => 'En Curso',
            ]);

            LegajoInclusion::create([
                'alumno_id' => $alumnoInc->id,
                'diagnostico' => $caso['diagnostico'],
                'posee_cud' => $caso['posee_cud'],
                'vencimiento_cud' => $caso['vencimiento_cud'],
                'archivo_cud' => null,
                'docente_integrador' => $caso['mai'] ? "{$caso['mai']->apellido}, {$caso['mai']->name}" : null,
                'docente_integrador_email' => $caso['mai']?->email,
                'observaciones_ppi' => 'Configuraciones de acceso y priorización curricular acordadas con equipo directivo y familia.',
            ]);
        }

        $this->aplicarCoberturaCopaDeLeche($ciclo2025);
        $this->aplicarCoberturaCopaDeLeche($ciclo2026);
    }

    /**
     * Crea los 14 grados (1° a 7° Mañana y 1° a 7° Tarde) para un ciclo lectivo dado.
     *
     * @return array<string, array<int, Grado>>
     */
    private function crearGradosParaCiclo(CicloLectivo $ciclo, array $materiasIds): array
    {
        $resultado = [
            'Mañana' => [],
            'Tarde' => [],
        ];

        $aulasPorGrado = [
            1 => 'Aula 1 (Planta Baja)',
            2 => 'Aula 2 (Planta Baja)',
            3 => 'Aula 3 (Planta Baja)',
            4 => 'Aula 4 (Planta Baja)',
            5 => 'Aula 5 (Planta Alta)',
            6 => 'Aula 6 (Planta Alta)',
            7 => 'Aula 7 (Planta Alta)',
        ];

        for ($num = 1; $num <= 7; $num++) {
            $docente = User::where('email', "docente{$num}@escuelaboedo.edu.ar")->first();

            $grado = Grado::updateOrCreate(
                [
                    'ciclo_lectivo_id' => $ciclo->id,
                    'numero' => $num,
                    'division' => 'A',
                    'turno' => 'Mañana',
                ],
                [
                    'docente_titular_id' => $docente?->id,
                    'aula' => $aulasPorGrado[$num],
                    'estado' => true,
                ]
            );

            $grado->materias()->sync($materiasIds);
            $resultado['Mañana'][$num] = $grado;
        }

        for ($num = 1; $num <= 7; $num++) {
            $docenteIdx = $num + 7;
            $docente = User::where('email', "docente{$docenteIdx}@escuelaboedo.edu.ar")->first();

            $grado = Grado::updateOrCreate(
                [
                    'ciclo_lectivo_id' => $ciclo->id,
                    'numero' => $num,
                    'division' => 'A',
                    'turno' => 'Tarde',
                ],
                [
                    'docente_titular_id' => $docente?->id,
                    'aula' => $aulasPorGrado[$num],
                    'estado' => true,
                ]
            );

            $grado->materias()->sync($materiasIds);
            $resultado['Tarde'][$num] = $grado;
        }

        return $resultado;
    }

    /**
     * Garantiza que cada aula tenga entre 80% y 95% de alumnos beneficiarios de Copa de Leche.
     */
    private function aplicarCoberturaCopaDeLeche(CicloLectivo $ciclo): void
    {
        $grados = Grado::where('ciclo_lectivo_id', $ciclo->id)
            ->with('matriculas.alumno')
            ->get();

        foreach ($grados as $grado) {
            $alumnos = $grado->matriculas
                ->pluck('alumno')
                ->filter()
                ->values();

            $total = $alumnos->count();
            if ($total === 0) {
                continue;
            }

            $minBeneficiarios = (int) ceil($total * 0.80);
            $maxBeneficiarios = max($minBeneficiarios, (int) floor($total * 0.95));
            $cantidadObjetivo = random_int($minBeneficiarios, $maxBeneficiarios);

            foreach ($alumnos as $idx => $alumno) {
                $alumno->update([
                    'recibe_copa_leche' => $idx < $cantidadObjetivo,
                ]);
            }
        }
    }
}