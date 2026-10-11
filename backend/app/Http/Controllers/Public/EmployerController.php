<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicEmployerResource;
use App\Models\Employer;

/**
 * Public employer pages (F3.5): only for employers with at least one approved posting
 * that hasn't been deleted. The open jobs come from GET /api/job-postings?employer=.
 */
class EmployerController extends Controller
{
    public function show(int $id): PublicEmployerResource
    {
        return new PublicEmployerResource(
            Employer::whereHas('jobPostings', fn ($query) => $query->whereNotNull('approved_at'))->findOrFail($id),
        );
    }
}
