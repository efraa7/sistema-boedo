<?php

namespace App\Http\Controllers;

use App\Models\Materia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Middleware\PermissionMiddleware;
use App\Models\CicloLectivo;


class MateriaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar materias'), only: ['index']),
            new Middleware(PermissionMiddleware::using('crear materias'), only: ['create', 'store']),
            new Middleware(PermissionMiddleware::using('editar materias'), only: ['edit', 'update']),
            new Middleware(PermissionMiddleware::using('eliminar materias'), only: ['destroy']),
        ];
    }

    public function index(Request $request): Response
    {
        $buscar = $request->input('buscar');
        $ciclos = CicloLectivo::orderByDesc('anio')->get(['id', 'anio', 'cerrado']);
        $cicloActivo = $ciclos->firstWhere('cerrado', false);

        if ($request->has('ciclo_id')) {
            $cicloFiltro = $request->input('ciclo_id') === 'todos'
                ? 'todos'
                : (int) $request->input('ciclo_id');
        } else {
            $cicloFiltro = $cicloActivo?->id ?? $ciclos->first()?->id ?? 'todos';
        }

        $materias = Materia::query()
            ->withCount([
                'grados' => function ($query) use ($cicloFiltro) {
                    $query->where('grados.estado', true);

                    if ($cicloFiltro !== 'todos' && $cicloFiltro !== null) {
                        $query->where('grados.ciclo_lectivo_id', $cicloFiltro);
                    }
                },
            ])
            ->when($buscar, function ($query, $buscar) {
                $query->where(function ($q) use ($buscar) {
                    $q->where('nombre', 'like', "%{$buscar}%")
                        ->orWhere('codigo', 'like', "%{$buscar}%");
                });
            })
            ->orderBy('es_especial')
            ->orderBy('nombre')
            ->paginate(5)
            ->withQueryString();

        return Inertia::render('materias/index', [
            'materias' => $materias,
            'ciclos' => $ciclos,
            'filtros' => [
                'buscar' => $buscar ?? '',
                'ciclo_id' => $cicloFiltro !== null ? (string) $cicloFiltro : 'todos',
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('materias/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'codigo' => ['required', 'string', 'max:10', 'unique:materias,codigo'],
            'nombre' => ['required', 'string', 'max:150'],
            'es_especial' => ['required', 'boolean'],
            'estado' => ['required', 'boolean'],
        ], [
            'codigo.unique' => 'Ya existe una materia registrada con este código.',
        ]);

        $validated['codigo'] = strtoupper(trim($validated['codigo']));

        Materia::create($validated);

        return redirect()->route('materias.index')
            ->with('success', 'Materia creada correctamente.');
    }

    public function edit(Materia $materia): Response
    {
        return Inertia::render('materias/edit', [
            'materia' => $materia,
        ]);
    }

    public function update(Request $request, Materia $materia): RedirectResponse
    {
        $validated = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:10',
                Rule::unique('materias', 'codigo')->ignore($materia->id),
            ],
            'nombre' => ['required', 'string', 'max:150'],
            'es_especial' => ['required', 'boolean'],
            'estado' => ['required', 'boolean'],
        ], [
            'codigo.unique' => 'Ya existe otra materia con este código.',
        ]);

        $validated['codigo'] = strtoupper(trim($validated['codigo']));

        $materia->update($validated);

        return redirect()->route('materias.index')
            ->with('success', 'Materia actualizada correctamente.');
    }

    public function destroy(Materia $materia): RedirectResponse
    {
        if ($materia->grados()->exists()) {
            return back()->with(
                'error',
                'No se puede eliminar la materia porque está asignada a uno o más grados.'
            );
        }

        $materia->delete();

        return redirect()->route('materias.index')
            ->with('success', 'Materia eliminada correctamente.');
    }
}