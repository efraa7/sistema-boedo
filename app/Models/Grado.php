<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grado extends Model
{
    use HasFactory;

    protected $table = 'grados';

    protected $fillable = [
        'ciclo_lectivo_id',
        'docente_titular_id',
        'numero',
        'division',
        'turno',
        'aula',
        'estado',
    ];

    protected $appends = ['nombre_completo'];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'estado' => 'boolean',
        ];
    }

    public function getNombreCompletoAttribute(): string
    {
        return "{$this->numero}.° Grado {$this->division} - Turno {$this->turno}";
    }

    public function cicloLectivo(): BelongsTo
    {
        return $this->belongsTo(CicloLectivo::class, 'ciclo_lectivo_id');
    }

    public function docenteTitular(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_titular_id');
    }

    public function materias(): BelongsToMany
    {
        return $this->belongsToMany(Materia::class, 'grado_materia')
            ->withTimestamps();
    }

    public function matriculas(): HasMany
    {
        return $this->hasMany(Matricula::class, 'grado_id');
    }
}