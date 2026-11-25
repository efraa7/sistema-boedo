export interface User {
    id: number;
    dni: string | null;
    apellido: string | null;
    name: string;
    email: string;
    telefono: string | null;
    foto: string | null;
    foto_url: string | null;
    estado: boolean;
    email_verified_at?: string;
    roles?: { id: number; name: string }[];
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
        roles: string[];
        permissions: string[];
    };
    flash: {
        success?: string;
        error?: string;
    };
};