import PageShell from "@/app/components/PageShell";
import RemindersSettingsPanel from "@/app/components/RemindersSettingsPanel";
import ThemeSettingsPanel from "@/app/components/theme/ThemeSettingsPanel";

export default function SettingsPage() {
  return (
    <PageShell
      title="Pengaturan"
      description="Saya memilih ritme warna yang membuat saya stabil."
    >
      <div className="space-y-8">
        <ThemeSettingsPanel />
        <RemindersSettingsPanel />
      </div>
    </PageShell>
  );
}
