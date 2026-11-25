<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legajos_inclusion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alumno_id')->constrained('alumnos')->onDelete('cascade');
            $table->string('diagnostico');
            $table->boolean('posee_cud')->default(false);
            $table->date('vencimiento_cud')->nullable();
            $table->string('archivo_cud')->nullable();
            $table->string('docente_integrador')->nullable();
            $table->text('observaciones_ppi')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legajos_inclusion');
    }
};