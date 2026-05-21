import {
  RegistrationsPageClient,
  SUMMER_CAMP_PACKAGE_NAME,
} from './RegistrationsPageClient';

export default function RegistrationsPage() {
  return (
    <RegistrationsPageClient
      excludedPackageNames={[SUMMER_CAMP_PACKAGE_NAME]}
    />
  );
}
