export interface CoocoPartnerConfig {
  slug: string;
  aliases: string[];
  name: string;
  shortName: string;
  tagline: string;
  partnerId: string;
  location: string;
  coocoUrl: string;
  description: string;
  specialties: string[];
  dishCountText: string;
  avatarUrl: string;
  coverUrl: string;
}

export const COOCO_PARTNERS: CoocoPartnerConfig[] = [
  {
    slug: 'little-saigon',
    aliases: ['littlesaigonrestaurant-1', 'little-saigon-restaurant'],
    name: 'Little Saigon Restaurant',
    shortName: 'Little Saigon',
    tagline: 'Authentic Vietnamese Phở & Regional Specialties',
    partnerId: 'olive-littlesaigon-1',
    location: '891 Upper James St, Hamilton, ON',
    coocoUrl: 'https://order.olivepos.com/store/littlesaigonrestaurant-1/order/?type=pickup',
    description:
      'Official Cooco partner chef in Hamilton. Handcrafted 12-hour simmered Phở, sizzling Bánh Xèo crepes, vermicelli bowls, wok specialties, and party catering trays.',
    specialties: [
      'Phở Đặc Biệt (House Special)',
      'Bánh Xèo (Crispy Crepe)',
      'Bún Chả Hà Nội',
      'Party Catering Trays',
    ],
    dishCountText: '196 Dishes Live',
    avatarUrl: '/chefs/little-saigon/logo.jpg',
    coverUrl: '/chefs/little-saigon/cover.jpg',
  },
  {
    slug: 'bep-ba-muoi',
    aliases: ['cooco', '06b4462d-a5af-4c47-aa30-7ced490262c5'],
    name: 'Bếp Bà Muối (Ba Muoi Kitchen)',
    shortName: 'Bếp Bà Muối',
    tagline: 'Authentic Vietnamese Home Cooking & Catering',
    partnerId: '06b4462d-a5af-4c47-aa30-7ced490262c5',
    location: 'Pick up near Eastgate Square, Hamilton, ON',
    coocoUrl: 'https://cooco.app/cooks/06b4462d-a5af-4c47-aa30-7ced490262c5',
    description:
      'Official Cooco partner chef in Hamilton. Authentic Vietnamese home cooking, fresh slow-cooked noodle soups, broken rice plates, party trays, and sweet chè.',
    specialties: [
      'Bò Kho (Beef Stew)',
      'Cơm Sườn Bì Chả',
      'Chè Dưỡng Nhan',
      'Bún Măng Vịt',
    ],
    dishCountText: '55 Dishes Live',
    avatarUrl: '/chefs/bep-ba-muoi/avatar.png',
    coverUrl: '/chefs/bep-ba-muoi/cover.png',
  },
];

export function isCoocoPartner(chefOrStorefront: {
  cuisine_types?: string[] | null;
  cuisineTypes?: string[] | null;
  slug?: string | null;
  name?: string | null;
}): boolean {
  if (!chefOrStorefront) return false;

  const cuisines = (chefOrStorefront.cuisine_types || chefOrStorefront.cuisineTypes || []).map((c) =>
    c.toLowerCase()
  );
  if (cuisines.includes('cooco partner') || cuisines.includes('cooco')) {
    return true;
  }

  const slug = (chefOrStorefront.slug || '').toLowerCase();
  for (const partner of COOCO_PARTNERS) {
    if (partner.slug === slug || partner.aliases.includes(slug)) {
      return true;
    }
  }

  const name = (chefOrStorefront.name || '').toLowerCase();
  if (
    name.includes('cooco') ||
    name.includes('bà muối') ||
    name.includes('ba muoi') ||
    name.includes('little saigon')
  ) {
    return true;
  }

  return false;
}

export function getCoocoPartnerConfig(slugOrId?: string | null): CoocoPartnerConfig | null {
  if (!slugOrId) return null;
  const target = slugOrId.toLowerCase().trim();

  for (const partner of COOCO_PARTNERS) {
    if (
      partner.slug === target ||
      partner.aliases.includes(target) ||
      partner.partnerId === target
    ) {
      return partner;
    }
  }

  // Fallback for general Cooco queries
  if (target.includes('saigon')) {
    return COOCO_PARTNERS[0] ?? null;
  }
  if (target.includes('cooco') || target.includes('muoi') || target.includes('muối')) {
    return COOCO_PARTNERS[1] ?? null;
  }

  return null;
}

export function getPartnerExternalLink(slugOrId?: string | null): string {
  const config = getCoocoPartnerConfig(slugOrId);
  if (config) return config.coocoUrl;
  return 'https://cooco.app';
}
