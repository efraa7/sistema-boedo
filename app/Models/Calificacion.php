<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Calificacion extends Model
{
    protected $table = 'calificaciones';

    protected $fillable = [
        'cuaderno_auxiliar_id',
        'alumno_id',
        'nota_numerica',
        'nota_conceptual',
        'inasistencias_total',
        'sintesis_pedagogica_ia',
    ];

    public function cuadernoAuxiliar(): BelongsTo
    {
        return $this->belongsTo(CuadernoAuxiliar::class);
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function notasMaterias(): HasMany
    {
        return $this->hasMany(CalificacionMateria::class);
    }
}