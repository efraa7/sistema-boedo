<?php

use App\Http\Controllers\AlumnoController;
use App\Http\Controllers\GradoController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\CicloLectivoController;
use App\Http\Controllers\InclusionController;
use App\Http\Controllers\CuadernoAuxiliarController;
use App\Http\Controllers\CopaLecheController;
use App\Http\Controllers\CuadroHonorController;
use App\Http\Controllers\EstadisticaController;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function (\Illuminate\Http\Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user && $user->hasAnyRole(['super-admin', 'director'])) {
            return redirect()->route('estadisticas.index');
        }

        if ($user && $user->hasRole('docente-pedagogico')) {
            return redirect()->route('inclusion.index');
        }

        if ($user && $user->can('listar cuadernos')) {
            return redirect()->route('cuadernos.index');
        }

        if ($user && $user->can('listar inclusion')) {
            return redirect()->route('inclusion.index');
        }

        if ($user && $user->can('listar alumnos')) {
            return redirect()->route('alumnos.index');
        }

        if ($user && $user->can('listar copa leche')) {
            return redirect()->route('copa-leche.index');
        }

        if ($user && $user->can('ver cuadro honor')) {
            return redirect()->route('cuadro-honor.index');
        }

        return redirect()->route('home');
    })->name('dashboard');
    Route::get('estadisticas', [EstadisticaController::class, 'index'])->name('estadisticas.index');
    Route::resource('materias', MateriaController::class)->except(['show']);
    Route::get('/grados/exportar-excel', [GradoController::class, 'exportarExcel'])
        ->name('grados.exportar-excel');
    Route::get('grados/{grado}/alumnos', [GradoController::class, 'alumnos'])->name('grados.alumnos');
    Route::get('grados/{grado}/materias', [GradoController::class, 'editMaterias'])->name('grados.materias.edit');
    Route::put('grados/{grado}/materias', [GradoController::class, 'updateMaterias'])->name('grados.materias.update');
    Route::resource('grados', GradoController::class)->except(['show']);
    Route::get('/alumnos/exportar-excel', [AlumnoController::class, 'exportarExcel'])
        ->name('alumnos.exportar-excel');
    Route::post('/alumnos/importar-excel', [AlumnoController::class, 'importarExcel'])
        ->name('alumnos.importar-excel');
    Route::resource('alumnos', AlumnoController::class);
    Route::resource('usuarios', UserController::class)->except(['show'])->parameters([
        'usuarios' => 'usuario'
    ]);
    Route::resource('ciclos-lectivos', CicloLectivoController::class)->except(['show'])->parameters([
        'ciclos-lectivos' => 'cicloLectivo'
    ]);
    Route::get('/inclusion/{inclusion}/archivo-cud', [InclusionController::class, 'descargarCud'])
        ->name('inclusion.descargar-cud');
    Route::get('/inclusion/exportar-excel', [InclusionController::class, 'exportarExcel'])
        ->name('inclusion.exportar-excel');
    Route::post('/inclusion/{inclusion}/informe-inicial', [InclusionController::class, 'guardarInformeInicial'])
        ->name('inclusion.informe-inicial.guardar');
    Route::post('/inclusion/{inclusion}/ppi', [InclusionController::class, 'guardarPpi'])
        ->name('inclusion.ppi.guardar');
    Route::post('/inclusion/{inclusion}/informe-periodo', [InclusionController::class, 'guardarInformePeriodo'])
        ->name('inclusion.informe-periodo.guardar');
    Route::get('/inclusion/{inclusion}/pdf/{tipo}', [InclusionController::class, 'descargarPdf'])
        ->name('inclusion.pdf');
    Route::resource('inclusion', InclusionController::class)->parameters([
        'inclusion' => 'inclusion',
    ]);
    Route::get('cuadernos/exportar-excel', [CuadernoAuxiliarController::class, 'exportarMultiplesExcel'])->name('cuadernos.exportar-multiples-excel');
    Route::get('cuadernos/{id}/exportar-excel', [CuadernoAuxiliarController::class, 'exportarExcel'])->name('cuadernos.exportar-excel');
    Route::post('cuadernos/{id}/enviar', [CuadernoAuxiliarController::class, 'enviarAVisado'])->name('cuadernos.enviar');
    Route::post('cuadernos/{id}/visar', [CuadernoAuxiliarController::class, 'visar'])->name('cuadernos.visar');
    Route::post('cuadernos/{id}/calificaciones', [CuadernoAuxiliarController::class, 'guardarCalificaciones'])->name('cuadernos.calificaciones');
    Route::post('cuadernos/{id}/ia/corregir-observacion', [CuadernoAuxiliarController::class, 'corregirObservacionIa'])->name('cuadernos.ia.corregir');
    Route::post('cuadernos/{id}/ia/sintesis-general', [CuadernoAuxiliarController::class, 'generarSintesisGeneralIa'])->name('cuadernos.ia.sintesis');
    Route::resource('cuadernos', CuadernoAuxiliarController::class)->except(['create', 'edit']);
    Route::get('copa-leche', [CopaLecheController::class, 'index'])->name('copa-leche.index');
    Route::get('copa-leche/exportar-excel', [CopaLecheController::class, 'exportarExcel'])->name('copa-leche.exportar-excel');
    Route::get('copa-leche/grado/{grado}', [CopaLecheController::class, 'show'])->name('copa-leche.show');
    Route::patch('copa-leche/alumnos/{alumno}/toggle', [CopaLecheController::class, 'toggleAlumno'])->name('copa-leche.toggle-alumno');
    Route::get('cuadro-honor', [CuadroHonorController::class, 'index'])->name('cuadro-honor.index');
    Route::post('cuadro-honor/alumnos/{alumno}/foto', [CuadroHonorController::class, 'actualizarFoto'])->name('cuadro-honor.actualizar-foto');
    Route::get('cuadro-honor/descargar-pdf', [CuadroHonorController::class, 'descargarPdf'])->name('cuadro-honor.descargar-pdf');
});

require __DIR__ . '/settings.php';