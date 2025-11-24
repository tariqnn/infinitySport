'use client';

import { useState, useEffect } from 'react';
import type { LandingFooter } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';

interface FooterState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: FooterState = { status: 'idle' };

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button 
      type="submit" 
      className="glow-button inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-70" 
      disabled={pending}
    >
      {pending ? 'Saving…' : 'Save footer'}
    </button>
  );
}

export function FooterForm() {
  const [footer, setFooter] = useState<LandingFooter>({
    address: '',
    phone: '',
    email: '',
    socialLinks: [],
  });
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<FooterState>(initialState);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useActionToast(state);

  useEffect(() => {
    async function loadFooter() {
      try {
        // For now, we'll use default values since footer is not in the database schema
        // In the future, you might want to add a FooterSettings model
        setFooter({
          address: 'Infinity Campus, Airport Road, Amman, Jordan',
          phone: '+962 6 555 8899',
          email: 'hello@infinitysport.jo',
          contactRecipientEmail: 'hello@infinitysport.jo',
          socialLinks: [
            { id: 'social-ig', label: 'Instagram', href: 'https://instagram.com/infinitysport' },
            { id: 'social-li', label: 'LinkedIn', href: 'https://linkedin.com/company/infinitysport' },
            { id: 'social-yt', label: 'YouTube', href: 'https://youtube.com/@infinitysport' },
          ],
        });
      } catch (error) {
        console.error('Failed to load footer:', error);
        setState({ 
          status: 'error', 
          message: 'Failed to load footer data.' 
        });
      } finally {
        setLoading(false);
      }
    }
    loadFooter();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState({ status: 'idle' });

    try {
      const formData = new FormData(e.currentTarget);
      
      // Extract social links
      const socialLinks = [0, 1, 2]
        .map((index) => {
          const label = formData.get(`social-${index}-label`)?.toString();
          const href = formData.get(`social-${index}-url`)?.toString();
          const id = formData.get(`social-${index}-id`)?.toString() || `social-${index}`;
          if (!label || !href) return null;
          return { id, label, href };
        })
        .filter(Boolean) as Array<{ id: string; label: string; href: string }>;

      const updatedFooter: LandingFooter = {
        address: formData.get('address')?.toString() || '',
        phone: formData.get('phone')?.toString() || '',
        email: formData.get('email')?.toString() || '',
        contactRecipientEmail: formData.get('contactRecipientEmail')?.toString() || formData.get('email')?.toString() || '',
        socialLinks,
      };

      setFooter(updatedFooter);
      setState({ status: 'success', message: 'Footer settings saved! (Note: Currently stored in memory. Consider adding a FooterSettings model to the database.)' });
      
      // TODO: In the future, add a FooterSettings API endpoint to persist this
      // For now, this is just stored in component state
      
      router.refresh();
    } catch (error) {
      console.error('Failed to save footer:', error);
      setState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save footer' 
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading footer settings...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card space-y-4 p-6">
        <h3 className="font-display text-2xl font-semibold text-slate-900">Contact information</h3>
        <label className="text-sm font-semibold text-slate-600">
          Address
          <textarea name="address" defaultValue={footer.address} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Phone
            <input name="phone" defaultValue={footer.phone} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Email
            <input name="email" type="email" defaultValue={footer.email} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600 md:col-span-2">
            Form recipient email
            <input
              name="contactRecipientEmail"
              type="email"
              defaultValue={footer.contactRecipientEmail ?? footer.email}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
              required
            />
          </label>
        </div>
      </div>

      <div className="glass-card space-y-4 p-6">
        <h3 className="font-display text-2xl font-semibold text-slate-900">Social links</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const social = footer.socialLinks[index];
            return (
              <div key={index} className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                <input type="hidden" name={`social-${index}-id`} value={social?.id ?? `social-${index}`} />
                <label className="text-sm font-semibold text-slate-600">
                  Label
                  <input name={`social-${index}-label`} defaultValue={social?.label ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="mt-3 block text-sm font-semibold text-slate-600">
                  URL
                  <input name={`social-${index}-url`} defaultValue={social?.href ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {state.message ? (
        <p className={`text-sm ${state.status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>{state.message}</p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton pending={pending} />
      </div>
    </form>
  );
}
