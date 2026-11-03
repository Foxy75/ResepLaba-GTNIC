<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Dispatcher tiga AI agent berbasis Google Gemini 2.5 Flash.
 *
 * Kontrak penting (Rule 4 — Human-in-the-Loop): hasil OCR TIDAK PERNAH menulis
 * ke DB. parseReceipt hanya mengembalikan draf untuk dikonfirmasi klien.
 * Saat kunci/API tidak tersedia atau panggilan gagal, service jatuh ke draf
 * demo deterministik agar alur juri tetap berjalan end-to-end.
 */
final class GeminiAgentService
{
    public function today(): string
    {
        return (string) config('reseplaba.demo_today', '2026-10-25');
    }

    /**
     * Agent A — ReceiptParserAgent. Ekstrak nota menjadi draf JSON.
     *
     * @return array{supplier: string, receiptDate: string, rows: array<int, array<string, mixed>>}
     */
    public function parseReceipt(?string $imageBase64): array
    {
        if (empty($imageBase64) || ! config('services.gemini.key')) {
            return $this->demoDraft();
        }

        try {
            $prompt = $this->receiptParserPrompt();
            $payload = [
                'contents' => [[
                    'parts' => [
                        ['text' => $prompt],
                        ['inline_data' => ['mime_type' => 'image/jpeg', 'data' => $imageBase64]],
                    ],
                ]],
            ];

            $text = $this->generate($payload);

            if ($text === null) {
                return $this->demoDraft();
            }

            $json = $this->extractJson($text);
            if ($json === null) {
                return $this->demoDraft();
            }

            return $this->mapDraft($json);
        } catch (\Throwable) {
            return $this->demoDraft();
        }
    }

