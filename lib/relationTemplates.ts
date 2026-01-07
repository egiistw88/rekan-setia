export type RelationTemplate = {
  id: string;
  title: string;
  text: string;
  tags: string[];
};

export const relationTemplates: RelationTemplate[] = [
  {
    id: "hadir-1",
    title: "Saya capek tapi hadir",
    text: "Saya capek hari ini, tapi saya tetap mau hadir sebentar sama kamu.",
    tags: ["hadir", "capek"],
  },
  {
    id: "hadir-2",
    title: "Tetap ada",
    text: "Saya lagi berat, tapi saya tetap ada di sini buat kamu.",
    tags: ["hadir", "ringan"],
  },
  {
    id: "hadir-3",
    title: "Bukan sempurna",
    text: "Saya tidak sempurna hari ini, tapi saya pilih untuk tetap hadir.",
    tags: ["hadir", "stabil"],
  },
  {
    id: "maaf-1",
    title: "Minta maaf",
    text: "Maaf kalau saya kebawa emosi. Saya sedang belajar menahan diri.",
    tags: ["maaf"],
  },
  {
    id: "maaf-2",
    title: "Nada tinggi",
    text: "Maaf tadi suara saya tinggi. Saya tidak mau melukai kamu.",
    tags: ["maaf"],
  },
  {
    id: "maaf-3",
    title: "Salah langkah",
    text: "Maaf saya salah langkah. Saya ingin perbaiki pelan-pelan.",
    tags: ["maaf"],
  },
  {
    id: "apresiasi-1",
    title: "Terima kasih",
    text: "Terima kasih sudah bertahan sama saya. Saya lihat capekmu.",
    tags: ["apresiasi"],
  },
  {
    id: "apresiasi-2",
    title: "Saya lihat usaha",
    text: "Saya lihat usaha kamu hari ini, itu berarti buat saya.",
    tags: ["apresiasi"],
  },
  {
    id: "apresiasi-3",
    title: "Saya hargai",
    text: "Saya hargai caramu menjaga rumah dan hati saya.",
    tags: ["apresiasi"],
  },
  {
    id: "bantuan-1",
    title: "Minta bantuan kecil",
    text: "Besok saya butuh bantuan kecil ini ya, supaya tidak kewalahan.",
    tags: ["bantuan", "koordinasi"],
  },
  {
    id: "bantuan-2",
    title: "Bagi tugas",
    text: "Besok kita bagi tugas sebentar ya, saya tidak mau kamu menanggung sendiri.",
    tags: ["bantuan", "koordinasi"],
  },
  {
    id: "bantuan-3",
    title: "Rencana besok",
    text: "Besok saya butuh kamu ingatkan satu hal ini, supaya rapi.",
    tags: ["bantuan", "rencana"],
  },
];
