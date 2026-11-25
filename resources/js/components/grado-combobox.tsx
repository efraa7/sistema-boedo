import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface GradoComboboxOption {
    id: number;
    numero: number;
    division: string;
    turno: string;
    nombre_completo: string;
    badge?: string | number;
}

interface GradoComboboxProps {
    grados: GradoComboboxOption[];
    value: string | number;
    onChange: (value: string) => void;
    emptyLabel?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

export function GradoCombobox({
    grados,
    value,
    onChange,
    emptyLabel = 'Todos los grados',
    placeholder = 'Seleccionar grado...',
    disabled = false,
    className = '',
}: GradoComboboxProps) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const contenedorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const valorStr = value !== null && value !== undefined ? String(value) : '';
    const gradoSeleccionado = useMemo(
        () => grados.find((g) => String(g.id) === valorStr) ?? null,
        [grados, valorStr]
    );

    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };

        document.addEventListener('mousedown', handleClickFuera);
        return () => document.removeEventListener('mousedown', handleClickFuera);
    }, []);

    useEffect(() => {
        if (abierto) {
            setBusqueda('');
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [abierto]);

    const gradosFiltrados = useMemo(() => {
        let q = normalizar(busqueda)
            .replace(/\bgrados?\b/g, ' ')
            .replace(/\bturnos?\b/g, ' ')
            .replace(/[°º\-_\/\.]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!q) return grados;

        const ordinales: Record<string, string> = {
            primero: '1', primer: '1', '1ro': '1', '1er': '1',
            segundo: '2', '2do': '2',
            tercero: '3', tercer: '3', '3ro': '3', '3er': '3',
            cuarto: '4', '4to': '4',
            quinto: '5', '5to': '5',
            sexto: '6', '6to': '6',
            septimo: '7', '7mo': '7',
        };

        for (const [palabra, num] of Object.entries(ordinales)) {
            q = q.replace(new RegExp(`\\b${palabra}\\b`, 'g'), num);
        }

        let turnoFiltro: 'manana' | 'tarde' | null = null;
        if (/\bmanana\b/.test(q)) {
            turnoFiltro = 'manana';
            q = q.replace(/\bmanana\b/g, '').trim();
        } else if (/\btarde\b/.test(q)) {
            turnoFiltro = 'tarde';
            q = q.replace(/\btarde\b/g, '').trim();
        }

        return grados.filter((g) => {
            if (turnoFiltro && normalizar(g.turno) !== turnoFiltro) {
                return false;
            }

            if (!q) return true;

            const divNorm = normalizar(g.division);

            const matchNumDiv = q.match(/^([1-7])\s*([a-z0-9]+)$/);
            if (matchNumDiv) {
                return g.numero === Number(matchNumDiv[1]) && divNorm.startsWith(matchNumDiv[2]);
            }

            const matchSoloNum = q.match(/^([1-7])$/);
            if (matchSoloNum) {
                return g.numero === Number(matchSoloNum[1]);
            }

            if (/^[a-z]{1,3}$/.test(q)) {
                return divNorm === q || divNorm.startsWith(q);
            }

            return normalizar(g.nombre_completo).includes(q);
        });
    }, [grados, busqueda]);

    const seleccionar = (nuevoValor: string) => {
        onChange(nuevoValor);
        setAbierto(false);
    };

    return (
        <div ref={contenedorRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setAbierto((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs transition hover:bg-muted/30 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className={gradoSeleccionado ? 'truncate font-medium text-foreground' : 'truncate text-muted-foreground'}>
                    {gradoSeleccionado
                        ? gradoSeleccionado.badge !== undefined
                            ? `${gradoSeleccionado.nombre_completo} (${gradoSeleccionado.badge})`
                            : gradoSeleccionado.nombre_completo
                        : emptyLabel || placeholder}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                    {gradoSeleccionado && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            title="Quitar selección"
                            onClick={(e) => {
                                e.stopPropagation();
                                seleccionar('');
                            }}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
            </button>

            {abierto && !disabled && (
                <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[270px] rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg">
                    <div className="relative mb-1.5">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setAbierto(false);
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (gradosFiltrados.length === 1) {
                                        seleccionar(String(gradosFiltrados[0].id));
                                    }
                                }
                            }}
                            placeholder="Filtrar (ej: 5, 5a, a, tarde)..."
                            className="w-full rounded-md border border-input bg-background py-1.5 pr-7 pl-8 text-xs focus:border-primary focus:outline-none"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => seleccionar('')}
                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                                valorStr === ''
                                    ? 'bg-primary/10 font-semibold text-primary'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <span>{emptyLabel}</span>
                            {valorStr === '' && <Check className="h-3.5 w-3.5" />}
                        </button>

                        {gradosFiltrados.length === 0 ? (
                            <div className="px-2.5 py-4 text-center text-xs text-muted-foreground">
                                No hay grados que coincidan con "{busqueda}".
                            </div>
                        ) : (
                            gradosFiltrados.map((g) => {
                                const seleccionado = String(g.id) === valorStr;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => seleccionar(String(g.id))}
                                        className={`mt-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                                            seleccionado
                                                ? 'bg-primary font-medium text-primary-foreground'
                                                : 'hover:bg-muted'
                                        }`}
                                    >
                                        <span>{g.nombre_completo}</span>
                                        <div className="flex items-center gap-1.5">
                                            {g.badge !== undefined && (
                                                <span
                                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                                        seleccionado
                                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {g.badge}
                                                </span>
                                            )}
                                            {seleccionado && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}