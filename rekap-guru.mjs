const base=()=>process.env.SUPABASE_URL?.replace(/\/$/,"");
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`});
export default async(req)=>{
 if(req.method!=="GET")return Response.json({success:false,message:"Gunakan GET."},{status:405});
 if(!process.env.TEACHER_DASHBOARD_PIN)return Response.json({success:false,message:"TEACHER_DASHBOARD_PIN belum diatur di Netlify."},{status:500});
 if(req.headers.get("x-teacher-pin")!==process.env.TEACHER_DASHBOARD_PIN)return Response.json({success:false,message:"PIN guru tidak sesuai."},{status:401});
 if(!base()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({success:false,message:"Konfigurasi Supabase belum lengkap."},{status:500});
 try{
  const paths=[
   `/rest/v1/data_siswa?select=id,kode_siswa,nama_siswa,kelas,created_at&order=nama_siswa.asc`,
   `/rest/v1/hasil_aktivitas?select=*,data_siswa(nama_siswa,kode_siswa,kelas)&order=created_at.desc`,
   `/rest/v1/tes_hasil_belajar?select=*&order=tanggal_tes.desc`,
   `/rest/v1/detail_jawaban?select=nomor_soal,status_benar,kategori_kesalahan,aktivitas_id`
  ];
  const responses=await Promise.all(paths.map(p=>fetch(base()+p,{headers:headers()})));
  const values=await Promise.all(responses.map(r=>r.json()));
  const bad=responses.findIndex(r=>!r.ok);if(bad>=0)return Response.json({success:false,message:"Gagal mengambil data dashboard.",detail:values[bad]},{status:500});
  return Response.json({success:true,siswa:values[0],aktivitas:values[1],tes:values[2],detail:values[3]});
 }catch(e){return Response.json({success:false,message:e.message},{status:500});}
};
