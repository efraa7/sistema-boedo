<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CicloLectivo extends Model
{
    use HasFactory;

    protected $table = 'ciclos_lectivos';

    protected $fillable = [
        'anio',
        'fecha_inicio',
        'fecha_fin',
        'cerrado',
    ];

    protected function casts(): array
    {
        return [
            'anio' => 'integer',
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_fin' => 'date:Y-m-d',
            'cerrado' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (CicloLectivo $ciclo) {
            if (! $ciclo->cerrado) {
                static::where('id', '!=', $ciclo->id ?? 0)
                    ->where('cerrado', false)
                    ->update(['cerrado' => true]);
            }
        });
    }

    public static function activo(): ?self
    {
        return static::where('cerrado', false)->orderByDesc('anio')->first();
    }

    public function grados(): HasMany
    {
        return $this->hasMany(Grado::class, 'ciclo_lectivo_id');
    }

    public function matriculas(): HasMany
    {
        return $this->hasMany(Matricula::class, 'ciclo_lectivo_id');
    }
}