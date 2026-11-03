<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    public static function ok(string $message, mixed $data = null, array $warnings = []): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'warnings' => $warnings,
        ]);
    }

    public static function fail(string $message, array $warnings = [], int $status = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'warnings' => $warnings,
        ], $status);
    }
}