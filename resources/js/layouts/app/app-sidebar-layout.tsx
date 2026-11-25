import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import type { AppLayoutProps } from '@/types';
import { createContext, useContext } from 'react';

const NestedSidebarContext = createContext(false);

export default function AppSidebarLayout({ children }: AppLayoutProps) {
    const isAlreadyInsideLayout = useContext(NestedSidebarContext);

    if (isAlreadyInsideLayout) {
        return <>{children}</>;
    }

    return (
        <NestedSidebarContext.Provider value={true}>
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                    {children}
                </AppContent>
            </AppShell>
        </NestedSidebarContext.Provider>
    );
}