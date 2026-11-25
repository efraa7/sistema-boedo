<?php

namespace Database\Factories;

use App\Models\Alumno;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Alumno>
 */
class AlumnoFactory extends Factory
{
    protected $model = Alumno::class;

    public function definition(): array
    {
        $faker = fake('es_ES');

        $apellidosSalta = [
            'Mamaní', 'Tolaba', 'Choque', 'Salvatierra', 'Burgos',
            'Colque', 'Gutiérrez', 'Vázquez', 'Condorí', 'Aramayo',
            'Subelza', 'Zerpa', 'Lamas', 'Cruz', 'Tapia',
            'Ramos', 'Farfán', 'Vilte', 'Aguirre', 'Cardozo',
            'Quipildor', 'Chocobar', 'Apaza', 'Guantay', 'Sajama',
        ];

        $nombres = [
            'Mateo Benjamín', 'Valentina Jazmín', 'Santiago Nicolás', 'Lucía Guadalupe', 'Thiago Agustín',
            'Martina Sofía', 'Bautista Ezequiel', 'Emma Victoria', 'Liam Gabriel', 'Alma Milagros',
            'Santino Javier', 'Catalina Isabel', 'Joaquín Ignacio', 'Mía Celeste', 'Benjamín Alexis',
            'Zoe Antonella', 'Lautaro Nahuel', 'Delfina Rocío', 'Dylan Exequiel', 'Renata Camila',
            'Tiziano Gael', 'Isabella Lourdes', 'Ian Valentino', 'Emilia Solange', 'Julián Alejandro',
        ];

        $barrios = [
            'B° San Cayetano', 'B° Islas Malvinas', 'B° Centro',
            'B° El Carmen', 'B° Belgrano', 'B° Santa Teresita',
        ];

        $apellido = $faker->randomElement($apellidosSalta);
        $nombre = $faker->randomElement($nombres);
        $barrio = $faker->randomElement($barrios);

        return [
            'dni' => (string) $faker->unique()->numberBetween(48100000, 56999999),
            'legajo' => sprintf('BOE-%d-%04d', 2026, $faker->unique()->numberBetween(1, 9999)),
            'apellido' => $apellido,
            'nombre' => $nombre,
            'fecha_nacimiento' => $faker->dateTimeBetween('2013-01-01', '2020-12-31')->format('Y-m-d'),
            'domicilio' => "{$barrio} Mz {$faker->numberBetween(1, 25)} Casa {$faker->numberBetween(1, 30)}, La Merced",
            'tutor_nombre' => "{$faker->firstName()} {$apellido}",
            'tutor_telefono' => '387' . $faker->numerify('4######'),
            'tutor_email' => null,
            'foto' => null,
            'recibe_copa_leche' => true,
            'estado' => true,
        ];
    }

    /**
     * Ajusta la fecha de nacimiento y el prefijo de legajo según el grado y ciclo de ingreso.
     */
    public function paraIngreso(int $gradoNumero, int $anioCiclo): static
    {
        $anioNacimiento = ($anioCiclo - 5) - $gradoNumero;

        return $this->state(fn () => [
            'legajo' => sprintf('BOE-%d-%04d', $anioCiclo, fake()->unique()->numberBetween(1, 9999)),
            'fecha_nacimiento' => fake()->dateTimeBetween(
                "{$anioNacimiento}-01-01",
                "{$anioNacimiento}-12-31"
            )->format('Y-m-d'),
        ]);
    }

    public function conCopaDeLeche(): static
    {
        return $this->state(fn () => ['recibe_copa_leche' => true]);
    }

    public function sinCopaDeLeche(): static
    {
        return $this->state(fn () => ['recibe_copa_leche' => false]);
    }
}