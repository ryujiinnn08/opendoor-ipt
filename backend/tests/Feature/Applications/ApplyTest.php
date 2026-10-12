<?php

namespace Tests\Feature\Applications;

use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApplyTest extends TestCase
{
    use RefreshDatabase;

    private const NOT_TAKING = "This job isn't taking applications.";

    private const ALREADY = "You've already applied for this job.";

    public function test_a_job_seeker_applies_with_optional_texts(): void
    {
        $seeker = User::factory()->create();
        [$job, $other, $third] = JobPosting::factory()->open()->count(3)->create();

        $this->actingAs($seeker, 'web')->postJson("/api/job-postings/{$job->id}/applications", [
            'cover_note' => "I have three years of bookkeeping.\nI'd love to learn.",
            'interview_request' => 'Online interview with captions, please.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.status_label', 'Pending')
            ->assertJsonPath('data.cover_note', "I have three years of bookkeeping.\nI'd love to learn.")
            ->assertJsonPath('data.interview_request', 'Online interview with captions, please.')
            ->assertJsonPath('data.actions', ['withdraw'])
            ->assertJsonPath('data.job.id', $job->id)
            ->assertJsonPath('data.job.title', $job->title)
            ->assertJsonPath('data.job.state', 'open')
            ->assertJsonPath('data.job.employer.id', $job->employer_id);
        $this->assertSame(1, Application::where('user_id', $seeker->id)->count());

        $this->postJson("/api/job-postings/{$other->id}/applications", [])
            ->assertCreated()->assertJsonPath('data.cover_note', null)->assertJsonPath('data.interview_request', null);
        $this->postJson("/api/job-postings/{$third->id}/applications", ['cover_note' => '   ', 'interview_request' => ''])
            ->assertCreated()->assertJsonPath('data.cover_note', null)->assertJsonPath('data.interview_request', null);
    }

    public function test_only_open_jobs_take_applications(): void
    {
        $seeker = User::factory()->create();
        $deleted = JobPosting::factory()->open()->create();
        $deleted->delete();
        $jobs = [
            JobPosting::factory()->create(),
            JobPosting::factory()->pending()->create(),
            JobPosting::factory()->rejected()->create(),
            JobPosting::factory()->closed()->create(),
            JobPosting::factory()->expired()->create(),
            $deleted,
        ];

        $this->actingAs($seeker, 'web');
        foreach ($jobs as $job) {
            $this->postJson("/api/job-postings/{$job->id}/applications", [])
                ->assertNotFound()->assertJsonPath('message', self::NOT_TAKING);
        }
        $this->postJson('/api/job-postings/999999/applications', [])->assertNotFound();
        $this->assertSame(0, Application::count());
    }

    public function test_once_per_job_even_after_withdrawing(): void
    {
        $seeker = User::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $this->actingAs($seeker, 'web');

        $id = $this->postJson("/api/job-postings/{$job->id}/applications", [])->json('data.id');
        $this->postJson("/api/job-postings/{$job->id}/applications", [])
            ->assertStatus(409)->assertJsonPath('message', self::ALREADY)->assertJsonPath('application_id', $id);

        $withdrawn = Application::factory()->withdrawn()->create(['user_id' => $seeker->id]);
        $this->postJson("/api/job-postings/{$withdrawn->job_posting_id}/applications", [])
            ->assertStatus(409)->assertJsonPath('application_id', $withdrawn->id);
    }

    public function test_the_unique_index_answers_like_the_check(): void
    {
        $seeker = User::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $winner = null;
        Application::creating(function () use ($seeker, $job, &$winner) {
            if ($winner === null) {
                $winner = DB::table('applications')->insertGetId([
                    'job_posting_id' => $job->id,
                    'user_id' => $seeker->id,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        $this->actingAs($seeker, 'web')->postJson("/api/job-postings/{$job->id}/applications", [])
            ->assertStatus(409)->assertJsonPath('message', self::ALREADY)->assertJsonPath('application_id', $winner);
        $this->assertSame(1, Application::count());
    }

    public function test_texts_are_limited_and_status_cannot_be_sent(): void
    {
        $seeker = User::factory()->create();
        $someoneElse = User::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $this->actingAs($seeker, 'web');

        $this->postJson("/api/job-postings/{$job->id}/applications", [
            'cover_note' => str_repeat('a', 3001),
            'interview_request' => str_repeat('b', 1001),
        ])->assertJsonValidationErrors(['cover_note', 'interview_request']);
        $this->postJson("/api/job-postings/{$job->id}/applications", [
            'cover_note' => str_repeat('a', 3000),
            'interview_request' => str_repeat('b', 1000),
            'status' => 'hired',
            'hired_at' => '2026-01-01',
            'user_id' => $someoneElse->id,
        ])->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.hired_at', null);

        $this->assertSame($seeker->id, Application::sole()->user_id);
    }

    public function test_only_active_job_seekers_apply(): void
    {
        $job = JobPosting::factory()->open()->create();
        $url = "/api/job-postings/{$job->id}/applications";

        $this->postJson($url, [])->assertUnauthorized();
        $this->actingAs(User::factory()->employer()->create(), 'web')->postJson($url, [])->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web')->postJson($url, [])->assertForbidden();
        $this->actingAs(User::factory()->suspended()->create(), 'web')->postJson($url, [])->assertForbidden();
        $this->assertSame(0, Application::count());
    }

    public function test_applying_is_rate_limited(): void
    {
        $jobs = JobPosting::factory()->open()->count(11)->create();
        $this->actingAs(User::factory()->create(), 'web');

        foreach ($jobs->take(10) as $job) {
            $this->postJson("/api/job-postings/{$job->id}/applications", [])->assertCreated();
        }
        $this->postJson("/api/job-postings/{$jobs->last()->id}/applications", [])->assertStatus(429);
    }

    public function test_the_job_page_tells_only_the_applicant(): void
    {
        $seeker = User::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $url = "/api/job-postings/{$job->id}";

        $this->actingAs($seeker, 'web')->getJson($url)->assertJsonMissingPath('data.my_application');
        $id = $this->postJson("{$url}/applications", [])->json('data.id');
        $this->getJson($url)
            ->assertJsonPath('data.my_application.id', $id)
            ->assertJsonPath('data.my_application.status', 'pending')
            ->assertJsonPath('data.my_application.status_label', 'Pending');

        foreach ([User::factory()->create(), User::factory()->employer()->create(), User::factory()->admin()->create()] as $other) {
            $this->actingAs($other, 'web')->getJson($url)->assertOk()->assertJsonMissingPath('data.my_application');
        }
        auth()->guard('web')->logout();
        $this->app['auth']->forgetGuards();
        $this->getJson($url)->assertOk()->assertJsonMissingPath('data.my_application');
    }

    public function test_an_unreadable_body_is_refused_not_sent_empty(): void
    {
        $job = JobPosting::factory()->open()->create();
        $this->actingAs(User::factory()->create(), 'web');
        $url = "/api/job-postings/{$job->id}/applications";

        // A JSON body that can't be decoded (a lone surrogate) must not become an empty application.
        $this->call('POST', $url, [], [], [], $this->transformHeadersToServerVars([
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Origin' => self::SPA_ORIGIN,
        ]), '{"cover_note": "Hello \ud800"}')
            ->assertStatus(422)
            ->assertJsonPath('message', "We couldn't read your application. Please try again.");
        // A form body with bytes that aren't UTF-8.
        $this->post($url, ['cover_note' => "Caf\xE9", 'interview_request' => "\xFF"], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors(['cover_note', 'interview_request']);

        $this->assertSame(0, Application::count());
    }

    public function test_application_responses_are_never_stored_by_the_browser(): void
    {
        $seeker = User::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $this->actingAs($seeker, 'web');

        $created = $this->postJson("/api/job-postings/{$job->id}/applications", ['interview_request' => 'Captions, please.']);
        $id = $created->json('data.id');
        $responses = [
            $created,
            $this->getJson('/api/applications'),
            $this->getJson("/api/applications/{$id}"),
            $this->patchJson("/api/applications/{$id}/status", ['status' => 'withdrawn', 'expected_status' => 'pending']),
        ];

        foreach ($responses as $response) {
            $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            $this->assertStringContainsString('private', $response->headers->get('Cache-Control'));
        }
    }
}
