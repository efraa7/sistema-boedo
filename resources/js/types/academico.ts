export interface CicloLectivo {
    id: number;
    anio: number;
    fecha_inicio: string;
    fecha_fin: string;
    cerrado: boolean;
}

export interface DocenteResumen {
    id: number;
    dni: string | null;
    apellido: string | null;
    name: string;
}

export interface Materia {
    id: number;
    codigo: string;
    nombre: string;
    es_especial: boolean;
    estado: boolean;
    grados_count?: number;
}

export interface Grado {
    id: number;
    ciclo_lectivo_id: number;
    docente_titular_id: number | null;
    numero: number;
    division: string;
    turno: 'Mañana' | 'Tarde';
    aula: string | null;
    estado: boolean;
    nombre_completo: string;
    ciclo_lectivo?: CicloLectivo;
    docente_titular?: DocenteResumen | null;
    materias?: Materia[];
    matriculas_count?: number;
}

export interface Matricula {
    id: number;
    alumno_id: number;
    grado_id: number;
    ciclo_lectivo_id: number;
    promedio_final: string | number | null;
    dictamen_3er_trimestre: string;
    distincion_honor: string | null;
    grado?: Grado;
    ciclo_lectivo?: CicloLectivo;
}

export interface Alumno {
    id: number;
    dni: string;
    legajo: string;
    apellido: string;
    nombre: string;
    nombre_completo: string;
    fecha_nacimiento: string;
    domicilio: string | null;
    tutor_nombre: string;
    tutor_telefono: string;
    tutor_email: string | null;
    foto: string | null;
    foto_url: string | null;
    recibe_copa_leche: boolean;
    estado: boolean;
    matricula_actual?: Matricula | null;
    matriculas?: Matricula[];
}