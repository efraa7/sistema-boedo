<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Cuadro de Honor - Ciclo Lectivo {{ $ciclo->anio }}</title>
    <style>
        @page {
            margin: 14mm 14mm 16mm 14mm;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1e293b;
            margin: 0;
            padding: 0;
        }

        .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
            text-align: center;
        }

        .header h1 {
            font-size: 14px;
            margin: 0 0 3px 0;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .header h2 {
            font-size: 12px;
            margin: 0 0 4px 0;
            color: #b45309;
            text-transform: uppercase;
        }

        .header p {
            font-size: 9px;
            margin: 0;
            color: #475569;
        }

        .turno-banner {
            background-color: #0f172a;
            color: #ffffff;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 10px;
            border-radius: 3px;
        }

        .turno-banner.manana {
            background-color: #b45309;
        }

        .turno-banner.tarde {
            background-color: #1d4ed8;
        }

        .section-title {
            font-size: 10.5px;
            font-weight: bold;
            color: #0f172a;
            background-color: #f1f5f9;
            border-left: 4px solid #0f172a;
            padding: 4px 8px;
            margin: 10px 0 8px 0;
            text-transform: uppercase;
        }

        .bandera-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .bandera-table th {
            background-color: #e0f2fe;
            color: #0369a1;
            font-size: 9.5px;
            text-align: left;
            padding: 5px 8px;
            border: 1px solid #bae6fd;
            text-transform: uppercase;
        }

        .bandera-table.salta th {
            background-color: #fee2e2;
            color: #b91c1c;
            border-color: #fecaca;
        }

        .bandera-cell {
            width: 33.33%;
            vertical-align: top;
            border: 1px solid #cbd5e1;
            padding: 7px;
            text-align: center;
        }

        .cargo-label {
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            color: #0369a1;
            margin-bottom: 5px;
        }

        .bandera-table.salta .cargo-label {
            color: #b91c1c;
        }

        .foto-abanderado {
            width: 54px;
            height: 54px;
            border-radius: 27px;
            object-fit: cover;
            border: 1.5px solid #94a3b8;
            margin: 0 auto 5px auto;
            display: block;
        }

        .iniciales-abanderado {
            width: 54px;
            height: 54px;
            border-radius: 27px;
            background-color: #e2e8f0;
            color: #475569;
            font-size: 14px;
            font-weight: bold;
            line-height: 54px;
            text-align: center;
            margin: 0 auto 5px auto;
            border: 1px solid #cbd5e1;
        }

        .alumno-nombre {
            font-size: 9.5px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 2px;
        }

        .alumno-meta {
            font-size: 8px;
            color: #475569;
            margin-bottom: 3px;
        }

        .promedio-badge {
            display: inline-block;
            background-color: #dcfce7;
            color: #166534;
            font-weight: bold;
            font-size: 8.5px;
            padding: 2px 6px;
            border-radius: 8px;
            border: 1px solid #86efac;
        }

        .grado-block {
            margin-bottom: 9px;
            page-break-inside: avoid;
        }

        .grado-header {
            background-color: #1e293b;
            color: #ffffff;
            padding: 4px 8px;
            font-size: 9.5px;
            font-weight: bold;
        }

        .cuadro-table {
            width: 100%;
            border-collapse: collapse;
        }

        .cuadro-table th {
            background-color: #f8fafc;
            color: #334155;
            font-size: 8px;
            text-transform: uppercase;
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            text-align: left;
        }

        .cuadro-table td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            font-size: 8.8px;
            vertical-align: middle;
        }

        .foto-mini {
            width: 24px;
            height: 24px;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid #94a3b8;
            display: block;
            margin: 0 auto;
        }

        .iniciales-mini {
            width: 24px;
            height: 24px;
            border-radius: 12px;
            background-color: #e2e8f0;
            color: #475569;
            font-size: 8px;
            font-weight: bold;
            line-height: 24px;
            text-align: center;
            margin: 0 auto;
        }

        .page-break {
            page-break-before: always;
        }

        .firmas-table {
            width: 100%;
            margin-top: 26px;
            border-collapse: collapse;
            page-break-inside: avoid;
        }

        .firmas-table td {
            width: 50%;
            text-align: center;
            padding: 0 30px;
            vertical-align: bottom;
        }

        .firma-linea {
            border-top: 1px solid #475569;
            padding-top: 4px;
            font-size: 8.5px;
            font-weight: bold;
            color: #334155;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>Escuela N.° 129 "Dr. Mariano Boedo" — CUE 660030900</h1>
        <h2>Acta de Abanderados, Escoltas y Cuadro de Honor</h2>
        <p>
            Ciclo Lectivo {{ $ciclo->anio }} &nbsp;|&nbsp; Período: {{ $periodoLabel }}
            &nbsp;|&nbsp; Criterio:
            {{ $soloSinDesaprobadas ? 'Todas las materias aprobadas (≥ 6)' : 'Promedio general' }}
            &nbsp;|&nbsp; Emisión: {{ $fechaEmision }}
        </p>
    </div>

    @foreach ($seccionesPorTurno as $idxTurno => $seccion)
        @if ($idxTurno > 0)
            <div class="page-break"></div>
        @endif

        @php
            $esManana = $seccion['turno'] === 'Mañana';
            $nacional = collect($seccion['abanderados'])->where('bandera', 'nacional')->values();
            $salta = collect($seccion['abanderados'])->where('bandera', 'salta')->values();
        @endphp

        <div class="turno-banner {{ $esManana ? 'manana' : 'tarde' }}">
            Turno {{ $seccion['turno'] }}
        </div>

        <div class="section-title">1. Cuerpo de Banderas — Turno {{ $seccion['turno'] }}</div>

        {{-- Bandera Nacional --}}
        <table class="bandera-table">
            <thead>
                <tr>
                    <th colspan="3">Bandera Nacional (7.º y 6.º Grado)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    @foreach ($nacional as $cargo)
                        @php $al = $cargo['alumno']; @endphp
                        <td class="bandera-cell">
                            <div class="cargo-label">{{ $cargo['cargo'] }} ({{ $cargo['origen'] }})</div>
                            @if ($al)
                                @if (!empty($al['foto_data_uri']))
                                    <img src="{{ $al['foto_data_uri'] }}" alt="Foto" class="foto-abanderado">
                                @else
                                    @php
                                        $partes = preg_split('/[\s,]+/', trim($al['nombre_completo']));
                                        $ini = mb_strtoupper(mb_substr($partes[0] ?? '', 0, 1) . mb_substr($partes[1] ?? '', 0, 1));
                                    @endphp
                                    <div class="iniciales-abanderado">{{ $ini }}</div>
                                @endif
                                <div class="alumno-nombre">{{ $al['nombre_completo'] }}</div>
                                <div class="alumno-meta">{{ $al['grado_numero'] }}.° "{{ $al['grado_division'] }}" · DNI
                                    {{ $al['dni'] }}</div>
                                <span class="promedio-badge">Promedio: {{ number_format($al['promedio'], 2) }}</span>
                            @else
                                <div class="alumno-meta" style="padding: 18px 0; font-style: italic;">
                                    Sin alumnos elegibles en {{ $cargo['origen'] }}
                                </div>
                            @endif
                        </td>
                    @endforeach
                </tr>
            </tbody>
        </table>

        {{-- Bandera de Salta --}}
        <table class="bandera-table salta">
            <thead>
                <tr>
                    <th colspan="3">Bandera de la Provincia de Salta (6.º y 5.º Grado)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    @foreach ($salta as $cargo)
                        @php $al = $cargo['alumno']; @endphp
                        <td class="bandera-cell">
                            <div class="cargo-label">{{ $cargo['cargo'] }} ({{ $cargo['origen'] }})</div>
                            @if ($al)
                                @if (!empty($al['foto_data_uri']))
                                    <img src="{{ $al['foto_data_uri'] }}" alt="Foto" class="foto-abanderado">
                                @else
                                    @php
                                        $partes = preg_split('/[\s,]+/', trim($al['nombre_completo']));
                                        $ini = mb_strtoupper(mb_substr($partes[0] ?? '', 0, 1) . mb_substr($partes[1] ?? '', 0, 1));
                                    @endphp
                                    <div class="iniciales-abanderado">{{ $ini }}</div>
                                @endif
                                <div class="alumno-nombre">{{ $al['nombre_completo'] }}</div>
                                <div class="alumno-meta">{{ $al['grado_numero'] }}.° "{{ $al['grado_division'] }}" · DNI
                                    {{ $al['dni'] }}</div>
                                <span class="promedio-badge">Promedio: {{ number_format($al['promedio'], 2) }}</span>
                            @else
                                <div class="alumno-meta" style="padding: 18px 0; font-style: italic;">
                                    Sin alumnos elegibles en {{ $cargo['origen'] }}
                                </div>
                            @endif
                        </td>
                    @endforeach
                </tr>
            </tbody>
        </table>

        <div class="section-title">2. Cuadro de Honor por Grado y División — Turno {{ $seccion['turno'] }}</div>

        @forelse ($seccion['grados'] as $grado)
            <div class="grado-block">
                <div class="grado-header">
                    {{ $grado['numero'] }}.° Grado "{{ $grado['division'] }}" — Turno {{ $grado['turno'] }}
                </div>
                <table class="cuadro-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">Puesto</th>
                            <th style="width: 8%; text-align: center;">Foto</th>
                            <th style="width: 46%;">Apellido y Nombre</th>
                            <th style="width: 16%; text-align: center;">DNI</th>
                            <th style="width: 10%; text-align: center;">Inasist.</th>
                            <th style="width: 12%; text-align: center;">Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($grado['cuadro_honor'] as $al)
                            <tr>
                                <td style="text-align: center; font-weight: bold; color: #b45309;">#{{ $al['puesto'] }}</td>
                                <td style="text-align: center;">
                                    @if (!empty($al['foto_data_uri']))
                                        <img src="{{ $al['foto_data_uri'] }}" alt="Foto" class="foto-mini">
                                    @else
                                        @php
                                            $partes = preg_split('/[\s,]+/', trim($al['nombre_completo']));
                                            $ini = mb_strtoupper(mb_substr($partes[0] ?? '', 0, 1) . mb_substr($partes[1] ?? '', 0, 1));
                                        @endphp
                                        <div class="iniciales-mini">{{ $ini }}</div>
                                    @endif
                                </td>
                                <td style="font-weight: bold;">{{ $al['nombre_completo'] }}</td>
                                <td style="text-align: center; color: #475569;">{{ $al['dni'] }}</td>
                                <td style="text-align: center; color: #475569;">{{ $al['total_inasistencias'] }}</td>
                                <td style="text-align: center; font-weight: bold; color: #166534;">
                                    {{ number_format($al['promedio'], 2) }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" style="text-align: center; color: #64748b; font-style: italic; padding: 6px;">
                                    Sin alumnos con cuadernos visados elegibles en este grado.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        @empty
            <p style="color: #64748b; font-style: italic;">No hay grados activos registrados en Turno {{ $seccion['turno'] }}.
            </p>
        @endforelse
    @endforeach
    <table class="firmas-table">
        <tr>
            <td>
                <div class="firma-linea">Firma y Sello Dirección</div>
            </td>
            <td>
                <div class="firma-linea">Firma y Sello Vicedirección</div>
            </td>
        </tr>
    </table>
</body>

</html>