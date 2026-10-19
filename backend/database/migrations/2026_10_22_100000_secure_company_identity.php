<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fail before DDL: resolve duplicates deliberately, without deleting company records.
        $duplicate = DB::table('employers')->where('type', 'company')
            ->selectRaw('LOWER(TRIM(name)) AS company_name, LOWER(TRIM(address)) AS company_address, COUNT(*) AS total')
            ->groupByRaw('LOWER(TRIM(name)), LOWER(TRIM(address))')->havingRaw('COUNT(*) > 1')->exists();
        if ($duplicate) {
            throw new RuntimeException('Duplicate company names and addresses exist. Resolve them before running secure_company_identity.');
        }
        Schema::table('employers', function (Blueprint $table) {
            // Computed by the database, including direct INSERT/UPDATE statements. Individuals
            // receive NULL keys and are intentionally outside the company uniqueness rule.
            $table->string('company_name_key', 200)->nullable()->virtualAs("CASE WHEN type = 'company' THEN LOWER(TRIM(name)) ELSE NULL END");
            $table->string('company_address_key', 255)->nullable()->virtualAs("CASE WHEN type = 'company' THEN LOWER(TRIM(address)) ELSE NULL END");
            $table->unique(['company_name_key', 'company_address_key'], 'employers_company_identity_unique');
        });
    }

    public function down(): void
    {
        Schema::table('employers', function (Blueprint $table) {
            $table->dropUnique('employers_company_identity_unique');
            $table->dropColumn(['company_name_key', 'company_address_key']);
        });
    }
};
