<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legajos_inclusion', function (Blueprint $table) {
            $table->string('docente_integrador_email', 150)
                ->nullable()
                ->after('docente_integrador');
        });
    }

    public function down(): void
    {
        Schema::table('legajos_inclusion', function (Blueprint $table) {
            $table->dropColumn('docente_integrador_email');
        });
    }
};