'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, Button, Input } from '../_components/ui';
import { settingsApi, getFirstCompany } from '../../lib/portalApi';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const companyData = await getFirstCompany();
      setCompany(companyData);
      if (companyData) {
        try {
          const settingsData = await settingsApi.get(companyData.id);
          setSettings(settingsData);
        } catch {
          // Settings might not exist yet
          setSettings(null);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(section: string, data: any) {
    if (!company) return;
    setSaving((prev) => ({ ...prev, [section]: true }));
    try {
      if (settings) {
        await settingsApi.update(company.id, data);
      } else {
        await settingsApi.create({
          ...data,
          company: { connect: { id: company.id } },
        });
      }
      router.refresh();
      loadData();
    } catch (error) {
      console.error(`Failed to save ${section}:`, error);
    } finally {
      setSaving((prev) => ({ ...prev, [section]: false }));
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage facility settings and preferences"
      />

      {/* Organization Details */}
      <Card>
        <CardHeader title="Organization Details" />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSave('organization', {
                timezone: formData.get('timezone') ? String(formData.get('timezone')) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">Company Name</label>
                <Input value={company?.name || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">Contact Email</label>
                <Input value={company?.contactEmail || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">Phone</label>
                <Input value={company?.phone || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">Timezone</label>
                <Input name="timezone" defaultValue={settings?.timezone || 'Asia/Amman'} placeholder="e.g. Asia/Amman" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={saving.organization}>
                Save Organization Settings
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Booking Rules */}
      <Card>
        <CardHeader title="Booking Rules" />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSave('booking', {
                bookingWindowDays: formData.get('bookingWindowDays') ? parseInt(String(formData.get('bookingWindowDays'))) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Booking Window (Days)</label>
              <Input
                name="bookingWindowDays"
                type="number"
                defaultValue={settings?.bookingWindowDays || 30}
                placeholder="How many days in advance bookings are allowed"
              />
              <p className="mt-1 text-sm text-textMuted">Number of days in advance members can book facilities</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={saving.booking}>
                Save Booking Rules
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title="Notifications" />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSave('notifications', {
                notifyEmail: formData.get('notifyEmail') ? String(formData.get('notifyEmail')) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Notification Email</label>
              <Input
                name="notifyEmail"
                type="email"
                defaultValue={settings?.notifyEmail || ''}
                placeholder="email@example.com"
              />
              <p className="mt-1 text-sm text-textMuted">Email address for system notifications and alerts</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={saving.notifications}>
                Save Notification Settings
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
