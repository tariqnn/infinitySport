'use client';

import {
  RegistrationsPageClient,
  SUMMER_CAMP_PACKAGE_NAMES,
} from '../registrations/RegistrationsPageClient';

export default function SummerCampRegistrationsPage() {
  return (
    <RegistrationsPageClient
      includedPackageNames={SUMMER_CAMP_PACKAGE_NAMES}
      title="Summer Camp Registrations"
      subtitle="Registrations for Basketball and Volleyball Summer Camp"
      listTitle="Summer camp registrations"
      allPackagesLabel="All summer camps"
      exportPrefix="summer-camp-registrations"
      hideAdminPackageTools
    />
  );
}
