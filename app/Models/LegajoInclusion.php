<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LegajoInclusion extends Model
{
    protected $table = 'legajos_inclusion';

    protected $fillable = [
        'alumno_id',
        'diagnostico',
        'posee_cud',
        'vencimiento_cud',
        'archivo_cud',
        'docente_integrador_id',
        'docente_integrador',
        'docente_integrador_email',
        'observaciones_ppi',
    ];

    protected function casts(): array
    {
        return [
            'posee_cud' => 'boolean',
            'vencimiento_cud' => 'date',
        ];
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function docenteIntegradorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_integrador_id');
    }

    public function informesIniciales(): HasMany
    {
        return $this->hasMany(InclusionInformeInicial::class, 'legajo_inclusion_id');
    }

    public function ppis(): HasMany
    {
        return $this->hasMany(InclusionPpi::class, 'legajo_inclusion_id');
    }

    public function informesPeriodos(): HasMany
    {
        return $this->hasMany(InclusionInformePeriodo::class, 'legajo_inclusion_id');
    }
}