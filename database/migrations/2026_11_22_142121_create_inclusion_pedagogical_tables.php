<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('inclusion_informe_periodo_materias');
        Schema::dropIfExists('inclusion_informes_periodos');
        Schema::dropIfExists('inclusion_ppi_materias');
        Schema::dropIfExists('inclusion_ppis');
        Schema::dropIfExists('inclusion_informes_iniciales');
        Schema::create('inclusion_informes_iniciales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legajo_inclusion_id')->constrained('legajos_inclusion')->cascadeOnDelete();
            $table->foreignId('ciclo_lectivo_id')->constrained('ciclos_lectivos')->cascadeOnDelete();
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('escuela_especial')->nullable();
            $table->text('vinculo_adaptacion')->nullable();
            $table->text('fortalezas_estilo')->nullable();
            $table->text('saberes_previos')->nullable();
            $table->timestamps();

            $table->unique(['legajo_inclusion_id', 'ciclo_lectivo_id'], 'inc_inicial_legajo_ciclo_unique');
        });
        Schema::create('inclusion_ppis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legajo_inclusion_id')->constrained('legajos_inclusion')->cascadeOnDelete();
            $table->foreignId('ciclo_lectivo_id')->constrained('ciclos_lectivos')->cascadeOnDelete();
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('barreras_contexto')->nullable();
            $table->text('configuraciones_apoyo')->nullable();
            $table->timestamps();

            $table->unique(['legajo_inclusion_id', 'ciclo_lectivo_id'], 'inc_ppi_legajo_ciclo_unique');
        });

        Schema::create('inclusion_ppi_materias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inclusion_ppi_id')->constrained('inclusion_ppis')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
            $table->text('contenidos_priorizados')->nullable();
            $table->text('ajustes_evaluacion')->nullable();
            $table->timestamps();

            $table->unique(['inclusion_ppi_id', 'materia_id'], 'inc_ppi_materia_unique');
        });

        Schema::create('inclusion_informes_periodos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legajo_inclusion_id')->constrained('legajos_inclusion')->cascadeOnDelete();
            $table->foreignId('ciclo_lectivo_id')->constrained('ciclos_lectivos')->cascadeOnDelete();
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('periodo', ['1_trimestre', '2_trimestre', '3_trimestre', 'informe_final']);
            $table->decimal('inasistencias', 5, 1)->default(0);
            $table->text('sintesis_periodo')->nullable();
            $table->timestamps();

            $table->unique(['legajo_inclusion_id', 'ciclo_lectivo_id', 'periodo'], 'inc_periodo_legajo_ciclo_unique');
        });

        Schema::create('inclusion_informe_periodo_materias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inclusion_informe_periodo_id')
                ->constrained('inclusion_informes_periodos', 'id', 'fk_inc_periodo_mat_informe')
                ->cascadeOnDelete();
            $table->foreignId('materia_id')
                ->constrained('materias', 'id', 'fk_inc_periodo_mat_materia')
                ->cascadeOnDelete();
            $table->decimal('nota_numerica', 4, 2)->nullable();
            $table->text('contenidos_alcanzados')->nullable();
            $table->text('dificultades_sugerencias')->nullable();
            $table->timestamps();

            $table->unique(['inclusion_informe_periodo_id', 'materia_id'], 'inc_periodo_mat_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inclusion_informe_periodo_materias');
        Schema::dropIfExists('inclusion_informes_periodos');
        Schema::dropIfExists('inclusion_ppi_materias');
        Schema::dropIfExists('inclusion_ppis');
        Schema::dropIfExists('inclusion_informes_iniciales');
    }
};