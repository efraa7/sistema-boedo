<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InclusionInformePeriodo extends Model
{
    protected $table = 'inclusion_informes_periodos';

    protected $fillable = [
        'legajo_inclusion_id',
        'ciclo_lectivo_id',
        'autor_id',
        'periodo',
        'inasistencias',
        'sintesis_periodo',
    ];

    protected function casts(): array
    {
        return [
            'inasistencias' => 'float',
        ];
    }

    public function legajo(): BelongsTo
    {
        return $this->belongsTo(LegajoInclusion::class, 'legajo_inclusion_id');
    }

    public function cicloLectivo(): BelongsTo
    {
        return $this->belongsTo(CicloLectivo::class, 'ciclo_lectivo_id');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_id');
    }

    public function materias(): HasMany
    {
        return $this->hasMany(InclusionInformePeriodoMateria::class, 'inclusion_informe_periodo_id');
    }
}