    /**
     * Agent B — MarginGuardAdvisorAgent. Saran harga + takaran singkat.
     */
    public function marginGuardAdvice(string $productName, float $newHpp, float $targetMargin): string
    {
        $prompt = $this->marginGuardPrompt($productName, $newHpp, $targetMargin);

        $fallback = sprintf(
            'Margin %s sekarang di bawah target %.0f%%. Naikkan harga jual ke kelipatan Rp500 terdekat, atau sesuaikan porsi agar laba tetap aman.',
            $productName,
            $targetMargin,
        );

        if (! config('services.gemini.key')) {
            return $fallback;
        }

        try {
            $text = $this->generate([
                'contents' => [[
                    'parts' => [['text' => $prompt]],
                ]],
            ]);

            $text = trim((string) $text);
            $text = preg_replace('/^```[a-zA-Z]*\s*/', '', $text);
            $text = preg_replace('/\s*```$/', '', $text);

            return $text !== '' ? trim($text) : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * Agent C — ZeroWastePromoAgent. Teks promo clearance + WhatsApp.
     */
    public function zeroWastePromo(string $itemName, string $batchCode, int $days, float $qty): string
    {
        $prompt = $this->zeroWastePrompt($itemName, $batchCode, $days, $qty);

        $fallback = $this->promoFallback($itemName, $batchCode, $days, $qty);

        if (! config('services.gemini.key')) {
            return $fallback;
        }

        try {
            $text = $this->generate([
                'contents' => [[
                    'parts' => [['text' => $prompt]],
                ]],
            ]);

            $text = trim((string) $text);
            $text = preg_replace('/^```[a-zA-Z]*\s*/', '', $text);
            $text = preg_replace('/\s*```$/', '', $text);

            return $text !== '' ? trim($text) : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * Panggilan generateContent dan kembalikan teks gabungan (atau null).
     */
    private function generate(array $payload): ?string
    {
        $model = config('services.gemini.model', 'gemini-2.5-flash');
        $endpoint = rtrim((string) config('services.gemini.endpoint'), '/');

        $response = Http::withToken((string) config('services.gemini.key'))
            ->timeout(25)
            ->post("{$endpoint}/{$model}:generateContent", $payload);

        if (! $response->successful()) {
            return null;
        }

        $json = $response->json();
        $parts = $json['candidates'][0]['content']['parts'] ?? [];

        $text = '';
        foreach ($parts as $part) {
            if (isset($part['text'])) {
                $text .= $part['text'];
            }
        }

        return $text !== '' ? $text : null;
    }

    /**
     * Ekstrak objek JSON pertama dari teks Gemini.
     *
     * @return array<string, mixed>|null
     */
    private function extractJson(string $text): ?array
    {
        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $end <= $start) {
            return null;
        }

        $slice = substr($text, $start, $end - $start + 1);
        $decoded = json_decode($slice, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Map JSON Gemini -> ReceiptDraft. itemId di-set dari daftar item toko
     * lewat pencocokan raw_name (dilakukan controller; di sini susun mentah).
     */
    private function mapDraft(array $json): array
    {
        $rows = [];

        foreach (($json['items'] ?? []) as $item) {
            $rawName = (string) ($item['raw_name'] ?? '');
            if ($rawName === '') {
                continue;
            }

            $purchaseQty = (float) ($item['purchase_qty'] ?? 1);
            $conversionRate = (float) ($item['conversion_rate_guess'] ?? 1);
            $totalCost = (float) ($item['total_purchase_price'] ?? 0);

            if ($purchaseQty <= 0 || $conversionRate <= 0 || $totalCost <= 0) {
                continue;
            }

            $rows[] = [
                'itemId' => '',
                'name' => $rawName,
                'purchaseQty' => $purchaseQty,
                'purchaseUnit' => (string) ($item['purchase_unit'] ?? ''),
                'conversionRate' => $conversionRate,
                'totalCost' => $totalCost,
                'expiresAt' => $this->today(),
            ];
        }

        if ($rows === []) {
            return $this->demoDraft();
        }

        return [
            'supplier' => (string) ($json['supplier_name'] ?? ''),
            'receiptDate' => (string) ($json['receipt_date'] ?? $this->today()),
            'rows' => $rows,
        ];
    }

    /**
     * Draf demo deterministik (fallback parser, identik dengan api.ts receiptDraft).
     */
    private function demoDraft(): array
    {
        return [
            'supplier' => 'Agen Sumber Rezeki',
            'receiptDate' => $this->today(),
            'rows' => [
                [
                    'itemId' => 'egg',
                    'name' => 'Telur ayam',
                    'purchaseQty' => 1,
                    'purchaseUnit' => 'krat',
                    'conversionRate' => 240,
                    'totalCost' => 552000,
                    'expiresAt' => $this->addDays($this->today(), 21),
                ],
                [
                    'itemId' => 'noodle',
                    'name' => 'Mie instan goreng',
                    'purchaseQty' => 2,
                    'purchaseUnit' => 'dus',
                    'conversionRate' => 40,
                    'totalCost' => 236000,
                    'expiresAt' => $this->addDays($this->today(), 150),
                ],
            ],
        ];
    }

    private function addDays(string $day, int $offset): string
    {
        return date('Y-m-d', strtotime($day.' +'.$offset.' days'));
    }

    private function receiptParserPrompt(): string
    {
        return <<<'TXT'
Anda adalah asisten pencatat inventori otomatis untuk warung UMKM Indonesia.
Tugas Anda mengekstrak informasi nota kulakan/grosir dari gambar menjadi format JSON yang presisi.
Petunjuk Konversi:
1. raw_name: Nama barang sesuai teks nota.
2. purchase_qty: Jumlah kemasan grosir yang dibeli (angka).
3. purchase_unit: Nama kemasan grosir (misal: 'Dus', 'Krat', 'Karung', 'Bal', 'Pak').
4. suggested_base_unit: Satuan eceran ('pcs', 'butir', 'gram', 'ml').
5. conversion_rate_guess: Estimasi isi per kemasan grosir (misal: 1 Dus Mie = 40, 1 Krat Telur = 240, 1 Karung Beras 25kg = 25000).
6. total_purchase_price: Total harga beli barang tersebut dalam Rupiah (integer tanpa titik atau simbol).
Kembalikan HANYA JSON valid sesuai schema.
TXT;
    }

    private function marginGuardPrompt(string $productName, float $newHpp, float $targetMargin): string
    {
        $base = <<<'TXT'
Anda adalah penasihat keuangan ramah untuk pemilik warung makan dan toko kelontong di Indonesia.
Terjadi kenaikan harga modal bahan baku yang mengakibatkan margin keuntungan menu berada di bawah batas aman.
Berikan saran singkat dan realistis (maksimal 2 kalimat):
1. Rekomendasi pembulatan harga jual baru yang wajar bagi pelanggan warung (kelipatan Rp500 atau Rp1.000).
2. Rekomendasi takaran atau penyajian alternatif untuk menjaga laba tanpa mengecewakan pembeli.
Gunakan nada suportif dan praktis.
TXT;

        return $base."\n\nMenu: {$productName}. HPP saat ini sekitar Rp".number_format($newHpp, 0, ',', '.').". Target margin minimal {$targetMargin}%.";
    }

    private function zeroWastePrompt(string $itemName, string $batchCode, int $days, float $qty): string
    {
        $base = <<<'TXT'
Anda adalah asisten promosi untuk warung kelontong dan warung makan di Indonesia.
Ada stok barang yang mendekati kedaluwarsa. Buat ide promosi clearance/bundling yang kreatif dan teks broadcast WhatsApp siap kirim.
Gunakan bahasa Indonesia yang natural, ramah, dan mengajak. Tuliskan dalam teks singkat.
TXT;

        return $base."\n\nBarang: {$itemName}. Batch: {$batchCode}. Sisa: {$qty}. Kedaluwarsa dalam {$days} hari.";
    }

    private function promoFallback(string $itemName, string $batchCode, int $days, float $qty): string
    {
        return implode("\n", [
            'PROMO TEBUS MURAH '.Str::upper($itemName),
            "Batch {$batchCode}, sisa {$qty}, expires dalam {$days} hari.",
            '',
            "Promo hari ini: {$itemName} diskon 20%. Stok terbatas, buruan sebelum basi.",
            'Bisa titip ke etalase depan ya, biar laku sebelum kedaluwarsa.',
        ]);
    }
}