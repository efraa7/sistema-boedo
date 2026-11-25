import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Coffee,
    FileSpreadsheet,
    GraduationCap,
    Search,
    Users,
    X,
} from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

interface AlumnoGradoItem {
    id: number;
    matricula_id: number;
    legajo: string;
    apellido: string;
    nombre: string;
    dni: string;
    fecha_nacimiento: string;
    tutor_nombre: string;
    tutor_telefono: string;
    recibe_copa_leche: boolean;
    estado: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedAlumnos {
    data: AlumnoGradoItem[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
}

interface GradoAlumnosInfo {
    id: number;
    nombre_completo: string;
    numero: number;
    division: string;
    turno: string;
    aula: string | null;
    ciclo_anio: number | null;
    docente_titular: string | null;
}

interface Props {
    grado: GradoAlumnosInfo;
    alumnos: PaginatedAlumnos;
    totalMatriculados: number;
    filtros: {
        buscar?: string;
    };
}

export default function GradoAlumnos({ grado, alumnos, totalMatriculados, filtros }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Grados y Secciones', href: '/grados' },
        { title: `Alumnos: ${grado.numero}.° ${grado.division}`, href: `/grados/${grado.id}/alumnos` },
    ];

    const [buscar, setBuscar] = useState(filtros?.buscar ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navegarBusqueda = (valor: string) => {
        const params: Record<string, string> = {};
        if (valor.trim()) {
            params.buscar = valor.trim();
        }

        router.get(`/grados/${grado.id}/alumnos`, params, {
            preserveState: true,
            replace: true,
        });
    };

    const handleBuscarChange = (valor: string) => {
        setBuscar(valor);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            navegarBusqueda(valor);
        }, 300);
    };

    const handleBuscarSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        navegarBusqueda(buscar);
    };

    const limpiarBusqueda = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        setBuscar('');
        navegarBusqueda('');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Alumnos - ${grado.nombre_completo}`} />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight">{grado.nombre_completo}</h1>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Ciclo Lectivo {grado.ciclo_anio ?? '—'} · Docente Titular:{' '}
                            <span className="font-medium text-foreground">
                                {grado.docente_titular || 'Sin asignar'}
                            </span>
                            {grado.aula ? ` · Aula: ${grado.aula}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={`/grados/exportar-excel?grados[]=${grado.id}`}
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Descargar Nómina Excel
                        </a>

                        <Link
                            href="/grados"
                            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver a Grados
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <form onSubmit={handleBuscarSubmit} className="relative w-full max-w-md">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={buscar}
                            onChange={(e) => handleBuscarChange(e.target.value)}
                            placeholder="Filtrar alumno por apellido, nombre, DNI, legajo o tutor..."
                            className="w-full rounded-md border bg-background py-2 pr-8 pl-9 text-sm shadow-xs focus:border-primary focus:outline-none"
                        />
                        {buscar && (
                            <button
                                type="button"
                                onClick={limpiarBusqueda}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                title="Limpiar búsqueda"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </form>

                    <div className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        {filtros?.buscar ? (
                            <span>
                                <strong className="text-foreground">{alumnos.total}</strong> coincidencias de{' '}
                                <strong className="text-foreground">{totalMatriculados}</strong> matriculados
                            </span>
                        ) : (
                            <span>
                                Total: <strong className="text-foreground">{totalMatriculados}</strong> alumnos matriculados
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 text-center">#</th>
                                <th className="px-4 py-3">Legajo</th>
                                <th className="px-4 py-3">Apellido y Nombre</th>
                                <th className="px-4 py-3">DNI</th>
                                <th className="px-4 py-3">Fecha Nac.</th>
                                <th className="px-4 py-3">Tutor / Teléfono</th>
                                <th className="px-4 py-3 text-center">Copa de Leche</th>
                                <th className="px-4 py-3 text-center">Condición</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {alumnos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                        {totalMatriculados === 0
                                            ? 'Este grado aún no tiene alumnos matriculados.'
                                            : 'Ningún alumno coincide con el filtro ingresado.'}
                                    </td>
                                </tr>
                            ) : (
                                alumnos.data.map((al, index) => (
                                    <tr key={al.matricula_id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                                            {(alumnos.from ?? 1) + index}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{al.legajo}</td>
                                        <td className="px-4 py-3 font-semibold">
                                            {al.apellido}, {al.nombre}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{al.dni}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {al.fecha_nacimiento}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-medium">{al.tutor_nombre}</div>
                                            <div className="font-mono text-[11px] text-muted-foreground">
                                                {al.tutor_telefono}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {al.recibe_copa_leche ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    <Coffee className="h-3 w-3" /> Sí
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {al.estado ? (
                                                <span className="inline-flex rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                                    Regular
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                                                    Inactivo / Pase
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {alumnos.last_page > 1 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                            <div>
                                Mostrando <span className="font-semibold text-foreground">{alumnos.from ?? 0}</span> a{' '}
                                <span className="font-semibold text-foreground">{alumnos.to ?? 0}</span> de{' '}
                                <span className="font-semibold text-foreground">{alumnos.total}</span> alumnos
                            </div>
                            <div className="flex items-center gap-1">
                                {alumnos.links.map((link, idx) => {
                                    const esAnterior = link.label.includes('Previous');
                                    const esSiguiente = link.label.includes('Next');
                                    const texto = esAnterior ? (
                                        <ChevronLeft className="h-4 w-4" />
                                    ) : esSiguiente ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        link.label
                                    );

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 opacity-40"
                                            >
                                                {texto}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveState
                                            preserveScroll
                                            replace
                                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-medium transition ${
                                                link.active
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {texto}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}