import { redirect } from 'next/navigation';

// No auth system — redirect settings to pricing
export default function SettingsPage() {
  redirect('/pricing');
}
