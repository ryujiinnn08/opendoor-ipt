<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'consented_at',
    ];

    /**
     * Defaults that mirror the database, so new models report them before being reloaded.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'is_active' => 'boolean',
            'consented_at' => 'datetime',
        ];
    }

    public function hasRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Whether this user is the owner of the given employer (company or individual profile).
     */
    public function ownsEmployer(int $employerId): bool
    {
        $membership = $this->membership;

        return $membership !== null && $membership->isOwner() && $membership->employer_id === $employerId;
    }

    /**
     * The employer this user belongs to (as owner or HR officer), if any.
     */
    public function membership(): HasOne
    {
        return $this->hasOne(EmployerMember::class);
    }

    /**
     * A job seeker's application profile (Phase 3B); null until they first save it.
     */
    public function candidateProfile(): HasOne
    {
        return $this->hasOne(CandidateProfile::class);
    }

    public function experiences(): HasMany
    {
        return $this->hasMany(CandidateExperience::class)->orderBy('position');
    }

    public function educations(): HasMany
    {
        return $this->hasMany(CandidateEducation::class)->orderBy('position');
    }

    /**
     * A job seeker's applications (Phase 4).
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * The accommodations this job seeker needs (Phase 3B). Retired ones stay until removed.
     */
    public function needs(): BelongsToMany
    {
        return $this->belongsToMany(Accommodation::class, 'candidate_accommodation')->withTimestamps();
    }
}
