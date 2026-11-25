<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumnos', function (Blueprint $table) {
            $table->id();
            $table->string('dni', 20)->unique();
            $table->string('legajo', 20)->unique();
            $table->string('apellido', 100);
            $table->string('nombre', 100);
            $table->date('fecha_nacimiento');
            $table->string('domicilio', 200)->nullable();
            $table->string('tutor_nombre', 150);
            $table->string('tutor_telefono', 50);
            $table->string('tutor_email', 150)->nullable();
            $table->string('foto')->nullable();
            $table->boolean('recibe_copa_leche')->default(true);
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumnos');
    }
};