@extends('emails.layout')

@section('header_title')
    {{ $esActualizacion ? 'Actualización de Legajo PPI' : 'Asignación de Seguimiento PPI' }}
@endsection

@section('content')
    <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px; color: #111827;">
        Estimad@ <strong>{{ $legajo->docente_integrador ?: 'Docente Pedagógico / Integrador' }}</strong>,
    </p>

    <p style="margin-top: 0; margin-bottom: 24px; color: #4b5563;">
        @if($esActualizacion)
            Le informamos que se han actualizado los datos y/o documentación del Proyecto Pedagógico Individual (PPI) correspondiente al siguiente estudiante:
        @else
            Le informamos que se ha registrado un nuevo estudiante en nuestro sistema de <strong>Inclusión Escolar</strong> asignado a su seguimiento pedagógico:
        @endif
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
        <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Estudiante</p>
                <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">
                    {{ $alumno->apellido }}, {{ $alumno->nombre }}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">
                    DNI: <strong>{{ $alumno->dni }}</strong> &nbsp;|&nbsp; Legajo: <strong>{{ $alumno->legajo }}</strong>
                </p>
            </td>
        </tr>

        <tr>
            <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Curso y Docente de Aula</p>
                <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 500;">
                    {{ $datosCurso['grado'] ?? 'Sin matricular en el ciclo activo' }}
                </p>
                @if(!empty($datosCurso['docente_aula']))
                    <p style="margin: 3px 0 0 0; font-size: 13px; color: #475569;">
                        Docente Titular de Grado: {{ $datosCurso['docente_aula'] }}
                    </p>
                @endif
            </td>
        </tr>

        <tr>
            <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Diagnóstico Principal</p>
                <p style="margin: 0; font-size: 15px; color: #1e3a8a; font-weight: 600;">
                    {{ $legajo->diagnostico }}
                </p>
            </td>
        </tr>

        <tr>
            <td style="padding: 14px 20px; {{ $legajo->observaciones_ppi ? 'border-bottom: 1px solid #e2e8f0;' : '' }}">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Certificado Único de Discapacidad (CUD)</p>
                @if($legajo->posee_cud)
                    <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: 600;">
                        Posee CUD
                        @if($legajo->vencimiento_cud)
                            &mdash; Vencimiento: {{ \Carbon\Carbon::parse($legajo->vencimiento_cud)->format('d/m/Y') }}
                        @endif
                    </p>
                    @if($legajo->archivo_cud)
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">
                            <em>Se adjunta copia digital del certificado en este correo.</em>
                        </p>
                    @endif
                @else
                    <p style="margin: 0; font-size: 14px; color: #64748b;">
                        No posee CUD registrado actualmente.
                    </p>
                @endif
            </td>
        </tr>

        @if($legajo->observaciones_ppi)
            <tr>
                <td style="padding: 14px 20px;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Observaciones / Adaptaciones PPI</p>
                    <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-line;">{{ $legajo->observaciones_ppi }}</p>
                </td>
            </tr>
        @endif
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
        <tr>
            <td style="padding: 14px 16px;">
                <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.5;">
                    <strong>Nota del Gabinete:</strong> Ante cualquier consulta sobre la trayectoria escolar o coordinación de reuniones con la familia y docentes de aula, comuníquese con la Secretaría de la institución.
                </p>
            </td>
        </tr>
    </table>
@endsection