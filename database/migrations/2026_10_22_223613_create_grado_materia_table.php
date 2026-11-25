<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grado_materia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grado_id')
                ->constrained('grados')
                ->cascadeOnDelete();
            $table->foreignId('materia_id')
                ->constrained('materias')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['grado_id', 'materia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grado_materia');
    }
};