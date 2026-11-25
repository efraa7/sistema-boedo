<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Models\Role;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(PermissionMiddleware::using('listar usuarios'), only: ['index']),
            new Middleware(PermissionMiddleware::using('crear usuarios'), only: ['create', 'store']),
            new Middleware(PermissionMiddleware::using('editar usuarios'), only: ['edit', 'update']),
            new Middleware(PermissionMiddleware::using('eliminar usuarios'), only: ['destroy']),
        ];
    }

    public function index(Request $request): Response
    {
        $buscar = $request->input('buscar');
        $rol = $request->input('rol');

        $usuarios = User::query()
            ->with('roles')
            ->when($buscar, function ($query, $buscar) {
                $query->where(function ($q) use ($buscar) {
                    $q->where('dni', 'like', "%{$buscar}%")
                        ->orWhere('apellido', 'like', "%{$buscar}%")
                        ->orWhere('name', 'like', "%{$buscar}%")
                        ->orWhere('email', 'like', "%{$buscar}%");
                });
            })
            ->when($rol, function ($query, $rol) {
                $query->role($rol);
            })
            ->orderBy('apellido')
            ->orderBy('name')
            ->paginate(5)
            ->withQueryString();

        return Inertia::render('usuarios/index', [
            'usuarios' => $usuarios,
            'roles' => Role::orderBy('name')->pluck('name'),
            'filtros' => [
                'buscar' => $buscar ?? '',
                'rol' => $rol ?? '',
            ],
        ]);
    }

    public function create(): Response
    {
        $vicedirectores = User::role('vicedirector')->select('id', 'name', 'apellido')->orderBy('apellido')->get();

        return Inertia::render('usuarios/create', [
            'roles' => Role::orderBy('name')->pluck('name'),
            'vicedirectores' => $vicedirectores,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'vicedirector_id' => $request->input('vicedirector_id') ?: null,
        ]);

        $validated = $request->validate([
            'dni' => ['nullable', 'string', 'max:20', 'unique:users,dni'],
            'apellido' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'estado' => ['required', 'boolean'],
            'rol' => ['required', 'exists:roles,name'],
            'vicedirector_id' => ['nullable', 'exists:users,id'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::transaction(function () use ($request, $validated) {
            $datosUsuario = collect($validated)->except(['rol', 'password', 'password_confirmation', 'foto'])->toArray();
            if ($validated['rol'] !== 'docente') {
                $datosUsuario['vicedirector_id'] = null;
            }

            $datosUsuario['password'] = Hash::make($validated['password']);

            if ($request->hasFile('foto')) {
                $datosUsuario['foto'] = $request->file('foto')->store('personal', 'public');
            }

            $user = User::create($datosUsuario);
            $user->assignRole($validated['rol']);
        });

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario creado y rol asignado correctamente.');
    }

    public function edit(User $usuario): Response
    {
        $usuario->load('roles');
        $vicedirectores = User::role('vicedirector')->select('id', 'name', 'apellido')->orderBy('apellido')->get();

        return Inertia::render('usuarios/edit', [
            'usuario' => $usuario,
            'rolActual' => $usuario->roles->first()?->name ?? '',
            'roles' => Role::orderBy('name')->pluck('name'),
            'vicedirectores' => $vicedirectores,
        ]);
    }

    public function update(Request $request, User $usuario): RedirectResponse
    {
        $vicedirectorId = $request->input('vicedirector_id');
        if (empty($vicedirectorId) || $vicedirectorId === 'null') {
            $request->merge(['vicedirector_id' => null]);
        }

        $validated = $request->validate([
            'dni' => ['nullable', 'string', 'max:20', Rule::unique('users', 'dni')->ignore($usuario->id)],
            'apellido' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($usuario->id)],
            'telefono' => ['nullable', 'string', 'max:50'],
            'estado' => ['required', 'boolean'],
            'rol' => ['required', 'exists:roles,name'],
            'vicedirector_id' => ['nullable', 'exists:users,id'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::transaction(function () use ($request, $validated, $usuario) {
            $datosUsuario = collect($validated)->except(['rol', 'password', 'password_confirmation', 'foto'])->toArray();

            if ($validated['rol'] !== 'docente') {
                $datosUsuario['vicedirector_id'] = null;
            }

            if (! empty($validated['password'])) {
                $datosUsuario['password'] = Hash::make($validated['password']);
            }

            if ($request->hasFile('foto')) {
                if ($usuario->foto && Storage::disk('public')->exists($usuario->foto)) {
                    Storage::disk('public')->delete($usuario->foto);
                }
                $datosUsuario['foto'] = $request->file('foto')->store('personal', 'public');
            }

            $usuario->update($datosUsuario);
            $usuario->syncRoles([$validated['rol']]);
        });

        return redirect()->route('usuarios.index')
            ->with('success', 'Datos del usuario actualizados correctamente.');
    }

    public function destroy(User $usuario): RedirectResponse
    {
        if (auth()->id() === $usuario->id) {
            return back()->with('error', 'Por seguridad, no puedes eliminar tu propio usuario activo.');
        }

        if ($usuario->foto && Storage::disk('public')->exists($usuario->foto)) {
            Storage::disk('public')->delete($usuario->foto);
        }

        $usuario->delete();

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario eliminado correctamente.');
    }
}