<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AddAdminRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\AdminUserDetailResource;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\AccountService;
use App\Services\EmailVerification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Every account, one account's page, editing it, and adding an administrator (plan PHASE_6 §4.1,
 * F10.1; ADMIN_USERS_PLAN).
 */
class UserController extends Controller
{
    public const PER_PAGE = 20;

    /**
     * Newest first, 20 a page; `q` matches name or email; filters `role` and `status`.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(Role::class)],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim($filters['q'] ?? '');

        $users = User::with(AdminUserResource::RELATIONS)
            ->when($search !== '', function (Builder $query) use ($search) {
                // %, _ and ! are plain characters (escaped with ! so SQLite and MariaDB agree).
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
                $query->where(fn (Builder $query) => $query
                    ->whereRaw("name LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("email LIKE ? ESCAPE '!'", [$pattern]));
            })
            ->when(isset($filters['role']), fn (Builder $query) => $query->where('role', $filters['role']))
            ->when(isset($filters['status']), fn (Builder $query) => $query->where('is_active', $filters['status'] === 'active'))
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return AdminUserResource::collection($users);
    }

    public function show(User $user): AdminUserDetailResource
    {
        return new AdminUserDetailResource($user->load(AdminUserResource::RELATIONS));
    }

    /**
     * Correct a name or email, with a reason (ADMIN_USERS_PLAN U2–U4). A new email gets a fresh
     * confirmation link; a mail outage doesn't undo the change (they can ask for a new link).
     */
    public function update(UpdateUserRequest $request, User $user, AccountService $accounts, EmailVerification $verification): AdminUserDetailResource
    {
        $emailChanged = $accounts->updateDetails(
            $user,
            $request->user(),
            $request->validated('name'),
            $request->validated('email'),
            $request->validated('reason'),
        );
        $user->refresh();

        if ($emailChanged && $user->role !== Role::Admin) {
            $verification->send($user);
        }

        return new AdminUserDetailResource($user->load(AdminUserResource::RELATIONS));
    }

    /**
     * A new temporary password for an administrator who lost theirs (review WR-05), shown once.
     */
    public function temporaryPassword(Request $request, User $user, AccountService $accounts): AdminUserDetailResource
    {
        $password = $accounts->replaceTemporaryPassword($user, $request->user());

        return (new AdminUserDetailResource($user->refresh()->load(AdminUserResource::RELATIONS)))
            ->additional(['temporary_password' => $password]);
    }

    /**
     * Add an administrator. The temporary password is in this response only (Q4).
     */
    public function store(AddAdminRequest $request, AccountService $accounts): JsonResponse
    {
        [$user, $password] = $accounts->createAdmin(
            $request->validated('name'),
            $request->validated('email'),
            $request->user(),
        );

        return (new AdminUserDetailResource($user->load(AdminUserResource::RELATIONS)))
            ->additional(['temporary_password' => $password])
            ->response()
            ->setStatusCode(201);
    }
}
