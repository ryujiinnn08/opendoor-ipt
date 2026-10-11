<?php

namespace Tests\Feature\Jobs;

use App\Models\Accommodation;
use App\Models\Category;
use App\Models\Employer;
use App\Models\JobPosting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsTeams;
use Tests\TestCase;

class PublicJobSearchTest extends TestCase
{
    use BuildsTeams, RefreshDatabase;

    public function test_lists_only_open_postings_that_have_not_closed(): void
    {
        $open = JobPosting::factory()->open()->create();
        JobPosting::factory()->expired()->create();
        JobPosting::factory()->closed()->create();
        JobPosting::factory()->create(); // draft
        JobPosting::factory()->pending()->create();
        JobPosting::factory()->rejected()->create();
        JobPosting::factory()->open()->create()->delete();

        $this->getJson('/api/job-postings')->assertOk()
            ->assertJsonPath('data.*.id', [$open->id])
            ->assertJsonPath('meta.total', 1);
    }

    public function test_a_posting_that_closed_yesterday_in_manila_is_hidden_before_8_am(): void
    {
        Carbon::setTestNow('2026-10-10 18:30:00'); // UTC; already October 11, 02:30 in Manila
        $closedYesterday = JobPosting::factory()->open()->create(['closes_on' => '2026-10-10']);
        $closesToday = JobPosting::factory()->open()->create(['closes_on' => '2026-10-11']);

        $ids = $this->getJson('/api/job-postings')->json('data.*.id');
        $this->assertSame([$closesToday->id], $ids);
        $this->getJson("/api/job-postings/{$closedYesterday->id}")->assertNotFound();
    }

    public function test_newest_first_by_approval_or_closing_soon(): void
    {
        $older = JobPosting::factory()->open()->create(['approved_at' => now()->subDays(3), 'closes_on' => JobPosting::today()]);
        $newer = JobPosting::factory()->open()->create(['approved_at' => now()->subDay(), 'closes_on' => Carbon::parse(JobPosting::today())->addDays(9)->toDateString()]);

        $this->assertSame([$newer->id, $older->id], $this->getJson('/api/job-postings')->json('data.*.id'));
        $this->assertSame([$older->id, $newer->id], $this->getJson('/api/job-postings?sort=closing')->json('data.*.id'));
    }

    public function test_pages_of_twelve_with_totals(): void
    {
        JobPosting::factory()->count(13)->open()->create();

        $this->getJson('/api/job-postings')->assertJsonCount(12, 'data')->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.total', 13);
        $this->getJson('/api/job-postings?page=2')->assertJsonCount(1, 'data');
        $this->getJson('/api/job-postings?page=3')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/job-postings?per_page=3')->assertJsonCount(3, 'data');
    }

    public function test_search_matches_each_word_in_title_description_location_or_company(): void
    {
        // Factory text is random (a Faker job title can be "Web Developer"), so every field here is fixed.
        $make = fn (array $fields, string $employer = 'Neutral Employer') => JobPosting::factory()
            ->in(Employer::factory()->create(['name' => $employer.' '.fake()->unique()->numberBetween(1, 999)]))
            ->open()
            ->create(array_merge(['title' => 'Assistant', 'description' => 'Plain duties.', 'location' => 'Makati City'], $fields));
        $web = $make(['title' => 'Junior Web Developer']);
        $books = $make(['description' => 'Simple bookkeeping for a family shop.']);
        $cebu = $make(['location' => 'Cebu City']);
        $byCompany = $make([], 'Bayanihan Contact Center Inc.');

        $this->assertSame([$web->id], $this->getJson('/api/job-postings?q=WEB developer')->json('data.*.id'));
        $this->assertSame([$books->id], $this->getJson('/api/job-postings?q=bookkeep')->json('data.*.id'));
        $this->assertSame([$cebu->id], $this->getJson('/api/job-postings?q=cebu')->json('data.*.id'));
        $this->assertSame([$byCompany->id], $this->getJson('/api/job-postings?q=bayanihan')->json('data.*.id'));
        $this->assertSame([], $this->getJson('/api/job-postings?q=web cebu')->json('data.*.id'));
    }

    public function test_search_treats_wildcards_as_plain_characters(): void
    {
        $percent = JobPosting::factory()->open()->create(['title' => '100% remote encoder']);
        JobPosting::factory()->open()->create(['title' => 'Sales Representative']);

        $this->assertSame([$percent->id], $this->getJson('/api/job-postings?q=%25')->json('data.*.id'));
        $this->assertSame([], $this->getJson('/api/job-postings?q=_')->json('data.*.id'));
        $this->assertSame([], $this->getJson('/api/job-postings?q=!')->json('data.*.id'));
    }

    public function test_search_limits(): void
    {
        $this->getJson('/api/job-postings?q='.str_repeat('a', 101))->assertUnprocessable()->assertJsonValidationErrors('q');
        $this->getJson('/api/job-postings?q=one two three four five six seven eight nine')
            ->assertUnprocessable()
            ->assertJsonPath('errors.q.0', 'Search with 8 words or fewer.');
    }

