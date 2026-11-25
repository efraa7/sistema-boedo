<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permisos = [
            // permisos admin
            'listar usuarios', 'crear usuarios', 'ver usuarios', 'editar usuarios', 'eliminar usuarios',
            'listar roles', 'crear roles', 'ver roles', 'editar roles', 'eliminar roles',
            'listar permisos', 'crear permisos', 'editar permisos', 'eliminar permisos',

            // permisos docentes
            'listar grados', 'crear grados', 'ver grados', 'editar grados', 'eliminar grados',
            'listar materias', 'crear materias', 'ver materias', 'editar materias', 'eliminar materias',

            // permisos alumnos
            'listar alumnos', 'crear alumnos', 'ver alumnos', 'editar alumnos', 'eliminar alumnos',

            // cud / inclusión
            'listar inclusion', 'crear inclusion', 'ver inclusion', 'editar inclusion', 'eliminar inclusion', 'gestionar inclusion',

            // cuaderno auxiliar
            'listar cuadernos', 'crear cuadernos', 'ver cuadernos', 'editar cuadernos', 'visar cuadernos', 'aprobar cuadernos',

            // copa de leche, cuadro honor, reportes pdf y excel
            'listar copa leche', 'registrar copa leche', 'editar copa leche', 'eliminar copa leche',
            'ver cuadro honor', 'gestionar cuadro honor', 'descargar reportes',

            // ciclos lectivos
            'listar ciclos', 'crear ciclos', 'editar ciclos', 'eliminar ciclos',
        ];

        foreach ($permisos as $permiso) {
            Permission::findOrCreate($permiso);
        }

        $rolSuperAdmin = Role::findOrCreate('super-admin');
        $rolDirector = Role::findOrCreate('director');
        $rolVicedirector = Role::findOrCreate('vicedirector');
        $rolAdministrativo = Role::findOrCreate('administrativo');
        $rolDocente = Role::findOrCreate('docente');
        $rolDocentePedagogico = Role::findOrCreate('docente-pedagogico');

        $rolSuperAdmin->givePermissionTo(Permission::all());
        $rolDirector->syncPermissions(Permission::all());

        $rolVicedirector->syncPermissions([
            'listar grados', 'crear grados', 'ver grados', 'editar grados',
            'listar materias', 'ver materias',
            'listar alumnos', 'crear alumnos', 'ver alumnos', 'editar alumnos',
            'listar inclusion', 'crear inclusion', 'ver inclusion', 'editar inclusion', 'gestionar inclusion',
            'listar cuadernos', 'ver cuadernos', 'visar cuadernos',
            'ver cuadro honor', 'gestionar cuadro honor',
            'listar copa leche', 'descargar reportes',
        ]);

        $rolAdministrativo->syncPermissions([
            'listar grados', 'crear grados', 'ver grados', 'editar grados',
            'listar materias', 'crear materias', 'ver materias', 'editar materias',
            'listar alumnos', 'crear alumnos', 'ver alumnos', 'editar alumnos',
            'listar copa leche', 'registrar copa leche', 'editar copa leche',
            'ver cuadro honor', 'descargar reportes',
        ]);

        $rolDocente->syncPermissions([
            'listar grados', 'ver grados',
            'listar alumnos', 'ver alumnos',
            'listar inclusion',
            'listar cuadernos', 'crear cuadernos', 'ver cuadernos', 'editar cuadernos',
            'listar copa leche', 'registrar copa leche',
            'ver cuadro honor', 'descargar reportes',
        ]);

        $rolDocentePedagogico->syncPermissions([
            'listar inclusion',
            'ver inclusion',
        ]);

        $passwordComun = bcrypt('123456789');

        $superAdmin = User::updateOrCreate(
            ['email' => 'superadmin@boedo.edu.ar'],
            [
                'dni' => '45262884',
                'apellido' => 'Flores',
                'name' => 'Walter',
                'telefono' => '3875275066',
                'estado' => true,
                'password' => $passwordComun,
            ]
        );
        $superAdmin->syncRoles([$rolSuperAdmin]);

        $director = User::updateOrCreate(
            ['email' => 'director@escuelaboedo.edu.ar'],
            [
                'dni' => '20111222',
                'apellido' => 'Cabero',
                'name' => 'Gerardo',
                'telefono' => '3874000001',
                'estado' => true,
                'password' => $passwordComun,
            ]
        );
        $director->syncRoles([$rolDirector]);

        $administrativo = User::updateOrCreate(
            ['email' => 'administracion@escuelaboedo.edu.ar'],
            [
                'dni' => '28555666',
                'apellido' => 'Ruiz',
                'name' => 'Carlos Alberto',
                'telefono' => '3874000003',
                'estado' => true,
                'password' => $passwordComun,
            ]
        );
        $administrativo->syncRoles([$rolAdministrativo]);

        // 3 Vicedirectoras
        $vicedirectoresData = [
            1 => ['dni' => '22333441', 'apellido' => 'Gómez', 'name' => 'María Elena', 'telefono' => '3874000011'],
            2 => ['dni' => '22333442', 'apellido' => 'Mendoza', 'name' => 'Patricia Beatriz', 'telefono' => '3874000012'],
            3 => ['dni' => '22333443', 'apellido' => 'Soria', 'name' => 'Jorge Luis', 'telefono' => '3874000013'],
        ];

        $vicedirectores = [];
        foreach ($vicedirectoresData as $num => $datos) {
            $vice = User::updateOrCreate(
                ['email' => "vicedirector{$num}@escuelaboedo.edu.ar"],
                array_merge($datos, [
                    'estado' => true,
                    'password' => $passwordComun,
                ])
            );
            $vice->syncRoles([$rolVicedirector]);
            $vicedirectores[$num] = $vice;
        }

        // 14 Docentes titulares (1..7 Turno Mañana, 8..14 Turno Tarde)
        // Repartidos equitativamente entre las 3 vicedirectoras: Vice 1 (5), Vice 2 (5), Vice 3 (4)
        $docentesData = [
            1  => ['dni' => '32777801', 'apellido' => 'Flores',     'name' => 'Laura Silvina',      'vice' => 1],
            2  => ['dni' => '32777802', 'apellido' => 'Romero',     'name' => 'Valeria Soledad',    'vice' => 1],
            3  => ['dni' => '32777803', 'apellido' => 'Peralta',    'name' => 'Daniela Fernanda',   'vice' => 1],
            4  => ['dni' => '32777804', 'apellido' => 'Cárdenas',   'name' => 'Luciana Belén',      'vice' => 1],
            5  => ['dni' => '32777805', 'apellido' => 'Navarro',    'name' => 'Marcos Antonio',     'vice' => 1],
            6  => ['dni' => '32777806', 'apellido' => 'Arias',      'name' => 'Claudia Noemí',      'vice' => 2],
            7  => ['dni' => '32777807', 'apellido' => 'Villalba',   'name' => 'Gabriela Alejandra', 'vice' => 2],
            8  => ['dni' => '32777808', 'apellido' => 'Quinteros',  'name' => 'Diego Hernán',       'vice' => 2],
            9  => ['dni' => '32777809', 'apellido' => 'Ledesma',    'name' => 'Verónica Beatriz',   'vice' => 2],
            10 => ['dni' => '32777810', 'apellido' => 'Carrizo',    'name' => 'Silvia Roxana',      'vice' => 2],
            11 => ['dni' => '32777811', 'apellido' => 'Maidana',    'name' => 'Pablo Sebastián',    'vice' => 3],
            12 => ['dni' => '32777812', 'apellido' => 'Coronel',    'name' => 'Andrea Fabiana',     'vice' => 3],
            13 => ['dni' => '32777813', 'apellido' => 'Benítez',    'name' => 'Natalia Carolina',   'vice' => 3],
            14 => ['dni' => '32777814', 'apellido' => 'Sánchez',    'name' => 'Fernando Javier',    'vice' => 3],
        ];

        foreach ($docentesData as $num => $datos) {
            $docente = User::updateOrCreate(
                ['email' => "docente{$num}@escuelaboedo.edu.ar"],
                [
                    'dni' => $datos['dni'],
                    'apellido' => $datos['apellido'],
                    'name' => $datos['name'],
                    'telefono' => sprintf('3874000%03d', 20 + $num),
                    'vicedirector_id' => $vicedirectores[$datos['vice']]->id,
                    'estado' => true,
                    'password' => $passwordComun,
                ]
            );
            $docente->syncRoles([$rolDocente]);
        }

        // 2 MAI (Maestras de Apoyo a la Inclusión)
        $pedagogicosData = [
            1 => ['dni' => '33888991', 'apellido' => 'Salazar', 'name' => 'Romina Andrea',   'telefono' => '3874000051'],
            2 => ['dni' => '33888992', 'apellido' => 'Torres',  'name' => 'Natalia Verónica', 'telefono' => '3874000052'],
        ];

        foreach ($pedagogicosData as $num => $datos) {
            $pedagogico = User::updateOrCreate(
                ['email' => "pedagogico{$num}@escuelaboedo.edu.ar"],
                array_merge($datos, [
                    'estado' => true,
                    'password' => $passwordComun,
                ])
            );
            $pedagogico->syncRoles([$rolDocentePedagogico]);
        }
    }
}