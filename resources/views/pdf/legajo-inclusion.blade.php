<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $tituloDocumento }}</title>
    <style>
        @page {
            margin: 1.4cm 1.5cm;
        }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1e293b;
            line-height: 1.4;
        }
        .header {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header-escuela {
            font-size: 12px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
        }
        .header-sub {
            font-size: 9px;
            color: #475569;
        }
        .doc-title {
            background-color: #1e3a8a;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            padding: 6px 8px;
            margin-bottom: 12px;
            letter-spacing: 0.3px;
        }
        .ficha-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .ficha-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            vertical-align: top;
        }
        .ficha-label {
            font-weight: bold;
            background-color: #f1f5f9;
            width: 22%;
            color: #0f172a;
        }
        .section-box {
            border: 1px solid #cbd5e1;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        .section-header {
            background-color: #e2e8f0;
            font-weight: bold;
            padding: 5px 8px;
            font-size: 10px;
            color: #0f172a;
            border-bottom: 1px solid #cbd5e1;
        }
        .section-body {
            padding: 8px;
            min-height: 36px;
            white-space: pre-line;
        }
        .grid-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .grid-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: bold;
            padding: 6px;
            border: 1px solid #cbd5e1;
            font-size: 9px;
            text-align: left;
        }
        .grid-table td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            vertical-align: top;
            font-size: 9.5px;
        }
        .text-center {
            text-align: center;
        }
        .nota-badge {
            font-weight: bold;
            font-size: 11px;
        }
        .firmas-wrapper {
            margin-top: 22px;
            page-break-inside: avoid;
        }
        .firmas-titulo {
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            color: #1e3a8a;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 3px;
            margin-bottom: 10px;
        }
        .firmas-table {
            width: 100%;
            border-collapse: collapse;
        }
        .firmas-table td {
            width: 33.33%;
            padding: 8px 6px 4px 6px;
            vertical-align: bottom;
            text-align: center;
        }
        .firma-espacio {
            height: 48px;
            border-bottom: 1px dashed #475569;
            margin: 0 10px 4px 10px;
        }
        .firma-rol {
            font-weight: bold;
            font-size: 9px;
            color: #0f172a;
        }
        .firma-aclaracion {
            font-size: 8px;
            color: #64748b;
        }
        .footer-note {
            margin-top: 10px;
            font-size: 8px;
            color: #64748b;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-escuela">Escuela N° 129 "Dr. Mariano Boedo" — CUE 660030900</div>
        <div class="header-sub">Nivel Primario · Modalidad Educación Inclusiva (Resolución CFE N° 311/16) · Salta, Argentina</div>
    </div>

    <div class="doc-title">{{ $tituloDocumento }} — CICLO LECTIVO {{ $ciclo?->anio ?? date('Y') }}</div>

    <!-- Ficha Identificatoria del Estudiante -->
    <table class="ficha-table">
        <tr>
            <td class="ficha-label">Estudiante:</td>
            <td><strong>{{ $alumno->apellido }}, {{ $alumno->nombre }}</strong></td>
            <td class="ficha-label">DNI:</td>
            <td>{{ $alumno->dni }}</td>
        </tr>
        <tr>
            <td class="ficha-label">Grado y Sección:</td>
            <td>{{ $grado?->nombre_completo ?? 'Sin matricular en el ciclo' }}</td>
            <td class="ficha-label">CUD:</td>
            <td>
                @if($legajo->posee_cud)
                    Sí {{ $legajo->vencimiento_cud ? '(Vence: ' . $legajo->vencimiento_cud->format('d/m/Y') . ')' : '(Vigente)' }}
                @else
                    No posee
                @endif
            </td>
        </tr>
        <tr>
            <td class="ficha-label">Diagnóstico:</td>
            <td colspan="3">{{ $legajo->diagnostico }}</td>
        </tr>
        <tr>
            <td class="ficha-label">MAI / Doc. Apoyo:</td>
            <td>{{ $legajo->docente_integrador ?? 'No asignada' }}</td>
            <td class="ficha-label">Docente de Grado:</td>
            <td>
                @if($grado?->docenteTitular)
                    {{ $grado->docenteTitular->apellido }}, {{ $grado->docenteTitular->name }}
                @else
                    Sin asignar
                @endif
            </td>
        </tr>
        @if($informeInicial?->escuela_especial)
        <tr>
            <td class="ficha-label">Escuela Especial / Equipo:</td>
            <td colspan="3">{{ $informeInicial->escuela_especial }}</td>
        </tr>
        @endif
    </table>

    <!-- CONTENIDO SEGÚN TIPO DE INFORME -->
    @if($tipo === 'inicial')
        <div class="section-box">
            <div class="section-header">1. Vínculo, Adaptación y Autonomía en el Aula</div>
            <div class="section-body">{{ $informeInicial?->vinculo_adaptacion ?: 'Sin registros cargados.' }}</div>
        </div>

        <div class="section-box">
            <div class="section-header">2. Fortalezas y Estilo de Aprendizaje</div>
            <div class="section-body">{{ $informeInicial?->fortalezas_estilo ?: 'Sin registros cargados.' }}</div>
        </div>

        <div class="section-box">
            <div class="section-header">3. Saberes Previos y Punto de Partida</div>
            <div class="section-body">{{ $informeInicial?->saberes_previos ?: 'Sin registros cargados.' }}</div>
        </div>

    @elseif($tipo === 'ppi')
        <div class="section-box">
            <div class="section-header">1. Barreras Pedagógicas y del Contexto Detectadas</div>
            <div class="section-body">{{ $ppi?->barreras_contexto ?: 'Sin registros cargados.' }}</div>
        </div>

        <div class="section-box">
            <div class="section-header">2. Configuraciones de Apoyo y Acuerdos de Corresponsabilidad</div>
            <div class="section-body">{{ $ppi?->configuraciones_apoyo ?: 'Sin registros cargados.' }}</div>
        </div>

        @php
            $ppiMateriasMap = $ppi ? $ppi->materias->keyBy('materia_id') : collect();
        @endphp

        <table class="grid-table">
            <thead>
                <tr>
                    <th style="width: 24%;">Área / Materia</th>
                    <th style="width: 38%;">Contenidos y Objetivos Priorizados</th>
                    <th style="width: 38%;">Ajustes Razonables y Criterios de Evaluación</th>
                </tr>
            </thead>
            <tbody>
                @foreach($materias as $mat)
                    @php $item = $ppiMateriasMap->get($mat->id); @endphp
                    <tr>
                        <td><strong>{{ $mat->nombre }}</strong></td>
                        <td style="white-space: pre-line;">{{ $item?->contenidos_priorizados ?: '—' }}</td>
                        <td style="white-space: pre-line;">{{ $item?->ajustes_evaluacion ?: '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

    @else
        @php
            $notasMap = $informePeriodo ? $informePeriodo->materias->keyBy('materia_id') : collect();
            $notasNumericas = $informePeriodo
                ? $informePeriodo->materias->pluck('nota_numerica')->filter(fn ($n) => $n !== null)->map(fn ($n) => (float) $n)->values()
                : collect();
            $promedio = $notasNumericas->isNotEmpty() ? number_format($notasNumericas->avg(), 2) : '—';
        @endphp

        <table class="ficha-table">
            <tr>
                <td class="ficha-label">Inasistencias del Período:</td>
                <td><strong>{{ $informePeriodo?->inasistencias ?? 0 }}</strong></td>
                <td class="ficha-label">Promedio General (PPI):</td>
                <td><strong>{{ $promedio }}</strong></td>
            </tr>
        </table>

        <table class="grid-table">
            <thead>
                <tr>
                    <th style="width: 22%;">Área / Materia</th>
                    <th style="width: 10%; text-align: center;">Nota (1-10)</th>
                    <th style="width: 34%;">Contenidos Alcanzados (según PPI)</th>
                    <th style="width: 34%;">Dificultades Observadas / Sugerencias</th>
                </tr>
            </thead>
            <tbody>
                @foreach($materias as $mat)
                    @php $item = $notasMap->get($mat->id); @endphp
                    <tr>
                        <td><strong>{{ $mat->nombre }}</strong></td>
                        <td class="text-center">
                            <span class="nota-badge">
                                {{ $item && $item->nota_numerica !== null ? number_format((float) $item->nota_numerica, 1) : '-' }}
                            </span>
                        </td>
                        <td style="white-space: pre-line;">{{ $item?->contenidos_alcanzados ?: '—' }}</td>
                        <td style="white-space: pre-line;">{{ $item?->dificultades_sugerencias ?: '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="section-box">
            <div class="section-header">Síntesis Pedagógica del Período</div>
            <div class="section-body">{{ $informePeriodo?->sintesis_periodo ?: 'Sin síntesis registrada.' }}</div>
        </div>
    @endif

    <!-- BLOQUE DE FIRMAS Y AVALES INSTITUCIONALES -->
    <div class="firmas-wrapper">
        <div class="firmas-titulo">Notificación, Conformidad y Avales Institucionales</div>
        <table class="firmas-table">
            <tr>
                <td>
                    <div class="firma-espacio"></div>
                    <div class="firma-rol">MAI / Docente Pedagógico</div>
                    <div class="firma-aclaracion">Firma y Sello</div>
                </td>
                <td>
                    <div class="firma-espacio"></div>
                    <div class="firma-rol">Docente de Grado</div>
                    <div class="firma-aclaracion">Firma y Sello</div>
                </td>
                <td>
                    <div class="firma-espacio"></div>
                    <div class="firma-rol">Vicedirector/a</div>
                    <div class="firma-aclaracion">Firma y Sello</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="firma-espacio"></div>
                    <div class="firma-rol">Director/a</div>
                    <div class="firma-aclaracion">Firma y Sello</div>
                </td>
                <td>
                    <div class="firma-espacio"></div>
                    <div class="firma-rol">Directivo Escuela Especial</div>
                    <div class="firma-aclaracion">Firma y Sello (si corresponde)</div>
                </td>
                <td>
                    <div class="firma-espacio"></div>
                    <div class="firma-rol">Padre / Madre / Tutor</div>
                    <div class="firma-aclaracion">Firma, Aclaración y DNI</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="footer-note">
        Documento oficial para Legajo de Inclusión · Emitido el {{ now()->format('d/m/Y H:i') }}
    </div>
</body>
</html>