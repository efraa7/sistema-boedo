<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'dni',
        'apellido',
        'name',
        'email',
        'telefono',
        'foto',
        'estado',
        'password',
        'vicedirector_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Atributos calculados que se serializan automáticamente para Inertia.
     */
    protected $appends = ['foto_url'];

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto
            ? Storage::url($this->foto)
            : null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'estado' => 'boolean',
        ];
    }
    public function gradosTitulares(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Grado::class, 'docente_titular_id');
    }

    public function vicedirector()
    {
        return $this->belongsTo(User::class, 'vicedirector_id');
    }

    public function docentesACargo()
    {
        return $this->hasMany(User::class, 'vicedirector_id');
    }

    public function cuadernosAuxiliares()
    {
        return $this->hasMany(CuadernoAuxiliar::class, 'docente_id');
    }
}