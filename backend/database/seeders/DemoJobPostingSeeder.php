<?php

namespace Database\Seeders;

use App\Enums\EmploymentType;
use App\Enums\InterviewFormat;
use App\Enums\PostingStatus;
use App\Enums\WorkSetup;
use App\Models\Accommodation;
use App\Models\Category;
use App\Models\Department;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * The demo postings: the demo company's departments and the individual employer (plan PHASE_2
 * decision 36), plus the contact center and the clinic (Phase 3A). Together they give 13 open
 * jobs across 8 categories and all 18 accommodation types, so Phase 3B's two demo job seekers
 * rank them differently. They are added only to an employer that has no
 * postings at all (deleted ones count), so nothing a person created, changed or deleted is
 * ever touched.
 */
class DemoJobPostingSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::firstWhere('email', UserSeeder::DEMO_EMPLOYER_EMAIL);
        $company = $owner?->membership?->employer;

        if ($owner && $company?->isCompany() && $this->hasNoPostings($company)) {
            $this->postCompanyJobs($company, $owner);
            $this->command?->line('  Demo job postings created for '.$company->name);
        }

        if ($owner && $company?->isCompany() && ! $this->hasAnyTitled($company, ['Graphic Designer', 'Office Clerk'])) {
            $this->postPhase3CompanyJobs($company, $owner);
            $this->command?->line('  Phase 3A demo job postings created for '.$company->name);
        }

        $individual = User::firstWhere('email', UserSeeder::DEMO_INDIVIDUAL_EMAIL);
        $employer = $individual?->membership?->employer;

        if ($individual && $employer && ! $employer->isCompany() && $this->hasNoPostings($employer)) {
            $this->post($employer, null, $individual, PostingStatus::Open, [
                'title' => 'Part-time Home-based Bookkeeper',
                'description' => 'Record sales and expenses for a small family business and prepare a simple monthly report. You work from home on your own schedule.',
                'category' => 'Accounting & Finance',
                'location' => 'Quezon City',
                'work_setup' => WorkSetup::Remote,
                'employment_type' => EmploymentType::PartTime,
                'interview_format' => InterviewFormat::Online,
                'closes_in' => 40,
            ], [
                'Remote work' => null,
                'Part-time schedule' => 'About 20 hours a week; you choose the days.',
                'Flexible hours' => null,
            ]);
            $this->command?->line('  Demo job posting created for the individual employer');
        }

        $this->postFor(UserSeeder::DEMO_EMPLOYER2_EMAIL, fn (Employer $company, ?Department $department, User $owner) => $this->postContactCenterJobs($company, $department, $owner));
        $this->postFor(UserSeeder::DEMO_EMPLOYER3_EMAIL, fn (Employer $company, ?Department $department, User $owner) => $this->postClinicJobs($company, $department, $owner));
    }

    /**
     * Runs $post for the company this demo owner runs, if it has no postings yet.
     */
    private function postFor(string $ownerEmail, callable $post): void
    {
        $owner = User::firstWhere('email', $ownerEmail);
        $company = $owner?->membership?->employer;

        if ($owner && $company?->isCompany() && $this->hasNoPostings($company)) {
            $post($company, $company->departments()->first(), $owner);
            $this->command?->line('  Demo job postings created for '.$company->name);
        }
    }

    /**
     * Demo Corp.'s two Phase 3A postings. Added on their own, so a database seeded in Phase 2
     * (when the company already had postings) gets them too; skipped if either title exists,
     * deleted ones included.
     */
    private function postPhase3CompanyJobs(Employer $company, User $owner): void
    {
        $hrOfficer = User::firstWhere('email', UserSeeder::DEMO_HR_EMAIL) ?? $owner;
        $humanResources = $company->departments()->firstWhere('name', 'Human Resources') ?? $company->departments()->first();
        $it = $company->departments()->firstWhere('name', 'IT') ?? $humanResources;

        $this->post($company, $it, $owner, PostingStatus::Open, [
            'title' => 'Graphic Designer',
            'description' => 'Design social media graphics, slides and simple brochures for our clients. You get clear briefs and one round of feedback for each piece.',
            'category' => 'Creative & Design',
            'location' => 'Anywhere in the Philippines',
            'work_setup' => WorkSetup::Remote,
            'employment_type' => EmploymentType::Contract,
            'interview_format' => InterviewFormat::Online,
            'closes_in' => 35,
        ], [
            'Remote work' => null,
            'Flexible hours' => 'Work any hours as long as deadlines are met.',
            'Screen reader software provided' => null,
        ]);

        // Closed early by the employer: it must never appear on the job board.
        $this->post($company, $humanResources, $hrOfficer, PostingStatus::Closed, [
            'title' => 'Office Clerk',
            'description' => 'Sort mail, keep office supplies stocked and file documents for the HR team. The position was filled before its closing date.',
            'category' => 'Administrative & Clerical',
            'location' => 'Makati City, Metro Manila',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnSite,
            'closes_in' => 20,
        ], [
            'Wheelchair-accessible entrance' => null,
            'Accessible restroom' => null,
        ]);
    }

    private function postContactCenterJobs(Employer $company, ?Department $operations, User $owner): void
    {
        $this->post($company, $operations, $owner, PostingStatus::Open, [
            'title' => 'Customer Support Associate',
            'description' => 'Answer customer calls and emails about orders, deliveries and billing for our retail clients. Paid training and a buddy help you through your first month.',
            'category' => 'Customer Service & BPO',
            'location' => 'Cebu City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnlineOrOnSite,
            'closes_in' => 50,
        ], [
            'Wheelchair-accessible entrance' => 'Level entry from the IT Park walkway.',
            'Accessible restroom' => null,
            'Elevator or ground-floor workspace' => 'The support floor is on the ground floor.',
            'Adjustable workstation' => null,
            'Flexible hours' => 'Choose a morning or a mid shift.',
            'Job coach or onboarding buddy' => null,
        ]);

        $this->post($company, $operations, $owner, PostingStatus::Open, [
            'title' => 'Chat Support Specialist',
            'description' => 'Help customers by chat and email, so the work is written rather than spoken. You follow clear reply guides and a team lead checks in with you each day.',
            'category' => 'Customer Service & BPO',
            'location' => 'Cebu City',
            'work_setup' => WorkSetup::Hybrid,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::Online,
            'closes_in' => 42,
        ], [
            'Sign language interpreter' => 'An FSL interpreter joins training and team meetings.',
            'Written or captioned meetings' => null,
            'Flexible hours' => null,
            'Hybrid work' => 'Three days at home, two in the office.',
            'Screen-reader-compatible work tools' => null,
        ]);

        $this->post($company, $operations, $owner, PostingStatus::Open, [
            'title' => 'Quality Analyst',
            'description' => 'Review recorded chats and emails against our quality checklist and write short coaching notes for agents. Experience in customer service is a plus.',
            'category' => 'Customer Service & BPO',
            'location' => 'Cebu City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnSite,
            'closes_in' => 28,
        ], [
            'Elevator or ground-floor workspace' => null,
            'Accessible restroom' => null,
            'Written or captioned meetings' => 'Weekly calibration meetings have live captions.',
            'Assistive listening devices' => null,
        ]);

        $this->post($company, $operations, $owner, PostingStatus::Open, [
            'title' => 'Training Assistant',
            'description' => 'Help our trainers prepare materials, set up the training room and keep attendance for new hires. This internship lasts six months and comes with an allowance.',
            'category' => 'Education & Training',
            'location' => 'Cebu City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::Internship,
            'interview_format' => InterviewFormat::OnlineOrOnSite,
            'closes_in' => 21,
        ], [
            'Sign language interpreter' => null,
            'Written or captioned meetings' => null,
            'Wheelchair-accessible entrance' => null,
            'Part-time schedule' => 'Four hours a day, Monday to Friday.',
        ]);

        $this->post($company, $operations, $owner, PostingStatus::Open, [
            'title' => 'Data Encoder',
            'description' => 'Type customer forms and records into our system accurately and on time. You work at your own pace within daily targets.',
            'category' => 'Administrative & Clerical',
            'location' => 'Cebu City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::Contract,
            'interview_format' => InterviewFormat::OnSite,
            'closes_in' => 33,
        ], [
            'Wheelchair-accessible entrance' => null,
            'Accessible restroom' => null,
            'Elevator or ground-floor workspace' => null,
            'Adjustable workstation' => 'Height-adjustable desks at every encoding station.',
            'Flexible hours' => null,
            'Accessible parking' => 'Two reserved slots beside the entrance.',
        ]);

        $this->post($company, $operations, $owner, PostingStatus::Open, [
            'title' => 'Sales Coordinator',
            'description' => 'Prepare quotations, follow up with client accounts and keep the sales team\'s schedule. Some client meetings are by phone or video call.',
            'category' => 'Sales & Marketing',
            'location' => 'Cebu City',
            'work_setup' => WorkSetup::Hybrid,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::Online,
            'closes_in' => 55,
        ], [
            'Hybrid work' => null,
            'Assistive listening devices' => null,
            'Job coach or onboarding buddy' => null,
        ]);
    }

    private function postClinicJobs(Employer $clinic, ?Department $frontOffice, User $owner): void
    {
        $this->post($clinic, $frontOffice, $owner, PostingStatus::Open, [
            'title' => 'Medical Records Clerk',
            'description' => 'File and update patient records, both on paper and in our clinic system. You keep every record private and easy to find.',
            'category' => 'Healthcare',
            'location' => 'Quezon City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnSite,
            'closes_in' => 38,
        ], [
            'Accessible restroom' => null,
            'Elevator or ground-floor workspace' => 'The records room is on the ground floor.',
            'Modified duties' => 'No lifting of heavy record boxes.',
        ]);

        $this->post($clinic, $frontOffice, $owner, PostingStatus::Open, [
            'title' => 'Front Desk Assistant',
            'description' => 'Welcome patients, book appointments and answer messages from our clinic page. Most bookings come in by text and chat.',
            'category' => 'Healthcare',
            'location' => 'Quezon City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::PartTime,
            'interview_format' => InterviewFormat::OnlineOrOnSite,
            'closes_in' => 26,
        ], [
            'Written or captioned meetings' => null,
            'Sign language interpreter' => 'Available for training and staff meetings.',
            'Flexible hours' => null,
            'Transportation assistance' => 'A monthly transport allowance.',
        ]);

        $this->post($clinic, $frontOffice, $owner, PostingStatus::Open, [
            'title' => 'Pharmacy Aide',
            'description' => 'Help our pharmacist sort deliveries, label medicines and keep the shelves in order. Training on medicine handling is provided.',
            'category' => 'Healthcare',
            'location' => 'Quezon City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnSite,
            'closes_in' => 47,
        ], [
            'Service animal allowed' => null,
            'Transportation assistance' => null,
        ]);

        // Open, but its closing date was yesterday: it must never appear on the job board.
        $this->post($clinic, $frontOffice, $owner, PostingStatus::Open, [
            'title' => 'Laboratory Aide',
            'description' => 'Prepare sample containers, clean laboratory equipment and log incoming samples. You work under the supervision of our medical technologist.',
            'category' => 'Healthcare',
            'location' => 'Quezon City',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnSite,
            'closes_in' => -1,
        ], [
            'Accessible restroom' => null,
        ]);
    }

    private function postCompanyJobs(Employer $company, User $owner): void
    {
        $hrOfficer = User::firstWhere('email', UserSeeder::DEMO_HR_EMAIL) ?? $owner;
        $humanResources = $company->departments()->firstWhere('name', 'Human Resources') ?? $company->departments()->first();
        $it = $company->departments()->firstWhere('name', 'IT') ?? $humanResources;

        $this->post($company, $humanResources, $hrOfficer, PostingStatus::Open, [
            'title' => 'HR Assistant',
            'description' => 'Keep employee records up to date, schedule interviews and prepare onboarding documents. You will be part of a small, supportive team at our Makati office.',
            'category' => 'Administrative & Clerical',
            'location' => 'Makati City, Metro Manila',
            'work_setup' => WorkSetup::OnSite,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::OnlineOrOnSite,
            'closes_in' => 45,
        ], [
            'Wheelchair-accessible entrance' => 'Ramp at the Ayala Avenue entrance.',
            'Accessible restroom' => null,
            'Flexible hours' => 'Start any time between 7 and 10 a.m.',
            'Job coach or onboarding buddy' => null,
        ]);

        $this->post($company, $humanResources, $hrOfficer, PostingStatus::Pending, [
            'title' => 'Recruitment Coordinator',
            'description' => 'Screen applications, arrange interviews with hiring managers and keep candidates updated. You will make sure every candidate can ask for the interview accommodations they need.',
            'category' => 'Administrative & Clerical',
            'location' => 'Makati City, Metro Manila',
            'work_setup' => WorkSetup::Hybrid,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::Online,
            'closes_in' => 60,
        ], [
            'Hybrid work' => 'Office days are Tuesday and Thursday.',
            'Written or captioned meetings' => null,
            'Screen-reader-compatible work tools' => null,
        ]);

        $this->post($company, $it, $owner, PostingStatus::Open, [
            'title' => 'Junior Web Developer',
            'description' => 'Build and maintain accessible web pages for our clients using HTML, CSS and JavaScript. A senior developer reviews your work with you every week.',
            'category' => 'Information Technology',
            'location' => 'Anywhere in the Philippines',
            'work_setup' => WorkSetup::Remote,
            'employment_type' => EmploymentType::FullTime,
            'interview_format' => InterviewFormat::Online,
            'closes_in' => 30,
        ], [
            'Remote work' => 'Laptop and internet allowance provided.',
            'Flexible hours' => null,
            'Screen reader software provided' => 'NVDA is installed on the company laptop.',
            'Written or captioned meetings' => null,
        ]);

        // A draft saved before it was finished: no types, closing date or accommodations yet.
        $this->post($company, $it, $owner, PostingStatus::Draft, [
            'title' => 'IT Support Specialist',
            'description' => 'Set up laptops, help colleagues with software and printer problems, and keep the office network running. Most requests come through our help desk chat.',
            'category' => 'Information Technology',
            'location' => 'Makati City, Metro Manila',
            'work_setup' => WorkSetup::OnSite,
        ], []);
    }

    /**
     * Skipped (with a warning) when its category no longer exists, for example after an admin renamed it.
     *
     * @param  array<string, mixed>  $fields  Posting fields, plus `category` (a name) and `closes_in` (days, may be negative).
     * @param  array<string, ?string>  $accommodations  Accommodation name => note.
     */
    private function post(Employer $employer, ?Department $department, User $author, PostingStatus $status, array $fields, array $accommodations): void
    {
        $category = Category::firstWhere('name', $fields['category']);
        if (! $category) {
            $this->command?->warn("  Demo posting skipped, category not found: {$fields['title']}");

            return;
        }

        $posting = new JobPosting;
        $posting->fill([
            ...collect($fields)->except(['category', 'closes_in'])->all(),
            'category_id' => $category->id,
            'closes_on' => isset($fields['closes_in'])
                ? CarbonImmutable::parse(JobPosting::today())->addDays($fields['closes_in'])->toDateString()
                : null,
        ])->forceFill([
            'employer_id' => $employer->id,
            'department_id' => $department?->id,
            'created_by' => $author->id,
            'status' => $status,
            'submitted_at' => $status === PostingStatus::Draft ? null : now(),
            'approved_at' => in_array($status, [PostingStatus::Open, PostingStatus::Closed], true) ? now() : null,
        ])->save();

        $ids = Accommodation::whereIn('name', array_keys($accommodations))->pluck('id', 'name');
        $posting->accommodations()->sync(
            collect($accommodations)
                ->filter(fn ($note, $name) => $ids->has($name))
                ->mapWithKeys(fn ($note, $name) => [$ids[$name] => ['note' => $note]])
                ->all(),
        );
    }

    /**
     * @param  list<string>  $titles
     */
    private function hasAnyTitled(Employer $employer, array $titles): bool
    {
        return JobPosting::withTrashed()->where('employer_id', $employer->id)->whereIn('title', $titles)->exists();
    }

    private function hasNoPostings(Employer $employer): bool
    {
        return ! JobPosting::withTrashed()->where('employer_id', $employer->id)->exists();
    }
}
