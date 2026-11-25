import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { type BreadcrumbItem } from '@/types';
import { type Grado } from '@/types/academico';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CheckSquare,
    Download,
    Edit,
    FileSpreadsheet,
    GraduationCap,
    Lock,
    Plus,
    Search,
    Square,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedGrados {
    data: Grado[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface CicloOption {
    id: number;
    anio: number;
    cerrado: boolean;
}

interface GradoDisponible {
    id: number;
    ciclo_lectivo_id: number;
    numero: number;
    division: string;
    turno: 'Mañana' | 'Tarde';
    nombre_completo: string;
    matriculas_count: number;
}

interface Props {
    grados: PaginatedGrados;
    gradosDisponibles: GradoDisponible[];
    ciclos: CicloOption[];
    cicloSeleccionado: CicloOption | null;
    cicloSeleccionadoCerrado: boolean;
    puedeEditarDatosGrado: boolean;
    esDocente: boolean;
    filtros: {
        ciclo_id: string;
        numero: string;
        turno: string;
        buscar: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Grados y Secciones', href: '/grados' },
];

export default function GradosIndex({
    grados,
    gradosDisponibles,
    ciclos,
    cicloSeleccionado,
    cicloSeleccionadoCerrado,
    puedeEditarDatosGrado,
    esDocente,
    filtros,
}: Props) {
    const { can } = useAuth();
    const { flash } = usePage().props as any;
    const [buscar, setBuscar] = useState(filtros.buscar || '');

    const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
    const [filtroModal, setFiltroModal] = useState('');
    const [seleccionados, setSeleccionados] = useState<number[]>([]);

    const aplicarFiltros = (
        nuevoCicloId: string,
        nuevoNumero: string,
        nuevoTurno: string,
        nuevoBuscar: string
    ) => {
        const params: Record<string, string> = {};
        if (nuevoCicloId) params.ciclo_id = nuevoCicloId;
        if (nuevoNumero) params.numero = nuevoNumero;
        if (nuevoTurno) params.turno = nuevoTurno;
        if (nuevoBuscar.trim()) params.buscar = nuevoBuscar.trim();

        router.get('/grados', params, { preserveState: true, replace: true });
    };

    const handleCicloChange = (cicloId: string) => {
        aplicarFiltros(cicloId, filtros.numero, filtros.turno, buscar);
    };

    const handleNumeroChange = (numero: string) => {
        aplicarFiltros(filtros.ciclo_id, numero, filtros.turno, buscar);
    };

    const handleTurnoChange = (turno: string) => {
        aplicarFiltros(filtros.ciclo_id, filtros.numero, turno, buscar);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        aplicarFiltros(filtros.ciclo_id, filtros.numero, filtros.turno, buscar);
    };

    const handleLimpiarBusqueda = () => {
        setBuscar('');
        aplicarFiltros(filtros.ciclo_id, filtros.numero, filtros.turno, '');
    };

    const handleDelete = (grado: Grado) => {
        if (confirm(`¿Estás seguro de eliminar "${grado.nombre_completo}"?`)) {
            router.delete(`/grados/${grado.id}`);
        }
    };

    const gradosFiltradosModal = useMemo(() => {
        const q = filtroModal
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/grados?/g, '')
            .replace(/[°º\-_\/\.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!q) return gradosDisponibles;

        const ordinales: Record<string, string> = {
            primero: '1', primer: '1', '1ro': '1', '1er': '1',
            segundo: '2', '2do': '2',
            tercero: '3', tercer: '3', '3ro': '3', '3er': '3',
            cuarto: '4', '4to': '4',
            quinto: '5', '5to': '5',
            sexto: '6', '6to': '6',
            septimo: '7', '7mo': '7',
        };

        let normalizado = q;
        for (const [palabra, num] of Object.entries(ordinales)) {
            normalizado = normalizado.replace(new RegExp(`\\b${palabra}\\b`, 'g'), num);
        }

        return gradosDisponibles.filter((g) => {
            const turnoNorm = g.turno.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const etiquetaCompacta = `${g.numero}${g.division.toLowerCase()}`;
            const etiquetaEspaciada = `${g.numero} ${g.division.toLowerCase()} ${turnoNorm}`;

            return (
                etiquetaCompacta.includes(normalizado.replace(/\s+/g, '')) ||
                etiquetaEspaciada.includes(normalizado) ||
                g.nombre_completo.toLowerCase().includes(q)
            );
        });
    }, [gradosDisponibles, filtroModal]);

    const abrirModalExportar = () => {
        setFiltroModal('');
        setSeleccionados(gradosDisponibles.map((g) => g.id));
        setModalExportarAbierto(true);
    };

    const toggleGradoSeleccionado = (id: number) => {
        setSeleccionados((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const seleccionarTodosFiltrados = () => {
        const idsVisibles = gradosFiltradosModal.map((g) => g.id);
        setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])));
    };

    const deseleccionarTodos = () => {
        setSeleccionados([]);
    };

    const seleccionarPorNumero = (numero: number) => {
        const ids = gradosDisponibles.filter((g) => g.numero === numero).map((g) => g.id);
        setSeleccionados(ids);
    };

    const seleccionarPorTurno = (turno: 'Mañana' | 'Tarde') => {
        const ids = gradosDisponibles.filter((g) => g.turno === turno).map((g) => g.id);
        setSeleccionados(ids);
    };

    const descargarSeleccionados = () => {
        if (seleccionados.length === 0) return;

        const params = new URLSearchParams();
        seleccionados.forEach((id) => params.append('grados[]', String(id)));

        window.location.href = `/grados/exportar-excel?${params.toString()}`;
        setModalExportarAbierto(false);
    };

    const numerosExistentes = useMemo(
        () => Array.from(new Set(gradosDisponibles.map((g) => g.numero))).sort((a, b) => a - b),
        [gradosDisponibles]
    );

    const mostrarFiltrosAvanzados = !esDocente || gradosDisponibles.length > 1;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={esDocente ? 'Mi Grado' : 'Grados y Secciones'} />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {esDocente ? 'Mi Grado y Sección' : 'Grados y Secciones'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {esDocente
                                ? 'Consulta de tu grado asignado, nómina de alumnos matriculados y áreas curriculares.'
                                : 'Organización de aulas, docentes titulares y carga curricular por ciclo lectivo.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {gradosDisponibles.length > 0 && (
                            <button
                                type="button"
                                onClick={abrirModalExportar}
                                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-muted"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                {esDocente ? 'Exportar Nómina' : 'Exportar Nóminas'}
                            </button>
                        )}

                        {can('crear grados') && !cicloSeleccionadoCerrado && (
                            <Link
                                href="/grados/create"
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo Grado
                            </Link>
                        )}
                    </div>
                </div>

                {flash?.success && (
                    <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
                        {flash.error}
                    </div>
                )}

                {cicloSeleccionadoCerrado && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>
                            Estás consultando un <strong>ciclo lectivo cerrado</strong>. Los registros históricos son de
                            solo lectura y no pueden modificarse.
                        </span>
                    </div>
                )}

                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    {mostrarFiltrosAvanzados ? (
                        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-md items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={buscar}
                                    onChange={(e) => setBuscar(e.target.value)}
                                    placeholder="Buscar división o aula (ej: A, B, Aula 4)..."
                                    className="w-full rounded-md border bg-background py-1.5 pr-8 pl-9 text-sm shadow-xs focus:border-primary focus:outline-none"
                                />
                                {buscar && (
                                    <button
                                        type="button"
                                        onClick={handleLimpiarBusqueda}
                                        title="Limpiar búsqueda"
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
                            >
                                Filtrar
                            </button>
                        </form>
                    ) : (
                        <div />
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        {mostrarFiltrosAvanzados && (
                            <div className="flex items-center gap-2">
                                <label htmlFor="filtro-numero" className="text-sm font-medium text-muted-foreground">
                                    Grado:
                                </label>
                                <select
                                    id="filtro-numero"
                                    value={filtros.numero}
                                    onChange={(e) => handleNumeroChange(e.target.value)}
                                    className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-none"
                                >
                                    <option value="">Todos (1.° a 7.°)</option>
                                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                        <option key={n} value={n}>
                                            {n}.° Grado
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <label htmlFor="filtro-ciclo" className="text-sm font-medium text-muted-foreground">
                                Ciclo:
                            </label>
                            <select
                                id="filtro-ciclo"
                                value={filtros.ciclo_id}
                                onChange={(e) => handleCicloChange(e.target.value)}
                                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-xs focus:border-primary focus:outline-none"
                            >
                                {ciclos.map((ciclo) => (
                                    <option key={ciclo.id} value={ciclo.id}>
                                        {ciclo.anio} {ciclo.cerrado ? '(Cerrado)' : '(Activo)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {mostrarFiltrosAvanzados && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-muted-foreground">Turno:</span>
                                {['', 'Mañana', 'Tarde'].map((t) => (
                                    <button
                                        key={t || 'todos'}
                                        type="button"
                                        onClick={() => handleTurnoChange(t)}
                                        className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                                            filtros.turno === t
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'bg-background hover:bg-muted'
                                        }`}
                                    >
                                        {t || 'Todos'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Grado y División</th>
                                <th className="px-4 py-3">Ciclo</th>
                                <th className="px-4 py-3">Docente Titular</th>
                                <th className="px-4 py-3">Aula</th>
                                <th className="px-4 py-3 text-center">Materias</th>
                                <th className="px-4 py-3 text-center">Matrícula</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {grados.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        {esDocente
                                            ? 'Aún no tenés un grado asignado como docente titular en este ciclo lectivo.'
                                            : 'No hay grados registrados con ese criterio.'}
                                    </td>
                                </tr>
                            ) : (
                                grados.data.map((grado) => {
                                    const estaCerrado = Boolean(grado.ciclo_lectivo?.cerrado ?? cicloSeleccionadoCerrado);

                                    return (
                                        <tr key={grado.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap className="h-4 w-4 text-primary" />
                                                    <span>{grado.nombre_completo}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{grado.ciclo_lectivo?.anio}</td>
                                            <td className="px-4 py-3">
                                                {grado.docente_titular ? (
                                                    <span className="font-medium">
                                                        {grado.docente_titular.apellido}, {grado.docente_titular.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs italic text-muted-foreground">
                                                        Sin asignar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{grado.aula || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className="inline-flex items-center rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                                                    title={grado.materias?.map((m) => m.nombre).join(', ')}
                                                >
                                                    {grado.materias?.length ?? 0} áreas
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {grado.matriculas_count ?? 0} alumnos
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/grados/${grado.id}/alumnos`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
                                                        title={`Listar alumnos de ${grado.nombre_completo}`}
                                                    >
                                                        <Users className="h-3.5 w-3.5" />
                                                        Alumnos
                                                    </Link>

                                                    <a
                                                        href={`/grados/exportar-excel?grados[]=${grado.id}`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                                        title={`Descargar nómina de ${grado.nombre_completo} en Excel`}
                                                    >
                                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                                        Excel
                                                    </a>

                                                    {estaCerrado ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                                                            <Lock className="h-3 w-3" />
                                                            Cerrado
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {can('editar grados') && (
                                                                <Link
                                                                    href={`/grados/${grado.id}/materias`}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-500/20 dark:text-purple-300"
                                                                    title="Editar materias asignadas al curso"
                                                                >
                                                                    <BookOpen className="h-3.5 w-3.5" />
                                                                    Materias
                                                                </Link>
                                                            )}

                                                            {puedeEditarDatosGrado && (
                                                                <Link
                                                                    href={`/grados/${grado.id}/edit`}
                                                                    className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                                    title="Editar datos principales del grado (Super Admin y Director)"
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                    Editar
                                                                </Link>
                                                            )}

                                                            {can('eliminar grados') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(grado)}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                                                    title="Eliminar grado"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {grados.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
                            <span className="text-xs text-muted-foreground">
                                Página {grados.current_page} de {grados.last_page} ({grados.total} grados en total)
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {grados.links.map((link, key) =>
                                    link.url ? (
                                        <Link
                                            key={key}
                                            href={link.url}
                                            preserveState
                                            replace
                                            className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                                                link.active
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'bg-background hover:bg-muted'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={key}
                                            className="rounded-md border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {modalExportarAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border bg-card p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <h2 className="text-lg font-bold">
                                        Exportar Nóminas a Excel{' '}
                                        {cicloSeleccionado ? `(Ciclo ${cicloSeleccionado.anio})` : ''}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Si elegís varios grados, se generará un único archivo con una pestaña por sección.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalExportarAbierto(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 overflow-hidden">
                            {gradosDisponibles.length > 1 && (
                                <>
                                    <div className="relative">
                                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={filtroModal}
                                            onChange={(e) => setFiltroModal(e.target.value)}
                                            placeholder="Filtrar grados (ej: 4 c, 4c, cuarto, mañana, tarde)..."
                                            className="w-full rounded-md border border-input bg-background py-2 pr-8 pl-9 text-sm focus:border-primary focus:outline-none"
                                            autoFocus
                                        />
                                        {filtroModal && (
                                            <button
                                                type="button"
                                                onClick={() => setFiltroModal('')}
                                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="mr-1 text-xs font-medium text-muted-foreground">
                                            Selección rápida:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={seleccionarTodosFiltrados}
                                            className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            Todos ({gradosFiltradosModal.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={deseleccionarTodos}
                                            className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                                        >
                                            Ninguno
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarPorTurno('Mañana')}
                                            className="rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                                        >
                                            Turno Mañana
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarPorTurno('Tarde')}
                                            className="rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                                        >
                                            Turno Tarde
                                        </button>
                                        {numerosExistentes.map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => seleccionarPorNumero(num)}
                                                className="rounded-md border bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
                                            >
                                                Todo {num}°
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                                {gradosFiltradosModal.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        Ningún grado coincide con "{filtroModal}".
                                    </div>
                                ) : (
                                    gradosFiltradosModal.map((g) => {
                                        const marcado = seleccionados.includes(g.id);
                                        return (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => toggleGradoSeleccionado(g.id)}
                                                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition ${
                                                    marcado ? 'bg-primary/5' : 'hover:bg-muted/40'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    {marcado ? (
                                                        <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                                                    ) : (
                                                        <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    )}
                                                    <span className="font-medium">{g.nombre_completo}</span>
                                                </div>
                                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                                                    {g.matriculas_count} alumnos
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                            <span className="text-xs text-muted-foreground">
                                <strong>{seleccionados.length}</strong>{' '}
                                {seleccionados.length === 1 ? 'sección seleccionada' : 'secciones seleccionadas'}
                            </span>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalExportarAbierto(false)}
                                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={seleccionados.length === 0}
                                    onClick={descargarSeleccionados}
                                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar Excel ({seleccionados.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}