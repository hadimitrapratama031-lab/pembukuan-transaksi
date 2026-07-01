// ============================================================
// Edge Function: build-webhook
// ============================================================
// Endpoint ini didaftarkan sebagai EAS Webhook (lewat `eas webhook:create`,
// event BUILD). Setiap kali build EAS selesai (sukses/gagal), EAS akan
// POST ke sini. Fungsi ini mencocokkan build ke baris build_requests
// (berdasarkan eas_build_id yang disimpan GitHub Actions saat trigger
// build), lalu update status + link APK-nya.
//
// ENV SECRETS yang WAJIB diisi:
//   EAS_WEBHOOK_SECRET        -> secret yang sama persis dipakai saat
//                                `eas webhook:create --secret ...`
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Cara daftarin webhook (sekali saja, dari terminal project):
//   eas webhook:create --event BUILD \
//     --url https://<project-ref>.supabase.co/functions/v1/build-webhook \
//     --secret <secret-acak-kamu>
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { crypto } from 'jsr:@std/crypto';

async function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computed = 'sha1=' + Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  return computed === signatureHeader;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('expo-signature');
  const secret = Deno.env.get('EAS_WEBHOOK_SECRET')!;

  const valid = await verifySignature(rawBody, signature, secret);
  if (!valid) {
    return new Response('Signature tidak valid', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  // Struktur payload EAS webhook (ringkas): { id, status, artifacts: { buildUrl }, platform, ... }
  const easBuildId: string = payload.id;
  const status: string = payload.status; // "finished" | "errored" | ...
  const artifactUrl: string | null = payload?.artifacts?.buildUrl || null;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const newStatus = status === 'finished' ? 'ready' : (status === 'errored' ? 'failed' : 'building');

  const { error } = await supabaseAdmin
    .from('build_requests')
    .update({
      status: newStatus,
      apk_url: artifactUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('eas_build_id', easBuildId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
