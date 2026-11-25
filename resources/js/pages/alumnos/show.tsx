import AppLayout from '@/layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { type BreadcrumbItem } from '@/types';
import { type Alumno } from '@/types/academico';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Award, Calendar, Edit, GraduationCap, MapPin, Phone, User } from 'lucide-react';

interface Props {
    alumno: Alumno;
}

export default function AlumnoShow({ alumno }: Props) {
    const { can } = useAuth();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Padrón de Alumnos', href: '/alumnos' },
        { title: alumno.nombre_completo, href: `/alumnos/${alumno.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Legajo: ${alumno.nombre_completo}`} />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
                {/* Barra Superior */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/alumnos"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al padrón
                    </Link>

                    {can('editar alumnos') && (
                        <Link
                            href={`/alumnos/${alumno.id}/edit`}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                        >
                            <Edit className="h-4 w-4" />
                            Editar Legajo
                        </Link>
                    )}
                </div>

                {/* Tarjeta Principal del Alumno */}
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-6 text-center shadow-sm">
                        {alumno.foto_url ? (
                            <img
                                src={alumno.foto_url}
                                alt={alumno.nombre_completo}
                                className="mb-4 h-28 w-28 rounded-full object-cover border-2 border-primary/20"
                            />
                        ) : (
                            <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                                {alumno.apellido.charAt(0)}
                                {alumno.nombre.charAt(0)}
                            </div>
                        )}
                        <h1 className="text-xl font-bold">{alumno.nombre_completo}</h1>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">Legajo: {alumno.legajo}</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <span
                                className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                                    alumno.estado
                                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                                        : 'bg-gray-500/15 text-gray-600'
                                }`}
                            >
                                {alumno.estado ? 'Alumno Regular' : 'Inactivo / Pase'}
                            </span>
                            {alumno.recibe_copa_leche && (
                                <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                    Copa de Leche
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Datos Personales y Familiares */}
                    <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm md:col-span-2">
                        <div>
                            <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                                Información Filial
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        <strong>DNI:</strong> {alumno.dni}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        <strong>Fecha de Nacimiento:</strong> {alumno.fecha_nacimiento}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 sm:col-span-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        <strong>Domicilio:</strong> {alumno.domicilio || 'No especificado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                                Tutor Responsable
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 text-sm">
                                <div>
                                    <strong>Nombre:</strong> {alumno.tutor_nombre}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        <strong>Teléfono:</strong> {alumno.tutor_telefono}
                                    </span>
                                </div>
                                <div className="sm:col-span-2">
                                    <strong>Correo Electrónico:</strong> {alumno.tutor_email || 'No registrado'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Historial de Matriculaciones Anuales */}
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">Trayectoria Escolar y Matrículas</h2>
                    </div>

                    <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Ciclo Lectivo</th>
                                    <th className="px-4 py-3">Grado y Turno</th>
                                    <th className="px-4 py-3">Docente Titular</th>
                                    <th className="px-4 py-3 text-center">Promedio Final</th>
                                    <th className="px-4 py-3">Dictamen 3.° Trimestre</th>
                                    <th className="px-4 py-3">Distinción de Honor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {!alumno.matriculas || alumno.matriculas.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                            El alumno aún no registra matriculaciones en ningún ciclo lectivo.
                                        </td>
                                    </tr>
                                ) : (
                                    alumno.matriculas.map((mat) => (
                                        <tr key={mat.id}>
                                            <td className="px-4 py-3 font-semibold">{mat.ciclo_lectivo?.anio}</td>
                                            <td className="px-4 py-3">{mat.grado?.nombre_completo}</td>
                                            <td className="px-4 py-3">
                                                {mat.grado?.docente_titular
                                                    ? `${mat.grado.docente_titular.apellido}, ${mat.grado.docente_titular.name}`
                                                    : 'Sin asignar'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold">
                                                {mat.promedio_final ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    {mat.dictamen_3er_trimestre}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {mat.distincion_honor ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                        <Award className="h-3.5 w-3.5" />
                                                        {mat.distincion_honor}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}