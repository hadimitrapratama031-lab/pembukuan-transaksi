// ============================================================
// Edge Function: request-build
// ============================================================
// Dipanggil dari app (brand-setup.tsx) setelah user simpan nama
// usaha & logo. Fungsi ini:
//   1. Catat baris baru di tabel build_requests (status: pending)
//   2. Trigger workflow GitHub Actions lewat "repository_dispatch"
//      API, kirim app_name + logo_url sebagai payload
//   3. GitHub Actions yang nanti benar-benar jalanin `eas build`
//
// Kenapa lewat GitHub Actions, bukan langsung panggil EAS di sini?
// Karena EAS Build cuma bisa ditrigger pakai `eas-cli` (butuh
// environment Node lengkap), dan Edge Function (Deno) tidak bisa
// menjalankan eas-cli. GitHub Actions runner punya environment itu.
//
// ENV SECRETS yang WAJIB diisi di Supabase Dashboard
// (Project Settings > Edge Functions > Secrets):
//   GITHUB_TOKEN        -> Personal Access Token GitHub (scope: repo, workflow)
//   GITHUB_REPO         -> contoh: "namakamu/nama-repo"
//   SUPABASE_URL        -> otomatis tersedia
//   SUPABASE_SERVICE_ROLE_KEY -> dari Project Settings > API
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pastikan yang manggil ini beneran user yang sudah login
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Tidak terautentikasi' }), { status: 401 });
    }

    const body = await req.json();
    const appName: string = (body.app_name || '').trim();
    const logoUrl: string | null = body.logo_url || null; // public URL dari Supabase Storage

    if (!appName) {
      return new Response(JSON.stringify({ error: 'Nama aplikasi wajib diisi' }), { status: 400 });
    }

    // Pakai service_role supaya bisa insert & nanti update tabel build_requests
    // bebas dari batasan RLS user biasa
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: buildRow, error: insertErr } = await supabaseAdmin
      .from('build_requests')
      .insert({
        user_id: user.id,
        app_name: appName,
        logo_storage_path: logoUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr || !buildRow) {
      throw new Error(insertErr?.message || 'Gagal mencatat build request');
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    const githubToken = Deno.env.get('GITHUB_TOKEN')!;
    const githubRepo = Deno.env.get('GITHUB_REPO')!; // format: "owner/repo"

    const ghRes = await fetch(`https://api.github.com/repos/${githubRepo}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: 'custom-build',
        client_payload: {
          build_request_id: buildRow.id,
          app_name: appName,
          logo_url: logoUrl,
        },
      }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      // Tetap simpan status failed supaya user tahu, bukan didiamkan
      await supabaseAdmin
        .from('build_requests')
        .update({ status: 'failed', error_message: `Gagal trigger GitHub Actions: ${errText}` })
        .eq('id', buildRow.id);
      throw new Error(`Gagal trigger build: ${errText}`);
    }

    await supabaseAdmin
      .from('build_requests')
      .update({ status: 'building' })
      .eq('id', buildRow.id);

    return new Response(JSON.stringify({ ok: true, build_request_id: buildRow.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Terjadi kesalahan' }), { status: 500 });
  }
});
