import { fetchLandingContent } from '../lib/apiClient';
import { HomeContent } from './_components/HomeContent';

export default async function Home() {
  const content = await fetchLandingContent();
  return <HomeContent content={content} />;
}

