export type DuaTemplate = {
  id: string;
  title: string;
  text: string;
  tags: string[];
};

export const duaTemplates: DuaTemplate[] = [
  {
    id: "capek-1",
    title: "Saya capek, minta ditopang",
    text: "Ya Allah, aku capek. Tolong kuatkan aku untuk pegang yang wajib.",
    tags: ["capek"],
  },
  {
    id: "capek-2",
    title: "Saya lemah, mohon jaga",
    text: "Ya Allah, aku lemah. Jagalah aku supaya tidak jatuh lagi.",
    tags: ["capek"],
  },
  {
    id: "capek-3",
    title: "Saya butuh tenang",
    text: "Ya Allah, tenangkan dadaku. Bimbing langkah kecilku hari ini.",
    tags: ["capek"],
  },
  {
    id: "capek-4",
    title: "Saya minta dituntun",
    text: "Ya Allah, tuntun aku pelan. Aku hanya ingin tetap tersambung.",
    tags: ["capek"],
  },
  {
    id: "ampun-1",
    title: "Minta ampun, balik pelan",
    text: "Ya Allah, ampuni aku. Aku ingin kembali pelan tanpa pura-pura.",
    tags: ["ampun"],
  },
  {
    id: "ampun-2",
    title: "Jangan jauhkan saya",
    text: "Ya Allah, jangan biarkan aku jauh meski aku lemah.",
    tags: ["ampun"],
  },
  {
    id: "ampun-3",
    title: "Bersihkan hati",
    text: "Ya Allah, bersihkan hatiku. Aku ingin lebih jujur dan tenang.",
    tags: ["ampun"],
  },
  {
    id: "ampun-4",
    title: "Maaf atas lalai",
    text: "Ya Allah, maafkan kelalaianku. Aku mulai lagi dari yang kecil.",
    tags: ["ampun"],
  },
  {
    id: "rezeki-1",
    title: "Minta rezeki cukup",
    text: "Ya Allah, cukupkan rezeki kami. Tenangkan rumah kami.",
    tags: ["rezeki"],
  },
  {
    id: "rezeki-2",
    title: "Lindungi keluarga",
    text: "Ya Allah, jaga keluargaku. Jadikan kami saling menguatkan.",
    tags: ["rezeki"],
  },
  {
    id: "rezeki-3",
    title: "Ringankan beban",
    text: "Ya Allah, ringankan beban kami. Beri jalan yang baik dan bersih.",
    tags: ["rezeki"],
  },
  {
    id: "rezeki-4",
    title: "Beri ketenangan",
    text: "Ya Allah, beri ketenangan untuk kami. Cukupkan yang dibutuhkan.",
    tags: ["rezeki"],
  },
];
