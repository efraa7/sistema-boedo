<?php

namespace App\Http\Controllers;

use App\Models\CicloLectivo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Middleware\PermissionMiddleware;

class CicloLectivoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar ciclos'), only: ['index']),
            new Middleware(PermissionMiddleware::using('crear ciclos'), only: ['create', 'store']),
            new Middleware(PermissionMiddleware::using('editar ciclos'), only: ['edit', 'update']),
            new Middleware(PermissionMiddleware::using('eliminar ciclos'), only: ['destroy']),
        ];
    }

    public function index(): Response
    {
        $ciclos = CicloLectivo::orderBy('anio', 'desc')
            ->paginate(5)
            ->withQueryString();

        return Inertia::render('ciclos-lectivos/index', [
            'ciclos' => $ciclos,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('ciclos-lectivos/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'anio' => ['required', 'integer', 'min:2020', 'max:2100', 'unique:ciclos_lectivos,anio'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after:fecha_inicio'],
            'observaciones' => ['nullable', 'string', 'max:255'],
            'cerrado' => ['required', 'boolean'],
        ]);

        $habiaOtroActivo = ! $validated['cerrado'] && CicloLectivo::where('cerrado', false)->exists();

        DB::transaction(function () use ($validated) {
            CicloLectivo::create($validated);
        });

        $mensaje = $habiaOtroActivo
            ? 'Ciclo lectivo aperturado correctamente. El ciclo activo anterior fue cerrado automáticamente.'
            : 'Ciclo lectivo aperturado correctamente.';

        return redirect()->route('ciclos-lectivos.index')
            ->with('success', $mensaje);
    }

    public function edit(CicloLectivo $cicloLectivo): Response
    {
        return Inertia::render('ciclos-lectivos/edit', [
            'cicloLectivo' => $cicloLectivo,
        ]);
    }

    public function update(Request $request, CicloLectivo $cicloLectivo): RedirectResponse
    {
        $validated = $request->validate([
            'anio' => ['required', 'integer', 'min:2020', 'max:2100', Rule::unique('ciclos_lectivos')->ignore($cicloLectivo->id)],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after:fecha_inicio'],
            'observaciones' => ['nullable', 'string', 'max:255'],
            'cerrado' => ['required', 'boolean'],
        ]);

        $habiaOtroActivo = ! $validated['cerrado']
            && CicloLectivo::where('id', '!=', $cicloLectivo->id)->where('cerrado', false)->exists();

        DB::transaction(function () use ($cicloLectivo, $validated) {
            $cicloLectivo->update($validated);
        });

        if ($validated['cerrado']) {
            $mensaje = 'Ciclo lectivo actualizado y cerrado (congelado) exitosamente.';
        } elseif ($habiaOtroActivo) {
            $mensaje = 'Ciclo lectivo activado. El ciclo activo anterior fue cerrado automáticamente.';
        } else {
            $mensaje = 'Ciclo lectivo actualizado correctamente.';
        }

        return redirect()->route('ciclos-lectivos.index')->with('success', $mensaje);
    }

    public function destroy(CicloLectivo $cicloLectivo): RedirectResponse
    {
        if ($cicloLectivo->grados()->exists() || $cicloLectivo->matriculas()->exists()) {
            return back()->with('error', 'No se puede eliminar: el ciclo ya posee grados o alumnos matriculados. Se recomienda cerrarlo.');
        }

        $cicloLectivo->delete();

        return redirect()->route('ciclos-lectivos.index')
            ->with('success', 'Ciclo lectivo eliminado del sistema.');
    }
}