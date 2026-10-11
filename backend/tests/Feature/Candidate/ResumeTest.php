<?php

namespace Tests\Feature\Candidate;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ResumeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    /**
     * A real temporary file: Laravel's fake files report their type from the name, so only a
     * real file shows that the contents are checked.
     */
    private function file(string $name, string $contents): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'resume');
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, null, null, true);
    }

    private function pdf(string $name = 'cv.pdf', int $kilobytes = 300): UploadedFile
    {
        return $this->file($name, "%PDF-1.4\n".str_repeat('0', max(0, $kilobytes * 1024 - 9)));
    }

    private function upload(UploadedFile $file)
    {
        return $this->post('/api/candidate/resume', ['resume' => $file], ['Accept' => 'application/json']);
    }

    public function test_uploading_a_pdf(): void
    {
        $seeker = User::factory()->create();

        $this->actingAs($seeker, 'web');
        $this->upload($this->pdf('Ana Reyes CV.pdf'))->assertOk()->assertJsonPath('data.resume.name', 'Ana Reyes CV.pdf');

        $path = $seeker->fresh()->candidateProfile->resume_path;
        Storage::disk('local')->assertExists($path);
        $this->assertStringStartsWith('resumes/', $path);
        $this->assertStringNotContainsString('Ana Reyes', $path);
    }

    public function test_only_real_pdfs_up_to_5_mb(): void
    {
        $this->actingAs(User::factory()->create(), 'web');

        $this->upload($this->file('cv.pdf', '<?php echo 1;'))
            ->assertJsonValidationErrors(['resume' => 'The résumé must be a PDF file.']);
        $this->upload($this->file('cv.docx', "%PDF-1.4\nnot really a pdf"))
            ->assertJsonValidationErrors(['resume' => 'The résumé must be a PDF file.']);
        $this->upload($this->pdf('big.pdf', 5121))->assertJsonValidationErrors(['resume' => 'The résumé must be smaller than 5 MB.']);
        $this->post('/api/candidate/resume', [], ['Accept' => 'application/json'])->assertJsonValidationErrors(['resume' => 'Choose a PDF file.']);
    }

    public function test_a_file_the_server_could_not_receive_gets_a_clear_message(): void
    {
        $this->actingAs(User::factory()->create(), 'web');
        // PHP's own upload limit (upload_max_filesize) refused it before Laravel saw it.
        $path = tempnam(sys_get_temp_dir(), 'resume');
        file_put_contents($path, "%PDF-1.4\n");
        $file = new UploadedFile($path, 'cv.pdf', 'application/pdf', UPLOAD_ERR_INI_SIZE, true);

        $this->upload($file)->assertJsonValidationErrors(['resume' => "The file couldn't be uploaded. Make sure it's a PDF smaller than 5 MB."]);
    }

    public function test_a_failed_save_keeps_the_old_resume(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web');
        $this->upload($this->pdf('first.pdf'));
        $first = $seeker->fresh()->candidateProfile->resume_path;

        $disk = Mockery::mock(Storage::disk('local'))->makePartial();
        $disk->shouldReceive('putFileAs')->andReturn(false);
        Storage::set('local', $disk);

        $this->upload($this->pdf('second.pdf'))->assertStatus(500)->assertJsonPath('message', "We couldn't save your résumé. Please try again.");
        $this->assertSame($first, $seeker->fresh()->candidateProfile->resume_path);
        $this->assertTrue(Storage::disk('local')->exists($first));
    }

    public function test_only_the_owner_can_open_it(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web');
        $this->upload($this->pdf('cv.pdf'));

        $response = $this->get('/api/candidate/resume')->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('inline', $response->headers->get('Content-Disposition'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));

        $this->actingAs(User::factory()->create(), 'web')->getJson('/api/candidate/resume')
            ->assertNotFound()->assertJsonPath('message', "You haven't uploaded a résumé.");
        $this->actingAs(User::factory()->employer()->create(), 'web')->getJson('/api/candidate/resume')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web')->getJson('/api/candidate/resume')->assertForbidden();
    }

    public function test_guests_cannot_open_it(): void
    {
        $this->getJson('/api/candidate/resume')->assertUnauthorized();
        // "Open my résumé" in a new tab after the session ended: a browser request, not JSON.
        $this->get('/api/candidate/resume')->assertUnauthorized()->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_replacing_and_removing_delete_the_old_file(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web');

        $this->upload($this->pdf('first.pdf'));
        $first = $seeker->fresh()->candidateProfile->resume_path;
        $this->upload($this->pdf('second.pdf'))->assertJsonPath('data.resume.name', 'second.pdf');
        $second = $seeker->fresh()->candidateProfile->resume_path;

        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);

        $this->deleteJson('/api/candidate/resume')->assertOk()->assertJsonPath('data.resume', null);
        Storage::disk('local')->assertMissing($second);
    }
}
