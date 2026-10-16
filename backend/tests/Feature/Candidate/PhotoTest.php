<?php

namespace Tests\Feature\Candidate;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/** The profile photo and Open to (UI_FEEDBACK_WAVE_B_PLAN B1). */
class PhotoTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_a_job_seeker_adds_replaces_sees_and_removes_their_photo(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web');

        $this->postJson('/api/candidate/profile/photo', ['photo' => UploadedFile::fake()->image('me.jpg', 400, 400)])
            ->assertOk()->assertJsonPath('data.has_photo', true)->assertJsonPath('data.show_photo_to_employers', false);
        $first = $seeker->candidateProfile->fresh()->photo_path;
        Storage::disk('local')->assertExists($first);
        $this->get('/api/candidate/profile/photo')->assertOk()->assertHeader('Cache-Control', 'no-store, private');

        $this->postJson('/api/candidate/profile/photo', ['photo' => UploadedFile::fake()->image('new.png', 300, 300)])->assertOk();
        Storage::disk('local')->assertMissing($first);

        // The account menu learns of it from the logged-in user.
        $version = $this->getJson('/api/candidate/profile')->json('data.photo_version');
        $this->getJson('/api/me')->assertJsonPath('data.photo_version', $version);

        $this->deleteJson('/api/candidate/profile/photo')->assertOk()->assertJsonPath('data.has_photo', false);
        $this->getJson('/api/me')->assertJsonPath('data.photo_version', null);
        $this->getJson('/api/candidate/profile/photo')->assertNotFound();
    }

    public function test_only_jpeg_or_png_photos_of_a_useful_size_are_accepted(): void
    {
        $this->actingAs(User::factory()->create(), 'web');

        foreach ([
            UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->image('tiny.jpg', 100, 100),
            UploadedFile::fake()->image('huge.jpg', 400, 400)->size(3000),
            UploadedFile::fake()->image('anim.gif', 400, 400),
        ] as $file) {
            $this->postJson('/api/candidate/profile/photo', ['photo' => $file])->assertUnprocessable()->assertJsonValidationErrors('photo');
        }
    }

    public function test_employers_see_an_applicants_photo_only_when_it_is_shared(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);
        $seeker = $application->candidate;
        $this->actingAs($seeker, 'web')->postJson('/api/candidate/profile/photo', ['photo' => UploadedFile::fake()->image('me.jpg', 400, 400)])->assertOk();

        $this->actingAs($team['owner'], 'web');
        $this->getJson("/api/applications/{$application->id}/applicant-photo")->assertNotFound();
        $this->getJson("/api/applications/{$application->id}")->assertJsonPath('data.profile.has_photo', false)
            ->assertJsonMissingPath('data.profile.show_photo_to_employers');

        $seeker->candidateProfile->forceFill(['show_photo_to_employers' => true])->save();
        $this->get("/api/applications/{$application->id}/applicant-photo")->assertOk();
        $this->getJson("/api/applications/{$application->id}")->assertJsonPath('data.profile.has_photo', true);

        // Not their applicant: no photo, shared or not.
        [$otherOwner] = $this->companyWithOwner();
        $this->actingAs($otherOwner, 'web')->getJson("/api/applications/{$application->id}/applicant-photo")->assertForbidden();
    }

    public function test_open_to_and_the_photo_switch_are_saved_with_the_profile(): void
    {
        $this->actingAs(User::factory()->create(['name' => 'Ana']), 'web');

        $this->putJson('/api/candidate/profile', [
            'name' => 'Ana',
            'show_photo_to_employers' => true,
            'open_to_work_setups' => ['remote', 'hybrid'],
            'open_to_employment_types' => ['internship'],
        ])->assertOk()
            ->assertJsonPath('data.show_photo_to_employers', true)
            ->assertJsonPath('data.open_to_work_setups', ['remote', 'hybrid'])
            ->assertJsonPath('data.open_to_employment_types', ['internship']);

        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'open_to_work_setups' => ['moon']])->assertUnprocessable();

        // A whole-profile save without them turns the switch off and clears the choices.
        $this->putJson('/api/candidate/profile', ['name' => 'Ana'])->assertOk()
            ->assertJsonPath('data.show_photo_to_employers', false)
            ->assertJsonPath('data.open_to_work_setups', []);
    }
}
