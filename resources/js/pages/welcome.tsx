import { dashboard, login } from '@/routes';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    ClipboardList,
    GraduationCap,
    HeartHandshake,
    LogIn,
    Users,
} from 'lucide-react';

interface PageProps {
    [key: string]: unknown;
    auth: {
        user: {
            name: string;
            apellido?: string;
        } | null;
    };
}

export default function Welcome() {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title='Sistema de Gestión Escolar — Escuela "Dr. Mariano Boedo"' />
            <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
                {/* Barra superior */}
                <header className="border-b bg-white/80 backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900/80">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold leading-tight">
                                    Escuela N° 129 &ldquo;Dr. Mariano Boedo&rdquo;
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Sistema Integral de Gestión Escolar
                                </p>
                            </div>
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90"
                                >
                                    Ingresar al Sistema
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <Link
                                    href={login()}
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Iniciar Sesión
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Contenido central */}
                <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
                    <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                        <div className="space-y-5 lg:col-span-7">
                            <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
                                Plataforma Académica y Administrativa
                            </span>

                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Gestión Pedagógica y Seguimiento Estudiantil
                            </h1>

                            <p className="text-base leading-relaxed text-muted-foreground">
                                Espacio institucional para la administración de trayectorias escolares,
                                planillas trimestrales de calificación, legajos de inclusión educativa,
                                asistencia alimentaria y reportes académicos.
                            </p>

                            <div className="pt-2">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                                    >
                                        Continuar como {auth.user.name}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                                    >
                                        <LogIn className="h-4 w-4" />
                                        Acceder con cuenta institucional
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
                            <div className="rounded-xl border bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
                                <ClipboardList className="mb-2 h-5 w-5 text-blue-600" />
                                <h2 className="text-sm font-semibold">Cuaderno Auxiliar</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Carga de notas trimestrales, promedios y visado de Vicedirección.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
                                <HeartHandshake className="mb-2 h-5 w-5 text-rose-600" />
                                <h2 className="text-sm font-semibold">Inclusión Escolar</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Legajos CUD, Informe Inicial, PPI e informes trimestrales MAI.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
                                <Users className="mb-2 h-5 w-5 text-emerald-600" />
                                <h2 className="text-sm font-semibold">Padrón y Grados</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Matrícula por ciclo lectivo, secciones, docentes y nóminas Excel.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
                                <Award className="mb-2 h-5 w-5 text-amber-600" />
                                <h2 className="text-sm font-semibold">Cuadro de Honor</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Reconocimiento automático al mérito académico por grado y turno.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Pie de página */}
                <footer className="border-t bg-white py-4 text-center text-xs text-muted-foreground dark:border-neutral-800 dark:bg-neutral-900">
                    Escuela N° 129 &ldquo;Dr. Mariano Boedo&rdquo; — Gestión Escolar
                </footer>
            </div>
        </>
    );
}