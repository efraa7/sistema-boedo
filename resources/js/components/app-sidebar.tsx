import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    Award,
    BarChart3,
    BookOpen,
    CalendarDays,
    ClipboardList,
    GraduationCap,
    HeartHandshake,
    Milk,
    UserCog,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

const moduleNavItems: NavItem[] = [
    {
        title: 'Personal Escolar',
        href: '/usuarios',
        icon: UserCog,
        permission: 'listar usuarios',
    },
    {
        title: 'Ciclos Lectivos',
        href: '/ciclos-lectivos',
        icon: CalendarDays,
        permission: 'listar ciclos',
    },
    {
        title: 'Grados',
        href: '/grados',
        icon: GraduationCap,
        permission: 'listar grados',
    },
    {
        title: 'Materias',
        href: '/materias',
        icon: BookOpen,
        permission: 'listar materias',
    },
    {
        title: 'Alumnos',
        href: '/alumnos',
        icon: Users,
        permission: 'listar alumnos',
    },
    {
        title: 'Inclusión Escolar',
        href: '/inclusion',
        icon: HeartHandshake,
        permission: 'listar inclusion',
    },
    {
        title: 'Cuaderno Auxiliar',
        href: '/cuadernos',
        icon: ClipboardList,
        permission: 'listar cuadernos',
    },
    {
        title: 'Copa de Leche',
        href: '/copa-leche',
        icon: Milk,
        permission: 'listar copa leche',
    },
    {
        title: 'Cuadro de Honor',
        href: '/cuadro-honor',
        icon: Award,
        permission: 'ver cuadro honor',
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const auth = useAuth() as {
        can?: (permission: string) => boolean;
        hasRole?: (role: string) => boolean;
        roles?: string[];
        user?: { roles?: Array<string | { name: string }> };
    };

    const tieneRolDirectivo = (): boolean => {
        if (typeof auth.hasRole === 'function') {
            return auth.hasRole('director') || auth.hasRole('super-admin');
        }

        const listaRoles = auth.roles ?? auth.user?.roles ?? [];
        return listaRoles.some((r) => {
            const nombre = typeof r === 'string' ? r : r?.name;
            return nombre === 'director' || nombre === 'super-admin';
        });
    };

    const esDirectorOSuperAdmin = tieneRolDirectivo();

    const estadisticasItem: NavItem[] = esDirectorOSuperAdmin
        ? [
              {
                  title: 'Estadísticas',
                  href: '/estadisticas',
                  icon: BarChart3,
              },
          ]
        : [];

    const modulosVisibles = moduleNavItems.filter(
        (item) => !item.permission || (typeof auth.can === 'function' && auth.can(item.permission)),
    );

    const visibleNavItems: NavItem[] = [...estadisticasItem, ...modulosVisibles];

    return (
        <Sidebar collapsible="none" className="min-h-svh shrink-0 border-r border-sidebar-border">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={esDirectorOSuperAdmin ? '/estadisticas' : '/dashboard'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}