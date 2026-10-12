<?php

namespace Tests\Feature\Applications;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MyApplicationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * One application per status, created a day apart (oldest first): pending … withdrawn.
     *
     * @return array<string, Application>
     */
    private function onePerStatus(User $seeker): array
    {
        $made = [];
        foreach (['pending', 'reviewed', 'hired', 'rejected', 'withdrawn'] as $days => $status) {
            $factory = Application::factory();
            $factory = $status === 'pending' ? $factory : $factory->{$status}();
            $made[$status] = $factory->create(['user_id' => $seeker->id, 'created_at' => now()->subDays(10 - $days)]);
        }

        return $made;
    }

    public function test_lists_own_applications_newest_first_with_counts(): void
    {
        $seeker = User::factory()->create();
        $made = $this->onePerStatus($seeker);
        Application::factory()->count(2)->create();

        $this->actingAs($seeker, 'web')->getJson('/api/applications')
            ->assertOk()
            ->assertJsonPath('data.*.status', ['withdrawn', 'rejected', 'hired', 'reviewed', 'pending'])
            ->assertJsonPath('counts', ['all' => 5, 'waiting' => 2, 'hired' => 1, 'closed' => 2])
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.per_page', 12);
        $this->getJson('/api/applications?status=waiting')
            ->assertJsonPath('data.*.id', [$made['reviewed']->id, $made['pending']->id])
            ->assertJsonPath('counts.all', 5);
        $this->getJson('/api/applications?status=hired')->assertJsonPath('data.*.id', [$made['hired']->id]);
        $this->getJson('/api/applications?status=closed')->assertJsonPath('data.*.id', [$made['withdrawn']->id, $made['rejected']->id]);
        $this->getJson('/api/applications?status=all')->assertJsonCount(5, 'data');
        $this->getJson('/api/applications?status=bogus')->assertJsonValidationErrors('status');
        $this->getJson('/api/applications?page=abc')->assertJsonValidationErrors('page');
    }

    public function test_pages_of_12(): void
    {
        $seeker = User::factory()->create();
        Application::factory()->count(13)->create(['user_id' => $seeker->id]);

        $this->actingAs($seeker, 'web')->getJson('/api/applications')->assertJsonCount(12, 'data')->assertJsonPath('meta.last_page', 2);
        $this->getJson('/api/applications?page=2')->assertJsonCount(1, 'data');
    }

    public function test_closed_and_removed_jobs_keep_their_applications(): void
    {
        $seeker = User::factory()->create();
        [$closed, $waiting, $removed] = Application::factory()->count(3)->create(['user_id' => $seeker->id]);
        $closed->jobPosting->forceFill(['status' => 'closed'])->save();
        $waiting->jobPosting->forceFill(['status' => 'pending'])->save();
        $removed->jobPosting->delete();

        $response = $this->actingAs($seeker, 'web')->getJson('/api/applications')->assertOk()->collect('data')->keyBy('id');

        $this->assertSame('not_open', $response[$closed->id]['job']['state']);
        $this->assertSame('not_open', $response[$waiting->id]['job']['state']);
        $this->assertSame('removed', $response[$removed->id]['job']['state']);
        $this->assertSame($removed->jobPosting->title, $response[$removed->id]['job']['title']);
        $this->getJson("/api/applications/{$removed->id}")->assertOk()->assertJsonPath('data.job.state', 'removed');
    }

    public function test_one_application_with_the_job_accommodations_and_the_hire_copy(): void
    {
        $seeker = User::factory()->create();
        $ramp = Accommodation::factory()->create(['name' => 'Ramp', 'group_name' => 'Physical access']);
        $captions = Accommodation::factory()->create(['name' => 'Captions', 'group_name' => 'Communication']);
        $job = JobPosting::factory()->open()->create();
        $job->accommodations()->attach([$ramp->id => ['note' => 'Side door'], $captions->id => ['note' => null]]);
        $hired = Application::factory()->hired()->create(['user_id' => $seeker->id, 'job_posting_id' => $job->id]);
        $hired->hiredAccommodations()->attach([$ramp->id => ['note' => 'Side door']]);
        $pending = Application::factory()->create(['user_id' => $seeker->id]);

        $this->actingAs($seeker, 'web')->getJson("/api/applications/{$hired->id}")
            ->assertOk()
            ->assertJsonPath('data.job.accommodations', [
                ['id' => $ramp->id, 'name' => 'Ramp', 'group_name' => 'Physical access', 'note' => 'Side door'],
                ['id' => $captions->id, 'name' => 'Captions', 'group_name' => 'Communication', 'note' => null],
            ])
            ->assertJsonPath('data.hired_accommodations', [
                ['id' => $ramp->id, 'name' => 'Ramp', 'group_name' => 'Physical access', 'note' => 'Side door'],
            ])
            ->assertJsonPath('data.hire_confirmed_by', 'employer')
            ->assertJsonPath('data.actions', []);
        $this->getJson("/api/applications/{$pending->id}")
            ->assertJsonPath('data.hired_accommodations', null)
            ->assertJsonPath('data.actions', ['withdraw']);
    }

    public function test_only_the_owner_reads_an_application(): void
    {
        $application = Application::factory()->create();
        $url = "/api/applications/{$application->id}";

        $this->getJson($url)->assertUnauthorized();
        $this->getJson('/api/applications')->assertUnauthorized();
        $this->actingAs(User::factory()->create(), 'web')->getJson($url)
            ->assertForbidden()->assertJsonPath('message', "This application isn't yours.");
        foreach ([User::factory()->employer()->create(), User::factory()->admin()->create()] as $other) {
            $this->actingAs($other, 'web')->getJson($url)->assertForbidden();
            $this->getJson('/api/applications')->assertForbidden();
        }
        $this->actingAs($application->candidate, 'web')->getJson($url)->assertOk()->assertJsonPath('data.id', $application->id);
        $this->getJson('/api/applications/999999')->assertNotFound();
    }

    public function test_the_list_does_not_query_per_application(): void
    {
        $seeker = User::factory()->create();
        $count = function () use ($seeker): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($seeker, 'web')->getJson('/api/applications')->assertOk();
            DB::disableQueryLog();

            return count(DB::getQueryLog());
        };

        Application::factory()->count(3)->create(['user_id' => $seeker->id]);
        $few = $count();
        Application::factory()->count(7)->create(['user_id' => $seeker->id]);

        $this->assertSame($few, $count());
    }
}
