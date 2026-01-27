import { Suspense } from 'react';
import Link from 'next/link';
import { PackageRegisterForm } from './PackageRegisterForm';

export const metadata = {
  title: 'Register for a Package',
};

export default function PackageRegisterPage() {
  return (
    <div className="bg-white py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Packages</p>
        <h1 className="mt-4 text-4xl font-bold text-brand-black">Register now</h1>
        <p className="mt-2 text-gray-600">
          Register for Basketball, Gymnastics, or Volleyball. We will contact you to confirm.
        </p>
        <Link href="/sports" className="mt-4 inline-block text-sm font-semibold text-brand-blue-primary hover:text-brand-green-primary">
          ← Back to Sports & packages
        </Link>
      </div>
      <div className="mt-12 mx-auto max-w-lg px-6">
        <Suspense fallback={<div className="rounded-card border border-brand-lightBlue/20 bg-white p-8 shadow-card max-w-md mx-auto h-80 animate-pulse bg-gray-50" />}>
          <PackageRegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
