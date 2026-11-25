<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InclusionInformeInicial extends Model
{
    protected $table = 'inclusion_informes_iniciales';

    protected $fillable = [
        'legajo_inclusion_id',
        'ciclo_lectivo_id',
        'autor_id',
        'escuela_especial',
        'vinculo_adaptacion',
        'fortalezas_estilo',
        'saberes_previos',
    ];

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
}