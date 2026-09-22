import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Adding Tamil Nadu local train stations...');

  // Create TN Lines
  const southLine = await prisma.line.upsert({
    where: { name: 'Chennai South Line' },
    update: {},
    create: { name: 'Chennai South Line', colorCode: '#0066CC' }
  });
  const westLine = await prisma.line.upsert({
    where: { name: 'Chennai West Line' },
    update: {},
    create: { name: 'Chennai West Line', colorCode: '#FF6600' }
  });
  const northLine = await prisma.line.upsert({
    where: { name: 'Chennai North Line' },
    update: {},
    create: { name: 'Chennai North Line', colorCode: '#009900' }
  });
  const mrtsLine = await prisma.line.upsert({
    where: { name: 'Chennai MRTS Line' },
    update: {},
    create: { name: 'Chennai MRTS Line', colorCode: '#9900CC' }
  });
  const cbeLine = await prisma.line.upsert({
    where: { name: 'Coimbatore Local' },
    update: {},
    create: { name: 'Coimbatore Local', colorCode: '#CC0000' }
  });

  // Tamil Nadu Stations - Chennai Suburban + Coimbatore
  const tnStations = [
    // South Line (Beach - Chengalpattu) - 60 km
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
    // West Line (Central - Arakkonam - Tiruttani)
    { code: 'PER', name: 'Perambur', zone: 'SOUTHERN', lat: 13.1070, lon: 80.2440 },
    { code: 'AVD', name: 'Avadi', zone: 'SOUTHERN', lat: 13.1140, lon: 80.1010 },
    { code: 'TRL', name: 'Tiruvallur', zone: 'SOUTHERN', lat: 13.1230, lon: 79.9120 },
    { code: 'AJJ', name: 'Arakkonam Jn', zone: 'SOUTHERN', lat: 13.0770, lon: 79.6720 },
    { code: 'TRT', name: 'Tiruttani', zone: 'SOUTHERN', lat: 13.1730, lon: 79.6140 },
    { code: 'PUT', name: 'Puttur', zone: 'SOUTHERN', lat: 13.4200, lon: 79.5500 },
    // North Line (Central - Gummidipoondi)
    { code: 'KOK', name: 'Korukkupet', zone: 'SOUTHERN', lat: 13.1180, lon: 80.2890 },
    { code: 'ENR', name: 'Ennore', zone: 'SOUTHERN', lat: 13.2140, lon: 80.3200 },
    { code: 'GPD', name: 'Gummidipoondi', zone: 'SOUTHERN', lat: 13.4080, lon: 80.1180 },
    { code: 'MKR', name: 'Minjur', zone: 'SOUTHERN', lat: 13.3100, lon: 80.2700 },
    // MRTS Line
    { code: 'MYL', name: 'Mylapore', zone: 'SOUTHERN', lat: 13.0360, lon: 80.2680 },
    { code: 'VEL', name: 'Velachery', zone: 'SOUTHERN', lat: 12.9750, lon: 80.2200 },
    { code: 'CPT', name: 'Chintadripet', zone: 'SOUTHERN', lat: 13.0730, lon: 80.2730 },
    { code: 'PRGD', name: 'Perungudi', zone: 'SOUTHERN', lat: 12.9700, lon: 80.2450 },
    // Coimbatore Region
    { code: 'CBE', name: 'Coimbatore Jn', zone: 'SOUTHERN', lat: 11.0168, lon: 76.9558 },
    { code: 'PTJ', name: 'Podanur Jn', zone: 'SOUTHERN', lat: 10.9900, lon: 76.9900 },
    { code: 'TUP', name: 'Tiruppur', zone: 'SOUTHERN', lat: 11.1080, lon: 77.3410 },
    { code: 'ED', name: 'Erode Jn', zone: 'SOUTHERN', lat: 11.3410, lon: 77.7170 },
    { code: 'KRR', name: 'Karur Jn', zone: 'SOUTHERN', lat: 10.9600, lon: 78.0760 },
    { code: 'MDU', name: 'Madurai Jn', zone: 'SOUTHERN', lat: 9.9190, lon: 78.1190 },
    { code: 'TEN', name: 'Tirunelveli Jn', zone: 'SOUTHERN', lat: 8.7300, lon: 77.7000 },
  ];

  for (const s of tnStations) {
    await prisma.station.upsert({
      where: { code: s.code },
      update: {},
      create: { code: s.code, name: s.name, zone: s.zone, latitude: s.lat, longitude: s.lon }
    });
  }
  console.log(`Upserted ${tnStations.length} TN stations`);

  // Helper to clear existing line stations for TN lines before insert
  await prisma.lineStation.deleteMany({ where: { lineId: { in: [southLine.id, westLine.id, northLine.id, mrtsLine.id, cbeLine.id] } } });

  // South Line stations with distances (from Beach)
  const southStations = [
    { code: 'MSB', seq: 1, dist: 0 },
    { code: 'MSF', seq: 2, dist: 1.8 },
    { code: 'MS', seq: 3, dist: 4.2 },
    { code: 'MAS', seq: 4, dist: 5.5 },
    { code: 'MBM', seq: 5, dist: 10.0 },
    { code: 'STM', seq: 6, dist: 15.2 },
    { code: 'TBM', seq: 7, dist: 25.5 },
    { code: 'CMP', seq: 8, dist: 28.0 },
    { code: 'VDR', seq: 9, dist: 32.5 },
    { code: 'POT', seq: 10, dist: 36.0 },
    { code: 'GI', seq: 11, dist: 40.2 },
    { code: 'SKL', seq: 12, dist: 46.5 },
    { code: 'PRM', seq: 13, dist: 51.0 },
    { code: 'CGL', seq: 14, dist: 56.8 },
  ];
  // West Line (Central - Tiruttani)
  const westStations = [
    { code: 'MAS', seq: 1, dist: 0 },
    { code: 'PER', seq: 2, dist: 4.5 },
    { code: 'AVD', seq: 3, dist: 21.5 },
    { code: 'TRL', seq: 4, dist: 41.0 },
    { code: 'AJJ', seq: 5, dist: 65.5 },
    { code: 'TRT', seq: 6, dist: 85.0 },
    { code: 'PUT', seq: 7, dist: 102.0 },
  ];
  // North Line
  const northStations = [
    { code: 'MAS', seq: 1, dist: 0 },
    { code: 'KOK', seq: 2, dist: 4.0 },
    { code: 'ENR', seq: 3, dist: 14.0 },
    { code: 'MKR', seq: 4, dist: 26.0 },
    { code: 'GPD', seq: 5, dist: 46.0 },
  ];
  // MRTS
  const mrtsStations = [
    { code: 'MSB', seq: 1, dist: 0 },
    { code: 'CPT', seq: 2, dist: 2.5 },
    { code: 'MYL', seq: 3, dist: 8.0 },
    { code: 'VEL', seq: 4, dist: 12.5 },
    { code: 'PRGD', seq: 5, dist: 15.0 },
  ];
  // Coimbatore local
  const cbeStations = [
    { code: 'CBE', seq: 1, dist: 0 },
    { code: 'PTJ', seq: 2, dist: 6.5 },
    { code: 'TUP', seq: 3, dist: 48.0 },
    { code: 'ED', seq: 4, dist: 101.0 },
    { code: 'KRR', seq: 5, dist: 147.0 },
  ];

  const insert = async (lineId: number, list: any[]) => {
    for (const s of list) {
      await prisma.lineStation.create({ data: { lineId, stationCode: s.code, sequenceNum: s.seq, distanceFromOrigin: s.dist } });
    }
  };
  await insert(southLine.id, southStations);
  await insert(westLine.id, westStations);
  await insert(northLine.id, northStations);
  await insert(mrtsLine.id, mrtsStations);
  await insert(cbeLine.id, cbeStations);

  console.log('TN lines and distances seeded');
  console.log('Done');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
