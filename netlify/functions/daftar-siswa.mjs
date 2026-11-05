const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json"
});
const base = () => process.env.SUPABASE_URL?.replace(/\/$/, "");

export default async (req) => {
  if (req.method !== "POST") return Response.json({ success:false, message:"Gunakan POST." }, { status:405 });
  if (!base() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ success:false, message:"Konfigurasi Supabase di Netlify belum lengkap." }, { status:500 });
  try {
    const { kode_siswa, nama_siswa, kelas="VII" } = await req.json();
    if (!kode_siswa || !nama_siswa || String(kode_siswa).trim().length > 30 || String(nama_siswa).trim().length > 50)
      return Response.json({ success:false, message:"Kode siswa dan nama wajib diisi (maksimal 30 dan 50 karakter)." }, { status:400 });
    const code=String(kode_siswa).trim(), name=String(nama_siswa).trim();
    // Kode siswa harus dibagikan guru. Nama yang sudah terdaftar tidak dapat ditimpa dari layar siswa.
    const lookup=await fetch(`${base()}/rest/v1/data_siswa?select=id,kode_siswa,nama_siswa,kelas&kode_siswa=eq.${encodeURIComponent(code)}&limit=1`,{headers:headers()});
    const found=await lookup.json();
    if(!lookup.ok)return Response.json({success:false,message:"Gagal memeriksa identitas siswa.",detail:found},{status:lookup.status});
    let siswa;
    if(found.length){
      siswa=found[0];
      if(siswa.nama_siswa.trim().toLocaleLowerCase("id-ID")!==name.toLocaleLowerCase("id-ID"))
        return Response.json({success:false,message:"Nama tidak cocok dengan kode siswa. Periksa kembali data dari guru."},{status:409});
    } else {
      const insert=await fetch(`${base()}/rest/v1/data_siswa`,{method:"POST",headers:{...headers(),Prefer:"return=representation"},body:JSON.stringify([{kode_siswa:code,nama_siswa:name,kelas:String(kelas).trim()}])});
      const rows=await insert.json();
      if(!insert.ok)return Response.json({success:false,message:"Gagal mendaftarkan siswa.",detail:rows},{status:insert.status});
      siswa=rows[0];
    }
    const [aRes,tRes]=await Promise.all([
      fetch(`${base()}/rest/v1/hasil_aktivitas?select=*&siswa_id=eq.${siswa.id}&order=created_at.asc`,{headers:headers()}),
      fetch(`${base()}/rest/v1/tes_hasil_belajar?select=*&siswa_id=eq.${siswa.id}`,{headers:headers()})
    ]);
    const aktivitas=await aRes.json(), tes=await tRes.json();
    if(!aRes.ok||!tRes.ok) return Response.json({success:false,message:"Identitas tersimpan, tetapi riwayat siswa gagal dibaca.",detail:{aktivitas,tes}},{status:500});
    return Response.json({success:true,siswa,aktivitas,tes});
  } catch(e) { return Response.json({success:false,message:e.message},{status:500}); }
};
