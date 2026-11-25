<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matriculas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alumno_id')
                ->constrained('alumnos')
                ->cascadeOnDelete();
            $table->foreignId('grado_id')
                ->constrained('grados')
                ->restrictOnDelete();
            $table->foreignId('ciclo_lectivo_id')
                ->constrained('ciclos_lectivos')
                ->restrictOnDelete();
            $table->decimal('promedio_final', 4, 2)->nullable();
            $table->string('dictamen_3er_trimestre', 40)->default('En Curso');
            $table->string('distincion_honor', 60)->nullable();
            $table->timestamps();

            $table->unique(['alumno_id', 'ciclo_lectivo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matriculas');
    }
};