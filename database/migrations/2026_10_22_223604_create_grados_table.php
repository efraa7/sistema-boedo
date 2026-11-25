<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ciclo_lectivo_id')
                ->constrained('ciclos_lectivos')
                ->cascadeOnDelete();
            $table->foreignId('docente_titular_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->unsignedTinyInteger('numero');
            $table->string('division', 10);
            $table->string('turno', 20); 
            $table->string('aula', 50)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->unique(
                ['ciclo_lectivo_id', 'numero', 'division', 'turno'],
                'grados_ciclo_numero_division_turno_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grados');
    }
};