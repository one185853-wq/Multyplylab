const base=()=>process.env.SUPABASE_URL?.replace(/\/$/,"");
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,"Content-Type":"application/json"});
export default async(req)=>{
 if(req.method!=="POST")return Response.json({success:false,message:"Gunakan POST."},{status:405});
 if(!base()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({success:false,message:"Konfigurasi Supabase belum lengkap."},{status:500});
 try{
  const d=await req.json();
  if(!d.siswa_id||!['pretest','posttest'].includes(d.jenis_tes)||!Number.isInteger(Number(d.jumlah_soal))||!Number.isFinite(Number(d.nilai)))return Response.json({success:false,message:"Data tes tidak lengkap atau tidak valid."},{status:400});
  const body={siswa_id:d.siswa_id,jenis_tes:d.jenis_tes,jumlah_soal:Number(d.jumlah_soal),jumlah_benar:Number(d.jumlah_benar)||0,jumlah_salah:Number(d.jumlah_salah)||0,nilai:Math.max(0,Math.min(100,Number(d.nilai))),durasi_detik:Math.max(0,Number(d.durasi_detik)||0),tanggal_tes:d.tanggal_tes||new Date().toISOString()};
  const r=await fetch(`${base()}/rest/v1/tes_hasil_belajar?on_conflict=siswa_id,jenis_tes`,{method:"POST",headers:{...headers(),Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify([body])});
  const data=await r.json();if(!r.ok)return Response.json({success:false,message:"Gagal menyimpan hasil tes.",detail:data},{status:r.status});
  return Response.json({success:true,message:"Hasil tes berhasil disimpan.",data:data[0]});
 }catch(e){return Response.json({success:false,message:e.message},{status:500});}
};
