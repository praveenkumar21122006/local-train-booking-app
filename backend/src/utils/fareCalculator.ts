import prisma from '../config/db';

export const calculateFare = async (fromCode: string, toCode: string, travelClass: string = 'SECOND') => {
  // Fetch stations with line info - distance logic: find common line or shortest distance
  // Simplified: Compute distance as absolute difference on same line, else fallback to haversine-like via station distances.
  
  // Get all lineStations for both stations
  const fromEntries = await prisma.lineStation.findMany({ where: { stationCode: fromCode } });
  const toEntries = await prisma.lineStation.findMany({ where: { stationCode: toCode } });

  if (fromEntries.length === 0 || toEntries.length === 0) throw new Error('STATION_NOT_FOUND');

  let distanceKm = 0;
  let foundCommonLine = false;

  // Try common line first
  for (const f of fromEntries) {
    for (const t of toEntries) {
      if (f.lineId === t.lineId) {
        distanceKm = Math.abs(Number(t.distanceFromOrigin) - Number(f.distanceFromOrigin));
        foundCommonLine = true;
        break;
      }
    }
    if (foundCommonLine) break;
  }

  // If no common line (transit), use max distance approximation (sum)
  if (!foundCommonLine) {
    // Use first entry distances as fallback (e.g., via Dadar interchange)
    distanceKm = Math.abs(Number(fromEntries[0].distanceFromOrigin) - Number(toEntries[0].distanceFromOrigin)) + 10; // interchange penalty
    if (distanceKm < 5) distanceKm = 15;
  }

  // Fetch fare slab
  const slab = await prisma.fareSlab.findFirst({
    where: {
      travelClass: travelClass as any,
      minDistanceKm: { lte: distanceKm },
      maxDistanceKm: { gte: distanceKm },
    },
  });

  if (!slab) throw new Error('FARE_SLAB_NOT_FOUND');

  const min = Number(slab.minDistanceKm);
  const base = Number(slab.baseFare);
  const perKm = Number(slab.perKmRate);
  // fare = base + (distance - min) * perKm, rounded up to nearest 5
  let rawFare = base + Math.max(0, distanceKm - min) * perKm;
  let fare = Math.ceil(rawFare / 5) * 5; // Indian ticketing rounds to 5
  if (fare < base) fare = base;

  return { distanceKm: Math.round(distanceKm * 10) / 10, fare, slabId: slab.id };
};

export const calculateSeasonFare = async (fromCode: string, toCode: string, travelClass: string, passType: 'MONTHLY' | 'QUARTERLY') => {
  const { fare } = await calculateFare(fromCode, toCode, travelClass);
  // Season pass = ~15x single journey for MONTHLY, 40x for QUARTERLY (concession)
  const multiplier = passType === 'MONTHLY' ? 15 : 40;
  let seasonFare = fare * multiplier;
  // First class season slightly discounted
  if (travelClass === 'FIRST') seasonFare *= 0.9;
  return Math.ceil(seasonFare / 5) * 5;
};
