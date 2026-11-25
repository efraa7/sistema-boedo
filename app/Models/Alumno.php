<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Alumno extends Model
{
    use HasFactory;

    protected $table = 'alumnos';

    protected $fillable = [
        'dni',
        'legajo',
        'apellido',
        'nombre',
        'fecha_nacimiento',
        'domicilio',
        'tutor_nombre',
        'tutor_telefono',
        'tutor_email',
        'foto',
        'recibe_copa_leche',
        'estado',
    ];

    protected $appends = ['foto_url', 'nombre_completo'];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date:Y-m-d',
            'recibe_copa_leche' => 'boolean',
            'estado' => 'boolean',
        ];
    }

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto
            ? Storage::url($this->foto)
            : null;
    }

    public function getNombreCompletoAttribute(): string
    {
        return "{$this->apellido}, {$this->nombre}";
    }

    public function matriculas(): HasMany
    {
        return $this->hasMany(Matricula::class, 'alumno_id');
    }
    public function matriculaActual(): HasOne
    {
        return $this->hasOne(Matricula::class, 'alumno_id')->latestOfMany();
    }
    public function legajoInclusion() 
    {
         return $this->hasOne(LegajoInclusion::class); 
    }
}