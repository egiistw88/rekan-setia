export type CareerTemplate = {
  id: string;
  title: string;
  text: string;
  tags: string[];
};

export const careerTemplates: CareerTemplate[] = [
  {
    id: "pembuka-1",
    title: "Pembuka ringan",
    text: "Halo {nama}, saya lihat {bisnis} kamu. Saya {nama}, lagi bantu {jasa} yang rapi dan simpel.",
    tags: ["pembuka"],
  },
  {
    id: "pembuka-2",
    title: "Sapa singkat",
    text: "Halo {nama}, saya tertarik sama {bisnis} kamu. Saya bisa bantu {jasa} yang tenang dan jelas.",
    tags: ["pembuka"],
  },
  {
    id: "pembuka-3",
    title: "Masuk pelan",
    text: "Hai {nama}, saya senang lihat {bisnis} kamu. Saya biasa bantu {jasa} untuk UMKM.",
    tags: ["pembuka"],
  },
  {
    id: "offer-1",
    title: "Offer + contoh",
    text: "Kalau berkenan, saya bisa bantu {jasa}. {contoh}",
    tags: ["offer"],
  },
  {
    id: "offer-2",
    title: "Offer jelas",
    text: "Saya bisa bantu {jasa} yang rapi dan konsisten. {contoh}",
    tags: ["offer"],
  },
  {
    id: "offer-3",
    title: "Offer ringan",
    text: "Kalau kamu butuh {jasa} sederhana, saya siap bantu. {contoh}",
    tags: ["offer"],
  },
  {
    id: "followup-1",
    title: "Follow up halus",
    text: "Halo {nama}, saya follow up ya. Kalau kamu mau lihat contoh {jasa}, saya bisa kirim.",
    tags: ["followup"],
  },
  {
    id: "followup-2",
    title: "Follow up singkat",
    text: "Hai {nama}, saya ingat pesan saya kemarin. Jika belum pas, gapapa. Saya bisa bantu kapan saja.",
    tags: ["followup"],
  },
  {
    id: "respon-1",
    title: "Jika ditolak",
    text: "Terima kasih sudah respon ya, {nama}. Kalau nanti butuh {jasa}, saya tetap siap bantu.",
    tags: ["respon"],
  },
  {
    id: "respon-2",
    title: "Tidak dibalas",
    text: "Halo {nama}, saya coba sekali lagi. Kalau belum perlu, tidak apa-apa. Semoga harinya lancar.",
    tags: ["respon"],
  },
];
