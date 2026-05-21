'use client';

import {
  RegistrationsPageClient,
  SUMMER_CAMP_PACKAGE_NAME,
} from '../registrations/RegistrationsPageClient';

export default function SummerCampRegistrationsPage() {
  return (
    <RegistrationsPageClient
      fixedPackageName={SUMMER_CAMP_PACKAGE_NAME}
      title="Summer Camp Registrations"
      subtitle="Registrations for Basketball Summer Camp only"
      listTitle="Summer camp registrations"
      allPackagesLabel={SUMMER_CAMP_PACKAGE_NAME}
      exportPrefix="summer-camp-registrations"
      hideAdminPackageTools
    />
  );
}
