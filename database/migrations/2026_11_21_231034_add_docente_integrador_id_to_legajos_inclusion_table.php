<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legajos_inclusion', function (Blueprint $table) {
            $table->foreignId('docente_integrador_id')
                ->nullable()
                ->after('archivo_cud')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('legajos_inclusion', function (Blueprint $table) {
            $table->dropConstrainedForeignId('docente_integrador_id');
        });
    }
};