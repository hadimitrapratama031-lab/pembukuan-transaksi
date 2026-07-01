// Supabase Edge Function: admin-users
// Deploy: supabase functions deploy admin-users
// Fungsi ini memakai SERVICE ROLE KEY (rahasia, hanya hidup di server Supabase,
// TIDAK PERNAH dikirim ke aplikasi). Dipakai supaya akun admin bisa membuat
// akun staff baru langsung dari dalam app, tanpa buka dashboard Supabase.

// @ts-ignore - Deno runtime (bukan Node), import ini valid saat dideploy ke Supabase
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Tidak ada token. Silakan login ulang.');

    // Client dengan token milik pemanggil → dipakai untuk verifikasi siapa yang request
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) throw new Error('Sesi tidak valid. Silakan login ulang.');

    // Client admin (service role) → dipakai untuk operasi sensitif
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Pastikan pemanggil benar-benar admin
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin') {
      throw new Error('Hanya admin yang boleh mengelola akun.');
    }

    const body = await req.json();
    const action = body.action;

    if (action === 'list') {
      const { data, error } = await admin
        .from('profiles')
        .select('id, nama, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Tambahkan email dari auth.users
      const { data: usersList } = await admin.auth.admin.listUsers();
      const withEmail = (data || []).map((p: any) => ({
        ...p,
        email: usersList?.users?.find((u: any) => u.id === p.id)?.email || '',
      }));

      return new Response(JSON.stringify({ users: withEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      const { nama, email, password } = body;
      if (!nama || !email || !password) throw new Error('Nama, email, dan password wajib diisi.');
      if (password.length < 6) throw new Error('Password minimal 6 karakter.');

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { nama },
      });
      if (createErr) throw createErr;

      // Trigger handle_new_user sudah otomatis buat row di profiles & pengaturan.
      // Set role jadi 'staff' (bukan admin) + catat siapa yang membuat.
      await admin.from('profiles').update({ role: 'staff', created_by: caller.id, nama }).eq('id', created.user!.id);

      return new Response(JSON.stringify({ success: true, userId: created.user!.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { userId } = body;
      if (!userId) throw new Error('userId wajib diisi.');
      if (userId === caller.id) throw new Error('Tidak bisa menghapus akun sendiri.');
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Aksi tidak dikenal.');
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
