<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InclusionPpiMateria extends Model
{
    protected $table = 'inclusion_ppi_materias';

    protected $fillable = [
        'inclusion_ppi_id',
        'materia_id',
        'contenidos_priorizados',
        'ajustes_evaluacion',
    ];

    public function ppi(): BelongsTo
    {
        return $this->belongsTo(InclusionPpi::class, 'inclusion_ppi_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}