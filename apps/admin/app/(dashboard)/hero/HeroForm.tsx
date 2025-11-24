'use client';

import { useState } from 'react';
import type { LandingContent } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { FileUpload } from '../../_components/FileUpload';

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      className="glow-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-70"
      disabled={pending}
    >
      {pending ? 'Saving...' : 'Save hero content'}
    </button>
  );
}

export function HeroForm({
  content,
}: {
  content: LandingContent;
}) {
  const router = useRouter();
  const hero = content.hero;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(hero.backgroundImageUrl || '');
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string>(hero.backgroundVideoUrl || '');

  useActionToast({ status, message: message || undefined });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setStatus('idle');

    try {
      const formData = new FormData(e.currentTarget);
      await apiClient.updateHero({
        title: formData.get('title')?.toString() || '',
        subtitle: formData.get('subtitle')?.toString() || '',
        primaryCta: formData.get('primaryCtaLabel')?.toString() || '',
        primaryUrl: formData.get('primaryCtaLink')?.toString() || '',
        secondaryCta: formData.get('secondaryCtaLabel')?.toString() || undefined,
        secondaryUrl: formData.get('secondaryCtaLink')?.toString() || undefined,
        backgroundImageUrl: backgroundImageUrl || undefined,
      });

      setStatus('success');
      setMessage('Hero updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Failed to update hero:', error);
      setStatus('error');
      setMessage('Failed to update hero');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card space-y-4 p-6">
        <h3 className="font-display text-xl font-semibold text-slate-900">Hero content</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Title
            <input name="title" defaultValue={hero.title} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Subtitle
            <input name="subtitle" defaultValue={hero.subtitle} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Badge
            <input name="badge" defaultValue={hero.badge ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          <div className="md:col-span-2">
            <FileUpload
              label="Background Image"
              type="image"
              currentUrl={backgroundImageUrl}
              onUploadComplete={(url) => {
                setBackgroundImageUrl(url);
                // Clear video if image is set
                if (url) setBackgroundVideoUrl('');
              }}
            />
            <input type="hidden" name="backgroundImageUrl" value={backgroundImageUrl} />
          </div>
          <div className="md:col-span-2">
            <FileUpload
              label="Background Video (optional - will override image)"
              type="video"
              currentUrl={backgroundVideoUrl}
              onUploadComplete={(url) => {
                setBackgroundVideoUrl(url);
                // Clear image if video is set
                if (url) setBackgroundImageUrl('');
              }}
            />
            <input type="hidden" name="backgroundVideoUrl" value={backgroundVideoUrl} />
          </div>
        </div>
      </div>

      <div className="glass-card space-y-4 p-6">
        <h3 className="font-display text-xl font-semibold text-slate-900">Call-to-actions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-600">
            Primary label
            <input name="primaryCtaLabel" defaultValue={hero.primaryCtaLabel} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Primary link
            <input name="primaryCtaLink" defaultValue={hero.primaryCtaLink} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Secondary label
            <input name="secondaryCtaLabel" defaultValue={hero.secondaryCtaLabel ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Secondary link
            <input name="secondaryCtaLink" defaultValue={hero.secondaryCtaLink ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
        </div>
      </div>

      <div className="glass-card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-slate-900">Highlights</h3>
          <p className="text-xs text-slate-500">Displayed as marquee text under the hero</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-3xl border border-slate-200/80 bg-white/70 p-4">
              <input type="hidden" name={`highlight-${index}-id`} value={content.highlights[index]?.id ?? `highlight-${index}`} />
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Title
                <input
                  name={`highlight-${index}-title`}
                  defaultValue={content.highlights[index]?.title}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Description
                <textarea
                  name={`highlight-${index}-description`}
                  defaultValue={content.highlights[index]?.description}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {message ? (
        <p className={`text-sm ${status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>{message}</p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton pending={pending} />
      </div>
    </form>
  );
}