import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Mail, Search, UserCheck, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { type DocentePedagogicoMin } from './create';
import { type LegajoInclusionItem } from './index';

interface Props {
    legajo: LegajoInclusionItem & {
        docente_integrador_id?: number | null;
        docente_integrador_email?: string | null;
        observaciones_ppi?: string | null;
    };
    docentesPedagogicos: DocentePedagogicoMin[];
}

export default function InclusionEdit({ legajo, docentesPedagogicos }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Inclusión', href: '/inclusion' },
        { title: `Editar Legajo: ${legajo.alumno.apellido}`, href: `/inclusion/${legajo.id}/edit` },
    ];

    const idInicial = useMemo(() => {
        if (legajo.docente_integrador_id) {
            return String(legajo.docente_integrador_id);
        }
        if (legajo.docente_integrador_email) {
            const coincidencia = docentesPedagogicos.find(
                (d) => d.email.toLowerCase() === legajo.docente_integrador_email?.toLowerCase()
            );
            if (coincidencia) return String(coincidencia.id);
        }
        return '';
    }, [legajo, docentesPedagogicos]);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        diagnostico: legajo.diagnostico,
        posee_cud: Boolean(legajo.posee_cud),
        vencimiento_cud: legajo.vencimiento_cud ? legajo.vencimiento_cud.split('T')[0] : '',
        archivo_cud: null as File | null,
        docente_integrador_id: idInicial,
        enviar_correo: false,
        observaciones_ppi: legajo.observaciones_ppi ?? '',
    });

    const [busquedaDocente, setBusquedaDocente] = useState<string>('');

    const docentesFiltrados = useMemo(() => {
        const q = busquedaDocente
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        if (!q) return docentesPedagogicos;

        return docentesPedagogicos.filter((doc) => {
            const texto = `${doc.apellido} ${doc.name} ${doc.dni} ${doc.email}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            return texto.includes(q);
        });
    }, [docentesPedagogicos, busquedaDocente]);

    const docenteSeleccionado = useMemo(
        () =>
            docentesPedagogicos.find((doc) => String(doc.id) === String(data.docente_integrador_id)) ??
            null,
        [docentesPedagogicos, data.docente_integrador_id]
    );

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(`/inclusion/${legajo.id}`, { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Legajo - ${legajo.alumno.apellido}`} />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Editar Legajo de Inclusión: {legajo.alumno.apellido}, {legajo.alumno.nombre}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        DNI: {legajo.alumno.dni}. Modificá las adaptaciones curriculares o actualizá el CUD.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                    {/* Diagnóstico */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">Diagnóstico Principal</label>
                        <input
                            type="text"
                            value={data.diagnostico}
                            onChange={(e) => setData('diagnostico', e.target.value)}
                            required
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        {errors.diagnostico && <p className="mt-1 text-xs text-red-500">{errors.diagnostico}</p>}
                    </div>

                    {/* Selector Buscable de Docente Pedagógico / Integrador */}
                    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium">
                                Docente Pedagógico / Integrador (Opcional)
                            </label>
                            <span className="text-xs text-muted-foreground">
                                {docentesFiltrados.length}{' '}
                                {docentesFiltrados.length === 1 ? 'docente registrado' : 'docentes registrados'}
                            </span>
                        </div>

                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={busquedaDocente}
                                onChange={(e) => setBusquedaDocente(e.target.value)}
                                placeholder="Buscar docente pedagógico por apellido, nombre, DNI o correo..."
                                className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm"
                            />
                            {busquedaDocente && (
                                <button
                                    type="button"
                                    onClick={() => setBusquedaDocente('')}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {docenteSeleccionado ? (
                            <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-sm">
                                <div className="flex items-center gap-2.5">
                                    <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <span className="font-semibold">
                                            {docenteSeleccionado.apellido}, {docenteSeleccionado.name}
                                        </span>{' '}
                                        <span className="font-mono text-xs text-muted-foreground">
                                            (DNI: {docenteSeleccionado.dni})
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                                            <Mail className="h-3 w-3" />
                                            {docenteSeleccionado.email}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setData('docente_integrador_id', '')}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                    Quitar
                                </button>
                            </div>
                        ) : (
                            legajo.docente_integrador && (
                                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                                    Asignación anterior sin vincular a usuario:{' '}
                                    <strong>{legajo.docente_integrador}</strong>{' '}
                                    {legajo.docente_integrador_email ? `(${legajo.docente_integrador_email})` : ''}.
                                    Seleccioná un docente de la lista para vincularlo.
                                </div>
                            )
                        )}

                        <div className="max-h-40 divide-y overflow-y-auto rounded-md border bg-background">
                            {docentesFiltrados.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                    No se encontraron usuarios con rol Docente Pedagógico.
                                </div>
                            ) : (
                                docentesFiltrados.map((doc) => {
                                    const seleccionado = String(data.docente_integrador_id) === String(doc.id);
                                    return (
                                        <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => setData('docente_integrador_id', String(doc.id))}
                                            className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition ${
                                                seleccionado ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {doc.apellido}, {doc.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    DNI: {doc.dni} · {doc.email}
                                                </div>
                                            </div>
                                            {seleccionado && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {errors.docente_integrador_id && (
                            <p className="mt-1 text-xs text-red-500">{errors.docente_integrador_id}</p>
                        )}

                        {docenteSeleccionado && (
                            <label className="flex items-center gap-2 pt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <input
                                    type="checkbox"
                                    checked={data.enviar_correo}
                                    onChange={(e) => setData('enviar_correo', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Mail className="h-3.5 w-3.5" />
                                Notificar estos cambios por correo a <strong>{docenteSeleccionado.email}</strong> (con el
                                CUD adjunto si posee)
                            </label>
                        )}
                    </div>

                    {/* Sección CUD */}
                    <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4">
                        <label className="flex items-center gap-2 text-sm font-semibold">
                            <input
                                type="checkbox"
                                checked={data.posee_cud}
                                onChange={(e) => setData('posee_cud', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            El alumno posee Certificado Único de Discapacidad (CUD)
                        </label>

                        {data.posee_cud && (
                            <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Fecha de Vencimiento CUD</label>
                                    <input
                                        type="date"
                                        value={data.vencimiento_cud}
                                        onChange={(e) => setData('vencimiento_cud', e.target.value)}
                                        required
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    {errors.vencimiento_cud && (
                                        <p className="mt-1 text-xs text-red-500">{errors.vencimiento_cud}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Actualizar Documento (Opcional)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {legajo.archivo_url && (
                                            <a
                                                href={legajo.archivo_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="shrink-0 text-xs text-blue-600 underline"
                                            >
                                                Ver actual
                                            </a>
                                        )}
                                        <input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={(e) =>
                                                setData('archivo_cud', e.target.files ? e.target.files[0] : null)
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                        />
                                    </div>
                                    {errors.archivo_cud && (
                                        <p className="mt-1 text-xs text-red-500">{errors.archivo_cud}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Observaciones PPI */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Observaciones / Proyecto Pedagógico Individual (PPI)
                        </label>
                        <textarea
                            value={data.observaciones_ppi}
                            onChange={(e) => setData('observaciones_ppi', e.target.value)}
                            rows={4}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Link href="/inclusion" className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing ? 'Actualizando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}