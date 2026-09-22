import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding stations, lines, fare slabs...');

  await prisma.lineStation.deleteMany();
  await prisma.station.deleteMany();
  await prisma.line.deleteMany();
  await prisma.fareSlab.deleteMany();

  // Lines
  const central = await prisma.line.create({ data: { name: 'Central Line', colorCode: '#FF0000' } });
  const western = await prisma.line.create({ data: { name: 'Western Line', colorCode: '#00A651' } });
  const harbour = await prisma.line.create({ data: { name: 'Harbour Line', colorCode: '#0000FF' } });

  // Stations - Mumbai Suburban Network
  const stations = [
    { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', zone: 'CENTRAL' as const, latitude: 18.9398, longitude: 72.8354 },
    { code: 'MSD', name: 'Masjid', zone: 'CENTRAL' as const, latitude: 18.945, longitude: 72.84 },
    { code: 'BY', name: 'Byculla', zone: 'CENTRAL' as const, latitude: 18.975, longitude: 72.831 },
    { code: 'DR', name: 'Dadar', zone: 'CENTRAL' as const, latitude: 19.017, longitude: 72.847 },
    { code: 'KYN', name: 'Kalyan', zone: 'CENTRAL' as const, latitude: 19.239, longitude: 73.129 },
    { code: 'TNA', name: 'Thane', zone: 'CENTRAL' as const, latitude: 19.194, longitude: 72.970 },
    { code: 'CCG', name: 'Churchgate', zone: 'WESTERN' as const, latitude: 18.932, longitude: 72.827 },
    { code: 'BCT', name: 'Mumbai Central', zone: 'WESTERN' as const, latitude: 18.969, longitude: 72.819 },
    { code: 'DDR', name: 'Dadar Western', zone: 'WESTERN' as const, latitude: 19.017, longitude: 72.843 },
    { code: 'BVI', name: 'Borivali', zone: 'WESTERN' as const, latitude: 19.229, longitude: 72.857 },
    { code: 'VAPI', name: 'Virar', zone: 'WESTERN' as const, latitude: 19.455, longitude: 72.811 },
    { code: 'PNVL', name: 'Panvel', zone: 'HARBOUR' as const, latitude: 18.991, longitude: 73.115 },
    { code: 'VASH', name: 'Vashi', zone: 'HARBOUR' as const, latitude: 19.077, longitude: 72.998 },
  ];
  for (const s of stations) {
    await prisma.station.create({ data: { code: s.code, name: s.name, zone: s.zone, latitude: s.latitude, longitude: s.longitude } });
  }

  // Line stations with sequence and distance
  const centralStations = [
    { code: 'CSMT', seq: 1, dist: 0 },
    { code: 'MSD', seq: 2, dist: 1.5 },
    { code: 'BY', seq: 3, dist: 4.2 },
    { code: 'DR', seq: 4, dist: 9.0 },
    { code: 'TNA', seq: 5, dist: 34.0 },
    { code: 'KYN', seq: 6, dist: 54.0 },
  ];
  const westernStations = [
    { code: 'CCG', seq: 1, dist: 0 },
    { code: 'BCT', seq: 2, dist: 4.5 },
    { code: 'DDR', seq: 3, dist: 11.0 },
    { code: 'BVI', seq: 4, dist: 33.0 },
    { code: 'VAPI', seq: 5, dist: 60.0 },
  ];
  const harbourStations = [
    { code: 'CSMT', seq: 1, dist: 0 },
    { code: 'VASH', seq: 2, dist: 26.0 },
    { code: 'PNVL', seq: 3, dist: 44.0 },
  ];

  for (const s of centralStations) {
    await prisma.lineStation.create({ data: { lineId: central.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  }
  for (const s of westernStations) {
    await prisma.lineStation.create({ data: { lineId: western.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  }
  for (const s of harbourStations) {
    await prisma.lineStation.create({ data: { lineId: harbour.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  }

  // Fare slabs (per class)
  const slabs = [
    // SECOND CLASS
    { travelClass: 'SECOND' as const, minDistanceKm: 0, maxDistanceKm: 10, baseFare: 5, perKmRate: 1.0 },
    { travelClass: 'SECOND' as const, minDistanceKm: 10.01, maxDistanceKm: 30, baseFare: 10, perKmRate: 0.8 },
    { travelClass: 'SECOND' as const, minDistanceKm: 30.01, maxDistanceKm: 60, baseFare: 15, perKmRate: 0.6 },
    { travelClass: 'SECOND' as const, minDistanceKm: 60.01, maxDistanceKm: 150, baseFare: 20, perKmRate: 0.5 },
    // FIRST CLASS ~ 8x Second
    { travelClass: 'FIRST' as const, minDistanceKm: 0, maxDistanceKm: 10, baseFare: 40, perKmRate: 8.0 },
    { travelClass: 'FIRST' as const, minDistanceKm: 10.01, maxDistanceKm: 30, baseFare: 80, perKmRate: 6.5 },
    { travelClass: 'FIRST' as const, minDistanceKm: 30.01, maxDistanceKm: 150, baseFare: 120, perKmRate: 5.0 },
    // AC ~ 12x Second
    { travelClass: 'AC' as const, minDistanceKm: 0, maxDistanceKm: 10, baseFare: 60, perKmRate: 12.0 },
    { travelClass: 'AC' as const, minDistanceKm: 10.01, maxDistanceKm: 30, baseFare: 110, perKmRate: 9.0 },
    { travelClass: 'AC' as const, minDistanceKm: 30.01, maxDistanceKm: 150, baseFare: 165, perKmRate: 7.0 },
  ];
  for (const slab of slabs) {
    await prisma.fareSlab.create({ data: slab });
  }

  // === Tamil Nadu - Chennai Suburban & TN Local ===
  console.log('Seeding Tamil Nadu stations...');
  const southLine = await prisma.line.create({ data: { name: 'Chennai South Line', colorCode: '#0066CC' } });
  const westTNLine = await prisma.line.create({ data: { name: 'Chennai West Line', colorCode: '#FF6600' } });
  const northLine = await prisma.line.create({ data: { name: 'Chennai North Line', colorCode: '#009900' } });
  const mrtsLine = await prisma.line.create({ data: { name: 'Chennai MRTS Line', colorCode: '#9900CC' } });
  const cbeLine = await prisma.line.create({ data: { name: 'Coimbatore Local', colorCode: '#CC0000' } });

  const tnStations = [
    { code: 'MSB', name: 'Chennai Beach', zone: 'SOUTHERN', lat: 13.1007, lon: 80.2932 },
    { code: 'MSF', name: 'Chennai Fort', zone: 'SOUTHERN', lat: 13.0845, lon: 80.2835 },
    { code: 'MS', name: 'Chennai Egmore', zone: 'SOUTHERN', lat: 13.0792, lon: 80.2615 },
    { code: 'MAS', name: 'Chennai Central MMC', zone: 'SOUTHERN', lat: 13.0827, lon: 80.2750 },
    { code: 'MBM', name: 'Mambalam', zone: 'SOUTHERN', lat: 13.0330, lon: 80.2200 },
    { code: 'STM', name: 'St. Thomas Mount', zone: 'SOUTHERN', lat: 12.9945, lon: 80.1970 },
    { code: 'TBM', name: 'Tambaram', zone: 'SOUTHERN', lat: 12.9249, lon: 80.1270 },
    { code: 'CMP', name: 'Chromepet', zone: 'SOUTHERN', lat: 12.9516, lon: 80.1462 },
    { code: 'VDR', name: 'Vandalur', zone: 'SOUTHERN', lat: 12.8905, lon: 80.0810 },
    { code: 'GI', name: 'Guduvancheri', zone: 'SOUTHERN', lat: 12.8440, lon: 80.0570 },
    { code: 'SKL', name: 'Singaperumal Koil', zone: 'SOUTHERN', lat: 12.7540, lon: 80.0360 },
    { code: 'CGL', name: 'Chengalpattu Jn', zone: 'SOUTHERN', lat: 12.6920, lon: 79.9800 },
    { code: 'POT', name: 'Potheri', zone: 'SOUTHERN', lat: 12.8230, lon: 80.0420 },
    { code: 'PRM', name: 'Paranur', zone: 'SOUTHERN', lat: 12.7230, lon: 80.0100 },
    { code: 'PER', name: 'Perambur', zone: 'SOUTHERN', lat: 13.1070, lon: 80.2440 },
    { code: 'AVD', name: 'Avadi', zone: 'SOUTHERN', lat: 13.1140, lon: 80.1010 },
    { code: 'TRL', name: 'Tiruvallur', zone: 'SOUTHERN', lat: 13.1230, lon: 79.9120 },
    { code: 'AJJ', name: 'Arakkonam Jn', zone: 'SOUTHERN', lat: 13.0770, lon: 79.6720 },
    { code: 'TRT', name: 'Tiruttani', zone: 'SOUTHERN', lat: 13.1730, lon: 79.6140 },
    { code: 'PUT', name: 'Puttur', zone: 'SOUTHERN', lat: 13.4200, lon: 79.5500 },
    { code: 'KOK', name: 'Korukkupet', zone: 'SOUTHERN', lat: 13.1180, lon: 80.2890 },
    { code: 'ENR', name: 'Ennore', zone: 'SOUTHERN', lat: 13.2140, lon: 80.3200 },
    { code: 'GPD', name: 'Gummidipoondi', zone: 'SOUTHERN', lat: 13.4080, lon: 80.1180 },
    { code: 'MKR', name: 'Minjur', zone: 'SOUTHERN', lat: 13.3100, lon: 80.2700 },
    { code: 'MYL', name: 'Mylapore', zone: 'SOUTHERN', lat: 13.0360, lon: 80.2680 },
    { code: 'VEL', name: 'Velachery', zone: 'SOUTHERN', lat: 12.9750, lon: 80.2200 },
    { code: 'CPT', name: 'Chintadripet', zone: 'SOUTHERN', lat: 13.0730, lon: 80.2730 },
    { code: 'PRGD', name: 'Perungudi', zone: 'SOUTHERN', lat: 12.9700, lon: 80.2450 },
    { code: 'CBE', name: 'Coimbatore Jn', zone: 'SOUTHERN', lat: 11.0168, lon: 76.9558 },
    { code: 'PTJ', name: 'Podanur Jn', zone: 'SOUTHERN', lat: 10.9900, lon: 76.9900 },
    { code: 'TUP', name: 'Tiruppur', zone: 'SOUTHERN', lat: 11.1080, lon: 77.3410 },
    { code: 'ED', name: 'Erode Jn', zone: 'SOUTHERN', lat: 11.3410, lon: 77.7170 },
    { code: 'KRR', name: 'Karur Jn', zone: 'SOUTHERN', lat: 10.9600, lon: 78.0760 },
    { code: 'MDU', name: 'Madurai Jn', zone: 'SOUTHERN', lat: 9.9190, lon: 78.1190 },
    { code: 'TEN', name: 'Tirunelveli Jn', zone: 'SOUTHERN', lat: 8.7300, lon: 77.7000 },
  ];
  for (const s of tnStations) {
    await prisma.station.create({ data: { code: s.code, name: s.name, zone: s.zone, latitude: s.lat, longitude: s.lon } });
  }
  const southStations = [
    { code: 'MSB', seq: 1, dist: 0 }, { code: 'MSF', seq: 2, dist: 1.8 }, { code: 'MS', seq: 3, dist: 4.2 }, { code: 'MAS', seq: 4, dist: 5.5 }, { code: 'MBM', seq: 5, dist: 10.0 }, { code: 'STM', seq: 6, dist: 15.2 }, { code: 'TBM', seq: 7, dist: 25.5 }, { code: 'CMP', seq: 8, dist: 28.0 }, { code: 'VDR', seq: 9, dist: 32.5 }, { code: 'POT', seq: 10, dist: 36.0 }, { code: 'GI', seq: 11, dist: 40.2 }, { code: 'SKL', seq: 12, dist: 46.5 }, { code: 'PRM', seq: 13, dist: 51.0 }, { code: 'CGL', seq: 14, dist: 56.8 },
  ];
  const westTNStations = [
    { code: 'MAS', seq: 1, dist: 0 }, { code: 'PER', seq: 2, dist: 4.5 }, { code: 'AVD', seq: 3, dist: 21.5 }, { code: 'TRL', seq: 4, dist: 41.0 }, { code: 'AJJ', seq: 5, dist: 65.5 }, { code: 'TRT', seq: 6, dist: 85.0 }, { code: 'PUT', seq: 7, dist: 102.0 },
  ];
  const northStations = [
    { code: 'MAS', seq: 1, dist: 0 }, { code: 'KOK', seq: 2, dist: 4.0 }, { code: 'ENR', seq: 3, dist: 14.0 }, { code: 'MKR', seq: 4, dist: 26.0 }, { code: 'GPD', seq: 5, dist: 46.0 },
  ];
  const mrtsStations = [
    { code: 'MSB', seq: 1, dist: 0 }, { code: 'CPT', seq: 2, dist: 2.5 }, { code: 'MYL', seq: 3, dist: 8.0 }, { code: 'VEL', seq: 4, dist: 12.5 }, { code: 'PRGD', seq: 5, dist: 15.0 },
  ];
  const cbeStations = [
    { code: 'CBE', seq: 1, dist: 0 }, { code: 'PTJ', seq: 2, dist: 6.5 }, { code: 'TUP', seq: 3, dist: 48.0 }, { code: 'ED', seq: 4, dist: 101.0 }, { code: 'KRR', seq: 5, dist: 147.0 },
  ];
  for (const s of southStations) await prisma.lineStation.create({ data: { lineId: southLine.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  for (const s of westTNStations) await prisma.lineStation.create({ data: { lineId: westTNLine.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  for (const s of northStations) await prisma.lineStation.create({ data: { lineId: northLine.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  for (const s of mrtsStations) await prisma.lineStation.create({ data: { lineId: mrtsLine.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
  for (const s of cbeStations) await prisma.lineStation.create({ data: { lineId: cbeLine.id, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });

  console.log('Seeding complete');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
