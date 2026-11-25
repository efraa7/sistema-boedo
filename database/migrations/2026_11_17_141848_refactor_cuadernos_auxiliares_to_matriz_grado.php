<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cuadernos_auxiliares', function (Blueprint $table) {
            $table->index('docente_id', 'cuadernos_docente_id_idx');
            $table->index('grado_id', 'cuadernos_grado_id_idx');

            $table->dropForeign(['materia_id']);
            $table->dropUnique('cuaderno_unico_idx');

            $table->foreignId('materia_id')->nullable()->change();
            $table->text('sintesis_general')->nullable()->after('observaciones_vicedireccion');

            $table->unique(['grado_id', 'ciclo_lectivo_id', 'periodo'], 'cuaderno_grado_periodo_unico_idx');
        });

        Schema::create('calificacion_materias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calificacion_id')
                ->constrained('calificaciones')
                ->cascadeOnDelete();
            $table->foreignId('materia_id')
                ->constrained('materias')
                ->cascadeOnDelete();
            $table->decimal('nota_numerica', 4, 2)->nullable();
            $table->timestamps();

            $table->unique(['calificacion_id', 'materia_id'], 'calif_materia_unico_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calificacion_materias');

        Schema::table('cuadernos_auxiliares', function (Blueprint $table) {
            $table->dropUnique('cuaderno_grado_periodo_unico_idx');
            $table->dropColumn('sintesis_general');
            $table->foreignId('materia_id')->nullable(false)->change();
            $table->foreign('materia_id')->references('id')->on('materias')->cascadeOnDelete();
            $table->unique(['docente_id', 'grado_id', 'materia_id', 'ciclo_lectivo_id', 'periodo'], 'cuaderno_unico_idx');
            $table->dropIndex('cuadernos_docente_id_idx');
            $table->dropIndex('cuadernos_grado_id_idx');
        });
    }
};