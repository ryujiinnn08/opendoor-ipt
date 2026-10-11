<?php

namespace Tests\Feature\Candidate;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NeedsTest extends TestCase
{
    use RefreshDatabase;

    public function test_saving_and_reading_needs_in_display_order(): void
    {
        $seeker = User::factory()->create();
        $ramp = Accommodation::factory()->create(['name' => 'Ramp', 'group_name' => 'Physical access']);
        $captions = Accommodation::factory()->create(['name' => 'Captions', 'group_name' => 'Communication']);

        $this->actingAs($seeker, 'web')->putJson('/api/candidate/accommodations', ['accommodations' => [$captions->id, $ramp->id]])
            ->assertOk()
            ->assertJsonPath('data.*.name', ['Ramp', 'Captions'])
            ->assertJsonPath('data.0', ['id' => $ramp->id, 'name' => 'Ramp', 'group_name' => 'Physical access', 'is_active' => true]);
        $this->getJson('/api/candidate/accommodations')->assertOk()->assertJsonCount(2, 'data');
        $this->putJson('/api/candidate/accommodations', ['accommodations' => []])->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_a_retired_type_can_be_kept_but_not_added(): void
    {
        $seeker = User::factory()->create();
        [$kept, $other] = Accommodation::factory()->count(2)->create();
        $seeker->needs()->attach($kept->id);
        $kept->update(['is_active' => false]);
        $other->update(['is_active' => false]);

        $this->actingAs($seeker, 'web')->putJson('/api/candidate/accommodations', ['accommodations' => [$kept->id]])
            ->assertOk()->assertJsonPath('data.0.is_active', false);
        $this->putJson('/api/candidate/accommodations', ['accommodations' => [$kept->id, $other->id]])
            ->assertJsonValidationErrors(['accommodations.1' => "\"{$other->name}\" is no longer offered. Untick it to continue."]);
    }

    public function test_unknown_and_oversized_lists_are_refused(): void
    {
        $this->actingAs(User::factory()->create(), 'web');

        $this->putJson('/api/candidate/accommodations', ['accommodations' => [999999]])->assertJsonValidationErrors('accommodations.0');
        $this->putJson('/api/candidate/accommodations', ['accommodations' => ['abc']])->assertJsonValidationErrors('accommodations.0');
        $this->putJson('/api/candidate/accommodations', ['accommodations' => range(1, 51)])->assertJsonValidationErrors('accommodations');
        $this->putJson('/api/candidate/accommodations', [])->assertJsonValidationErrors('accommodations');
    }

    public function test_only_job_seekers_have_needs(): void
    {
        $this->getJson('/api/candidate/accommodations')->assertUnauthorized();
        $this->actingAs(User::factory()->employer()->create(), 'web')->getJson('/api/candidate/accommodations')->assertForbidden();
    }
}
