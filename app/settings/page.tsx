import PageShell from "@/app/components/PageShell";
import ThemeSettingsPanel from "@/app/components/theme/ThemeSettingsPanel";

export default function SettingsPage() {
  return (
    <PageShell
      title="Pengaturan"
      description="Saya memilih ritme warna yang membuat saya stabil."
    >
      <ThemeSettingsPanel />
    </PageShell>
  );
}
