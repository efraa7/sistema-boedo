<?php

namespace App\Mail;

use App\Models\LegajoInclusion;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class LegajoInclusionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LegajoInclusion $legajo,
        public array $datosCurso = [],
        public bool $esActualizacion = false
    ) {}

    public function envelope(): Envelope
    {
        $alumno = $this->legajo->alumno;
        $prefijo = $this->esActualizacion ? 'Actualización Legajo PPI' : 'Nuevo Legajo de Inclusión (PPI)';

        return new Envelope(
            from: new Address(
                config('mail.from.address', 'gabinete@escuelamarianoboedo.edu.ar'),
                config('mail.from.name', 'Escuela N° 129 Dr. Mariano Boedo')
            ),
            subject: "{$prefijo}: {$alumno->apellido}, {$alumno->nombre}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.inclusion.notificacion_docente',
            with: [
                'legajo' => $this->legajo,
                'alumno' => $this->legajo->alumno,
                'datosCurso' => $this->datosCurso,
                'esActualizacion' => $this->esActualizacion,
            ],
        );
    }

    /**
     * Adjunta automáticamente el archivo CUD (PDF o imagen) si existe en disco.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        if (
            $this->legajo->posee_cud &&
            $this->legajo->archivo_cud &&
            Storage::disk('local')->exists($this->legajo->archivo_cud)
        ) {
            $extension = pathinfo($this->legajo->archivo_cud, PATHINFO_EXTENSION);
            $apellidoSlug = preg_replace('/[^A-Za-z0-9]/', '_', $this->legajo->alumno->apellido);
            $nombreAdjunto = "CUD_{$apellidoSlug}_{$this->legajo->alumno->dni}.{$extension}";

            return [
                Attachment::fromStorageDisk('local', $this->legajo->archivo_cud)
                    ->as($nombreAdjunto),
            ];
        }

        return [];
    }
}