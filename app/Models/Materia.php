<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Materia extends Model
{
    use HasFactory;

    protected $table = 'materias';

    protected $fillable = [
        'codigo',
        'nombre',
        'es_especial',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'es_especial' => 'boolean',
            'estado' => 'boolean',
        ];
    }

    public function grados(): BelongsToMany
    {
        return $this->belongsToMany(Grado::class, 'grado_materia')
            ->withTimestamps();
    }
}