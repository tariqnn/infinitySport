const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Individual endpoint fetchers
export async function fetchPrograms() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/programs`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch programs:', error);
    return [];
  }
}

export async function fetchOffers() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/offers`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch offers:', error);
    return [];
  }
}

export async function fetchEvents() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/events`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export async function fetchFacilities() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/facilities`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch facilities:', error);
    return [];
  }
}

export async function fetchAnnouncements() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/announcements`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    return [];
  }
}

export async function fetchLandingContent() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/landing`, {
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform API response to match LandingContent type
    const transformed = {
      hero: data.hero ? {
        title: data.hero.title,
        subtitle: data.hero.subtitle,
        primaryCtaLabel: data.hero.primaryCta,
        primaryCtaLink: data.hero.primaryUrl,
        secondaryCtaLabel: data.hero.secondaryCta || undefined,
        secondaryCtaLink: data.hero.secondaryUrl || undefined,
        backgroundImageUrl: data.hero.backgroundImageUrl || undefined,
        backgroundVideoUrl: undefined, // Not in current schema
      } : null,
      highlights: [], // Not in current schema, can be added later
      programs: (data.programs || []).map((p: any) => ({
        id: p.id,
        title: p.name,
        description: p.description,
        sportType: p.level || 'multi',
        badge: p.level || undefined,
        link: `/sports#${p.slug}`,
        mediaUrl: undefined,
        isFeatured: p.highlight || false,
        isActive: true,
      })),
      offers: (data.offers || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        price: o.pricePerMonth === 0 ? 'Custom' : `JD ${o.pricePerMonth}/mo`,
        badge: o.badge || undefined,
        description: o.description,
        features: o.features || [],
        link: '/offers',
        isFeatured: false,
        isActive: true,
      })),
      events: (data.events || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description || undefined,
        link: '/events',
        isActive: e.highlight !== false,
      })),
      announcements: (data.announcements || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        message: a.body,
        isPinned: a.isPinned || false,
        isActive: true,
        link: '/contact',
      })),
      facilityHighlights: (data.facilities || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        mediaUrl: f.imageUrl || undefined,
        badge: undefined,
      })),
      footer: {
        address: 'Infinity Campus, Airport Road, Amman, Jordan',
        phone: '+962 6 555 8899',
        email: 'hello@infinitysport.jo',
        contactRecipientEmail: 'hello@infinitysport.jo',
        socialLinks: [],
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    
    // Ensure hero is never null
    if (!transformed.hero) {
      transformed.hero = {
        title: 'Elevating Jordanian Athletes',
        subtitle: 'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.',
        primaryCtaLabel: 'Explore Programs',
        primaryCtaLink: '/contact',
        secondaryCtaLabel: 'Book a Tour',
        secondaryCtaLink: '/contact',
        backgroundImageUrl: undefined,
      };
    }
    
    return transformed;
  } catch (error) {
    console.error('Failed to fetch landing content:', error);
    // Return fallback data
    return {
      hero: {
        title: 'Elevating Jordanian Athletes',
        subtitle: 'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.',
        primaryCtaLabel: 'Explore Programs',
        primaryCtaLink: '/contact',
        secondaryCtaLabel: 'Book a Tour',
        secondaryCtaLink: '/contact',
        backgroundImageUrl: undefined,
      },
      highlights: [],
      programs: [],
      offers: [],
      events: [],
      announcements: [],
      facilityHighlights: [],
      footer: {
        address: 'Infinity Campus, Airport Road, Amman, Jordan',
        phone: '+962 6 555 8899',
        email: 'hello@infinitysport.jo',
        contactRecipientEmail: 'hello@infinitysport.jo',
        socialLinks: [],
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
  }
}

