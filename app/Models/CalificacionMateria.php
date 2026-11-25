<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalificacionMateria extends Model
{
    protected $table = 'calificacion_materias';

    protected $fillable = [
        'calificacion_id',
        'materia_id',
        'nota_numerica',
    ];

    protected function casts(): array
    {
        return [
            'nota_numerica' => 'float',
        ];
    }

    public function calificacion(): BelongsTo
    {
        return $this->belongsTo(Calificacion::class);
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }
}