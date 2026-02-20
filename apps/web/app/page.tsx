import { fetchLandingContent, getLandingFallback } from '../lib/apiClient';
import { HomeContent } from './_components/HomeContent';

export default async function Home() {
  let content;
  try {
    content = await fetchLandingContent();
  } catch {
    content = getLandingFallback();
  }
  return <HomeContent content={content} />;
}

