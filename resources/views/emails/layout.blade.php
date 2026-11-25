<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificación Institucional - Escuela N° 129 Dr. Mariano Boedo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; width: 100% !important;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 36px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
                    <tr>
                        <td style="background-color: #1e3a8a; padding: 24px 32px; text-align: center;">
                            <p style="margin: 0 0 4px 0; color: #93c5fd; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                Escuela N° 129 "Dr. Mariano Boedo"
                            </p>
                            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.4px;">
                                @yield('header_title', 'Gabinete e Inclusión Escolar')
                            </h2>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px; color: #374151; font-size: 15px; line-height: 1.6;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; line-height: 1.5;">
                            Este es un correo automático emitido por el Sistema de Gestión Escolar.<br>
                            Información confidencial destinada exclusivamente al equipo pedagógico interviniente.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>