    public function test_category_and_accommodation_filters(): void
    {
        [$it, $health] = Category::factory()->count(2)->create();
        [$ramp, $interpreter] = Accommodation::factory()->count(2)->create();
        $both = JobPosting::factory()->open()->create(['category_id' => $it->id]);
        $both->accommodations()->attach([$ramp->id, $interpreter->id]);
        $rampOnly = JobPosting::factory()->open()->create(['category_id' => $it->id]);
        $rampOnly->accommodations()->attach($ramp->id);
        $otherCategory = JobPosting::factory()->open()->create(['category_id' => $health->id]);
        $otherCategory->accommodations()->attach([$ramp->id, $interpreter->id]);

        $this->assertSame([$both->id], $this->getJson("/api/job-postings?category={$it->id}&accommodations[]={$ramp->id}&accommodations[]={$interpreter->id}")->json('data.*.id'));
        $this->assertCount(3, $this->getJson("/api/job-postings?accommodations[]={$ramp->id}")->json('data'));
    }

    public function test_crafted_parameters_are_refused(): void
    {
        foreach (['category=999999', 'accommodations[]=abc', 'accommodations[]=999999', 'sort=price', 'per_page=50', 'page=0', 'employer=abc'] as $query) {
            $this->getJson("/api/job-postings?{$query}")->assertUnprocessable();
        }
    }

    public function test_the_public_shape_leaves_out_private_fields(): void
    {
        [$owner, , $department] = $this->companyWithOwner();
        $posting = JobPosting::factory()->in($department)->open()->create(['created_by' => $owner->id]);
        $posting->accommodations()->attach(Accommodation::factory()->create()->id, ['note' => 'Ramp at the side door.']);

        $item = $this->actingAs($owner, 'web')->getJson('/api/job-postings')->json('data.0');
        foreach (['actions', 'created_by', 'rejection_reason', 'submitted_at', 'approved_at', 'changed_after_approval', 'status'] as $key) {
            $this->assertArrayNotHasKey($key, $item);
        }
        $this->assertSame(['id', 'type', 'name', 'logo_url', 'is_verified'], array_keys($item['employer']));
        $this->assertSame(['id', 'name', 'group_name', 'note'], array_keys($item['accommodations'][0]));
        $this->assertSame(['name' => 'General'], $item['department']);
    }

    public function test_job_details_show_open_postings_and_hide_the_rest(): void
    {
        $open = JobPosting::factory()->open()->create(['title' => 'Data Encoder']);
        $this->getJson("/api/job-postings/{$open->id}")->assertOk()->assertJsonPath('data.title', 'Data Encoder');

        $deleted = JobPosting::factory()->open()->create();
        $deleted->delete();
        $hidden = [
            JobPosting::factory()->create(), JobPosting::factory()->pending()->create(), JobPosting::factory()->rejected()->create(),
            JobPosting::factory()->closed()->create(), JobPosting::factory()->expired()->create(), $deleted,
        ];
        foreach ($hidden as $posting) {
            $this->getJson("/api/job-postings/{$posting->id}")->assertNotFound();
        }
    }

    public function test_the_public_list_is_rate_limited(): void
    {
        $route = app('router')->getRoutes()->match(Request::create('/api/job-postings', 'GET'));
        $this->assertContains('throttle:120,1,public-jobs', $route->gatherMiddleware());
    }

    public function test_browsing_jobs_does_not_use_up_the_registration_limit(): void
    {
        foreach (range(1, 10) as $request) {
            $this->getJson('/api/job-postings')->assertOk();
        }

        // Registration allows 10 a minute per address; job browsing has its own counter.
        $this->postJson('/api/register', [])->assertUnprocessable();
    }

    public function test_search_text_that_is_not_valid_utf8_is_refused(): void
    {
        $this->getJson('/api/job-postings?q=%FF%FE')->assertUnprocessable()->assertJsonValidationErrors('q');
    }

    public function test_search_treats_a_backslash_as_a_plain_character(): void
    {
        $slash = JobPosting::factory()->open()->create(['title' => 'Encoder for A\\B files']);
        JobPosting::factory()->open()->create(['title' => 'Sales Representative']);

        $this->assertSame([$slash->id], $this->getJson('/api/job-postings?q='.urlencode('\\'))->json('data.*.id'));
    }

    public function test_ids_and_pages_too_large_for_a_number_are_handled(): void
    {
        $this->getJson('/api/job-postings/99999999999999999999')->assertNotFound();
        $this->getJson('/api/employers/99999999999999999999')->assertNotFound();
        $this->getJson('/api/job-postings?page=9223372036854775807')->assertUnprocessable();
    }

    public function test_closing_soon_puts_jobs_without_a_closing_date_last(): void
    {
        $noDate = JobPosting::factory()->open()->create(['closes_on' => null]);
        $soon = JobPosting::factory()->open()->create(['closes_on' => Carbon::parse(JobPosting::today())->addDays(2)->toDateString()]);

        $this->assertSame([$soon->id, $noDate->id], $this->getJson('/api/job-postings?sort=closing')->json('data.*.id'));
    }

    public function test_listing_does_not_query_per_job(): void
    {
        $count = function (int $postings): int {
            JobPosting::factory()->count($postings)->open()->hasAttached(Accommodation::factory()->count(2), ['note' => null])->create();
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson('/api/job-postings')->assertOk();

            return count(DB::getQueryLog());
        };

        $this->assertSame($count(2), $count(8));
    }
}
