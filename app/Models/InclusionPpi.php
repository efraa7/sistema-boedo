<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InclusionPpi extends Model
{
    protected $table = 'inclusion_ppis';

    protected $fillable = [
        'legajo_inclusion_id',
        'ciclo_lectivo_id',
        'autor_id',
        'barreras_contexto',
        'configuraciones_apoyo',
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

    public function materias(): HasMany
    {
        return $this->hasMany(InclusionPpiMateria::class, 'inclusion_ppi_id');
    }
}