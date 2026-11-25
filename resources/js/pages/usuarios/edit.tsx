import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Vicedirector {
    id: number;
    name: string;
    apellido: string;
}

interface UsuarioPersonalizado {
    id: number;
    dni: string | null;
    apellido: string | null;
    name: string;
    email: string;
    telefono: string | null;
    foto: string | null;
    foto_url: string | null;
    estado: boolean;
    vicedirector_id: number | null; // Se agregó
}
interface Props {
    usuario: UsuarioPersonalizado;
    rolActual: string;
    roles: string[];
    vicedirectores: Vicedirector[];
}

export default function UsuarioEdit({ usuario, rolActual, roles, vicedirectores }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Personal Escolar', href: '/usuarios' },
        { title: 'Editar Usuario', href: `/usuarios/${usuario.id}/edit` },
    ];

const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        dni: usuario.dni ?? '',
        apellido: usuario.apellido ?? '',
        name: usuario.name,
        email: usuario.email,
        telefono: usuario.telefono ?? '',
        rol: rolActual,
        vicedirector_id: usuario.vicedirector_id ? String(usuario.vicedirector_id) : '', 
        estado: Boolean(usuario.estado),
        password: '',
        password_confirmation: '',
        foto: null as File | null,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(`/usuarios/${usuario.id}`, { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${usuario.name}`} />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Editar Acceso: {usuario.name} {usuario.apellido}</h1>
                    <p className="text-sm text-muted-foreground">Dejá las contraseñas en blanco si no querés modificarlas.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Nombres</label>
                            <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Apellidos</label>
                            <input type="text" value={data.apellido} onChange={(e) => setData('apellido', e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.apellido && <p className="mt-1 text-xs text-red-500">{errors.apellido}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">DNI</label>
                            <input type="text" value={data.dni} onChange={(e) => setData('dni', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.dni && <p className="mt-1 text-xs text-red-500">{errors.dni}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Teléfono</label>
                            <input type="text" value={data.telefono} onChange={(e) => setData('telefono', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div className="border-t pt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Correo Electrónico (Acceso)</label>
                            <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Modificar Rol</label>
                            <select value={data.rol} onChange={(e) => setData('rol', e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize">
                                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {errors.rol && <p className="mt-1 text-xs text-red-500">{errors.rol}</p>}
                        </div>
                        {data.rol === 'docente' && (
                            <div className="col-span-1 sm:col-span-2 mt-2 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                                <label className="mb-1 block text-sm font-medium text-blue-800 dark:text-blue-300">Vicedirector a cargo (Para supervisión de cuadernos)</label>
                                <select 
                                    value={data.vicedirector_id} 
                                    onChange={(e) => setData('vicedirector_id', e.target.value)} 
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">— Sin vicedirector asignado</option>
                                    {vicedirectores.map((v) => (
                                        <option key={v.id} value={v.id}>{v.apellido}, {v.name}</option>
                                    ))}
                                </select>
                                {errors.vicedirector_id && <p className="mt-1 text-xs text-red-500">{errors.vicedirector_id}</p>}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Nueva Contraseña</label>
                            <input type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="(Opcional)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">Confirmar Nueva Contraseña</label>
                            <input type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} placeholder="(Opcional)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div className="border-t pt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Reemplazar Foto</label>
                            <div className="flex items-center gap-3">
                                {usuario.foto_url && <img src={usuario.foto_url} className="h-10 w-10 rounded-full object-cover border" alt="Avatar" />}
                                <input type="file" accept="image/*" onChange={(e) => setData('foto', e.target.files ? e.target.files[0] : null)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                            </div>
                            {errors.foto && <p className="mt-1 text-xs text-red-500">{errors.foto}</p>}
                        </div>
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.estado} onChange={(e) => setData('estado', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                                <span>Permitir el ingreso al sistema (Activo)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link href="/usuarios" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</Link>
                        <button type="submit" disabled={processing} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                            {processing ? 'Actualizando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}