<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function checks(): array
    {
        return [
            'job_postings' => "hiring_slots BETWEEN 1 AND 1000000 AND (application_limit IS NULL OR application_limit BETWEEN 1 AND 1000000) AND status IN ('draft','pending','open','rejected','closed')",
            'applications' => "status IN ('pending','reviewed','hired','rejected','withdrawn')",
            'employers' => "type <> 'company' OR (LENGTH(TRIM(name)) > 0 AND address IS NOT NULL AND LENGTH(TRIM(address)) > 0)",
        ];
    }

    public function up(): void
    {
        foreach ($this->checks() as $table => $expression) {
            if (DB::table($table)->whereRaw("NOT ($expression)")->exists()) {
                throw new RuntimeException("Invalid existing records in $table. Resolve them before adding security checks.");
            }
        }
        foreach ($this->checks() as $table => $expression) {
            if (DB::getDriverName() === 'sqlite') {
                // SQLite cannot ALTER TABLE ADD CHECK; equivalent guards cover raw writes too.
                $columns = $table === 'job_postings' ? ['hiring_slots', 'application_limit', 'status'] : ($table === 'applications' ? ['status'] : ['type', 'name', 'address']);
                $qualified = preg_replace('/\b('.implode('|', $columns).')\b/', 'NEW.$1', $expression);
                foreach (['INSERT', 'UPDATE'] as $operation) {
                    DB::unprepared("CREATE TRIGGER {$table}_security_{$operation} BEFORE $operation ON $table WHEN NOT ($qualified) BEGIN SELECT RAISE(ABORT, 'security constraint failed'); END");
                }
            } else {
                DB::statement("ALTER TABLE $table ADD CONSTRAINT {$table}_security_check CHECK ($expression)");
            }
        }
    }

    public function down(): void
    {
        foreach (array_keys($this->checks()) as $table) {
            if (DB::getDriverName() === 'sqlite') {
                foreach (['INSERT', 'UPDATE'] as $operation) {
                    DB::unprepared("DROP TRIGGER IF EXISTS {$table}_security_{$operation}");
                }
            } else {
                DB::statement("ALTER TABLE $table DROP CONSTRAINT {$table}_security_check");
            }
        }
    }
};
