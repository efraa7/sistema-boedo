<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuadernos_auxiliares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('docente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('grado_id')->constrained('grados')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
            $table->foreignId('ciclo_lectivo_id')->constrained('ciclos_lectivos')->cascadeOnDelete();
            
            $table->enum('periodo', ['1_trimestre', '2_trimestre', '3_trimestre', 'informe_final']);
            $table->enum('estado', ['borrador', 'enviado_vicedireccion', 'visado_observado', 'aprobado'])->default('borrador');
            
            $table->text('observaciones_vicedireccion')->nullable();
            $table->timestamps();
            $table->unique(['docente_id', 'grado_id', 'materia_id', 'ciclo_lectivo_id', 'periodo'], 'cuaderno_unico_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuadernos_auxiliares');
    }
};