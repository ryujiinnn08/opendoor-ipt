<?php

namespace App\Http\Resources;

use App\Models\Employer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An employer's public page. Never the registration details, team members or email addresses.
 *
 * @mixin Employer
 */
class PublicEmployerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'name' => $this->name,
            'industry' => $this->industry,
            'address' => $this->address,
            'description' => $this->description,
            'logo_url' => $this->logoUrl(),
            'is_verified' => $this->isVerified(),
        ];
    }
}
