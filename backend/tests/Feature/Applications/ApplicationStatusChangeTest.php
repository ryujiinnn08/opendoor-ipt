<?php

namespace Tests\Feature\Applications;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ApplicationStatusChangeTest extends TestCase
{
    use RefreshDatabase;

    private const STALE = 'This application changed while you were looking at it. Reload to see its status.';

    private function change(Application $application, string $status, ?string $expected = null)
    {
        return $this->patchJson("/api/applications/{$application->id}/status", [
            'status' => $status,
            'expected_status' => $expected ?? $application->status->value,
        ]);
    }

    public function test_withdraw_from_pending_and_reviewed(): void
    {
        $seeker = User::factory()->create();
        $pending = Application::factory()->create(['user_id' => $seeker->id]);
        $reviewed = Application::factory()->reviewed()->create(['user_id' => $seeker->id]);
        $this->actingAs($seeker, 'web');

        foreach ([$pending, $reviewed] as $application) {
            $this->change($application, 'withdrawn')
                ->assertOk()
                ->assertJsonPath('data.status', 'withdrawn')
                ->assertJsonPath('data.actions', []);
            $this->assertNotNull($application->fresh()->withdrawn_at);
        }
    }

    public function test_confirm_hire_only_from_reviewed(): void
    {
        Carbon::setTestNow('2026-10-12 17:30:00');
        $seeker = User::factory()->create();
        $ramp = Accommodation::factory()->create(['name' => 'Ramp']);
        $lift = Accommodation::factory()->create(['name' => 'Lift']);
        $job = JobPosting::factory()->open()->create();
        $job->accommodations()->attach([$ramp->id => ['note' => 'Side door'], $lift->id => ['note' => null]]);
        $reviewed = Application::factory()->reviewed()->create(['user_id' => $seeker->id, 'job_posting_id' => $job->id]);
        $pending = Application::factory()->create(['user_id' => $seeker->id]);
        $this->actingAs($seeker, 'web');

        $this->change($reviewed, 'hired')
            ->assertOk()
            ->assertJsonPath('data.status', 'hired')
            ->assertJsonPath('data.hired_at', '2026-10-13')
            ->assertJsonPath('data.hire_confirmed_by', 'candidate')
            ->assertJsonPath('data.actions', []);
        $copy = $reviewed->fresh()->hiredAccommodations->mapWithKeys(fn (Accommodation $item) => [$item->name => $item->pivot->note])->all();
        $this->assertEquals(['Ramp' => 'Side door', 'Lift' => null], $copy);
        $this->assertSame($seeker->id, $reviewed->fresh()->decided_by);

        $this->change($pending, 'hired')
            ->assertStatus(422)
            ->assertJsonPath('message', 'If you were hired, ask the employer to open your application on OpenDoor first.');
        $this->assertSame('pending', $pending->fresh()->status->value);
        Carbon::setTestNow();
    }

    public function test_final_statuses_never_move(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web');

        foreach (['withdrawn', 'rejected', 'hired'] as $state) {
            $application = Application::factory()->{$state}()->create(['user_id' => $seeker->id]);
            foreach (['withdrawn', 'hired'] as $next) {
                $this->change($application, $next)->assertStatus(422);
            }
            $this->assertSame($state, $application->fresh()->status->value);
        }
        $this->change(Application::factory()->rejected()->create(['user_id' => $seeker->id]), 'withdrawn')
            ->assertJsonPath('message', "This application can't be changed to Withdrawn.");
    }

    public function test_a_stale_change_is_refused(): void
    {
        $application = Application::factory()->reviewed()->create();

        $this->actingAs($application->candidate, 'web');
        $this->change($application, 'withdrawn', 'pending')->assertStatus(409)->assertJsonPath('message', self::STALE);
        $this->assertSame('reviewed', $application->fresh()->status->value);
    }

    public function test_the_hire_copy_keeps_what_was_advertised(): void
    {
        $ramp = Accommodation::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $job->accommodations()->attach($ramp->id, ['note' => 'Side door']);
        $application = Application::factory()->reviewed()->create(['job_posting_id' => $job->id]);

        $this->actingAs($application->candidate, 'web');
        $this->change($application, 'hired')->assertOk();
        $job->accommodations()->sync([Accommodation::factory()->create()->id]);

        $this->assertSame([$ramp->id], $application->fresh()->hiredAccommodations->pluck('id')->all());
        $this->assertSame('Side door', $application->fresh()->hiredAccommodations->first()->pivot->note);
    }

    public function test_only_the_owner_changes_it(): void
    {
        $application = Application::factory()->reviewed()->create();

        $this->change($application, 'withdrawn')->assertUnauthorized();
        $this->actingAs(User::factory()->create(), 'web');
        $this->change($application, 'withdrawn')->assertForbidden()->assertJsonPath('message', "This application isn't yours.");
        // An employer of another job may only send hired/rejected, and is refused those too.
        $this->actingAs(User::factory()->employer()->create(), 'web');
        $this->change($application, 'hired')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web');
        $this->change($application, 'withdrawn')->assertForbidden();

        $this->actingAs($application->candidate, 'web');
        $this->change($application, 'rejected')->assertJsonValidationErrors('status');
        $this->change($application, 'reviewed')->assertJsonValidationErrors('status');
        $this->patchJson("/api/applications/{$application->id}/status", ['status' => 'withdrawn'])->assertJsonValidationErrors('expected_status');
        $this->assertSame('reviewed', $application->fresh()->status->value);
    }
}
