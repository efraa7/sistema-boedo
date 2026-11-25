<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InclusionInformePeriodoMateria extends Model
{
    protected $table = 'inclusion_informe_periodo_materias';

    protected $fillable = [
        'inclusion_informe_periodo_id',
        'materia_id',
        'nota_numerica',
        'contenidos_alcanzados',
        'dificultades_sugerencias',
    ];

    protected function casts(): array
    {
        return [
            'nota_numerica' => 'float',
        ];
    }

    public function informePeriodo(): BelongsTo
    {
        return $this->belongsTo(InclusionInformePeriodo::class, 'inclusion_informe_periodo_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}