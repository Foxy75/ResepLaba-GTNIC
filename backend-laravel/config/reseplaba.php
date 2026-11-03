<?php

return [

    /*
    |--------------------------------------------------------------------------
    | ResepLaba Sandbox Configuration
    |--------------------------------------------------------------------------
    |
    | The judge sandbox is deterministic. All FEFO/expiry/series logic is
    | evaluated relative to a frozen "demo today" matching the frontend mock
    | (src/lib/domain.ts DEMO_TODAY), not the wall clock. This keeps the
    | pre-seeded batch dates, expiry chips, and 7-day profit series stable
    | regardless of when the judge runs the evaluation.
    |
    */

    'demo_today' => env('RESEPLABA_DEMO_TODAY', '2026-10-25'),

    'demo_pin' => env('RESEPLABA_DEMO_PIN', '1234'),

    'cron_secret' => env('DAILY_EXPIRY_CRON_SECRET', 'reseplaba-2026'),

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'endpoint' => env('GEMINI_ENDPOINT', 'https://generativelanguage.googleapis.com/v1beta/models'),
    ],

];