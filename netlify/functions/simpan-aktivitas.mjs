const base=()=>process.env.SUPABASE_URL?.replace(/\/$/,"");
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,"Content-Type":"application/json"});
export default async (req)=>{
 if(req.method!=="POST")return Response.json({success:false,message:"Gunakan POST."},{status:405});
 if(!base()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({success:false,message:"Konfigurasi Supabase belum lengkap."},{status:500});
 let activityId=null;
 try{
  const d=await req.json();
  if(!d.siswa_id||d.jenis_aktivitas!=="drill"||!d.level||!d.kode_latihan||!Number.isInteger(Number(d.jumlah_soal))||!Array.isArray(d.answers))
   return Response.json({success:false,message:"Data aktivitas tidak lengkap atau tidak sesuai."},{status:400});
  if(!["dasar","menengah","lanjutan"].includes(d.level)||d.answers.length>20)return Response.json({success:false,message:"Level atau jumlah jawaban tidak valid."},{status:400});
  const score=Math.max(0,Math.min(100,Number(d.nilai)||0));
  const parent={siswa_id:d.siswa_id,jenis_aktivitas:"drill",level:d.level,kode_latihan:String(d.kode_latihan),percobaan_ke:Math.max(1,Number(d.percobaan_ke)||1),jumlah_soal:Number(d.jumlah_soal),jumlah_benar:Math.max(0,Number(d.jumlah_benar)||0),jumlah_salah:Math.max(0,Number(d.jumlah_salah)||0),nilai:score,durasi_detik:Math.max(0,Number(d.durasi_detik)||0),status_lulus:score>=70,waktu_mulai:d.waktu_mulai||null,waktu_selesai:d.waktu_selesai||new Date().toISOString()};
  const p=await fetch(`${base()}/rest/v1/hasil_aktivitas`,{method:"POST",headers:{...headers(),Prefer:"return=representation"},body:JSON.stringify([parent])});
  const pData=await p.json();if(!p.ok)return Response.json({success:false,message:"Gagal menyimpan ringkasan latihan.",detail:pData},{status:p.status});
  activityId=pData[0].id;
  const details=d.answers.map((x,i)=>({aktivitas_id:activityId,nomor_soal:Number(x.nomor_soal)||i+1,kode_soal:x.kode_soal||`${d.kode_latihan}-${i+1}`,jenis_soal:x.jenis_soal||"campuran",pertanyaan:String(x.pertanyaan||""),jawaban_siswa:String(x.jawaban_siswa??""),kunci_jawaban:String(x.kunci_jawaban??""),status_benar:Boolean(x.status_benar),durasi_detik:Math.max(0,Number(x.durasi_detik)||0),kategori_kesalahan:x.kategori_kesalahan||null}));
  if(details.length){const dr=await fetch(`${base()}/rest/v1/detail_jawaban`,{method:"POST",headers:{...headers(),Prefer:"return=representation"},body:JSON.stringify(details)});const dd=await dr.json();if(!dr.ok){await fetch(`${base()}/rest/v1/hasil_aktivitas?id=eq.${activityId}`,{method:"DELETE",headers:headers()});return Response.json({success:false,message:"Ringkasan tersimpan tetapi detail jawaban gagal. Data ringkasan dibatalkan.",detail:dd},{status:dr.status});}}
  return Response.json({success:true,message:"Hasil latihan dan detail jawaban berhasil disimpan.",aktivitas:pData[0]});
 }catch(e){if(activityId)await fetch(`${base()}/rest/v1/hasil_aktivitas?id=eq.${activityId}`,{method:"DELETE",headers:headers()}).catch(()=>{});return Response.json({success:false,message:e.message},{status:500});}
};
