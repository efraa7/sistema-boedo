<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuaderno_auxiliar_id')->constrained('cuadernos_auxiliares')->cascadeOnDelete();
            $table->foreignId('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->string('nota_conceptual')->nullable();
            $table->decimal('nota_numerica', 4, 2)->nullable();
            $table->integer('asistencias_total')->default(0);
            $table->integer('inasistencias_total')->default(0);
            $table->text('sintesis_pedagogica_ia')->nullable();
            $table->timestamps();
            $table->unique(['cuaderno_auxiliar_id', 'alumno_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calificaciones');
    }
};