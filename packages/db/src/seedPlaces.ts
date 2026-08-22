export interface SeedPlace {
  readonly name: string;
  /** Lower-cased, diacritics stripped — what search matches against. */
  readonly searchName: string;
  readonly admin1?: string;
  readonly countryCode: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezoneId: string;
  readonly population: number;
  readonly elevationM?: number;
}

/**
 * A starter set of places so the app is usable the moment it boots, before
 * anyone runs the GeoNames import.
 *
 * Twenty cities is not an atlas — it is a runway. `pnpm places:import` loads
 * the real 135,000-city dataset with polygon-accurate time zones, and should
 * be run before anyone casts a chart in anger. Coordinates here are the
 * standard published city-centre values; a birth in a large city can sit tens
 * of kilometres from its centre, which moves the ascendant by a few arcminutes.
 */
export const SEED_PLACES: readonly SeedPlace[] = [
  {
    name: 'Honolulu',
    searchName: 'honolulu',
    admin1: 'Hawaii',
    countryCode: 'US',
    latitude: 21.3069,
    longitude: -157.8583,
    timezoneId: 'Pacific/Honolulu',
    population: 350964,
  },
  {
    name: 'Ann Arbor',
    searchName: 'ann arbor',
    admin1: 'Michigan',
    countryCode: 'US',
    latitude: 42.2808,
    longitude: -83.743,
    timezoneId: 'America/Detroit',
    population: 123851,
  },
  {
    name: 'New York',
    searchName: 'new york',
    admin1: 'New York',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.006,
    timezoneId: 'America/New_York',
    population: 8804190,
  },
  {
    name: 'Los Angeles',
    searchName: 'los angeles',
    admin1: 'California',
    countryCode: 'US',
    latitude: 34.0522,
    longitude: -118.2437,
    timezoneId: 'America/Los_Angeles',
    population: 3898747,
  },
  {
    name: 'Chicago',
    searchName: 'chicago',
    admin1: 'Illinois',
    countryCode: 'US',
    latitude: 41.8781,
    longitude: -87.6298,
    timezoneId: 'America/Chicago',
    population: 2746388,
  },
  {
    name: 'Toronto',
    searchName: 'toronto',
    admin1: 'Ontario',
    countryCode: 'CA',
    latitude: 43.6532,
    longitude: -79.3832,
    timezoneId: 'America/Toronto',
    population: 2794356,
  },
  {
    name: 'London',
    searchName: 'london',
    admin1: 'England',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    timezoneId: 'Europe/London',
    population: 8982000,
  },
  {
    name: 'Paris',
    searchName: 'paris',
    admin1: 'Île-de-France',
    countryCode: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    timezoneId: 'Europe/Paris',
    population: 2140526,
  },
  {
    name: 'Berlin',
    searchName: 'berlin',
    countryCode: 'DE',
    latitude: 52.52,
    longitude: 13.405,
    timezoneId: 'Europe/Berlin',
    population: 3644826,
  },
  {
    name: 'Mumbai',
    searchName: 'mumbai',
    admin1: 'Maharashtra',
    countryCode: 'IN',
    latitude: 19.076,
    longitude: 72.8777,
    timezoneId: 'Asia/Kolkata',
    population: 12442373,
  },
  {
    name: 'New Delhi',
    searchName: 'new delhi',
    admin1: 'Delhi',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
    timezoneId: 'Asia/Kolkata',
    population: 257803,
  },
  {
    name: 'Bengaluru',
    searchName: 'bengaluru',
    admin1: 'Karnataka',
    countryCode: 'IN',
    latitude: 12.9716,
    longitude: 77.5946,
    timezoneId: 'Asia/Kolkata',
    population: 8443675,
  },
  {
    name: 'Chennai',
    searchName: 'chennai',
    admin1: 'Tamil Nadu',
    countryCode: 'IN',
    latitude: 13.0827,
    longitude: 80.2707,
    timezoneId: 'Asia/Kolkata',
    population: 4646732,
  },
  {
    name: 'Kolkata',
    searchName: 'kolkata',
    admin1: 'West Bengal',
    countryCode: 'IN',
    latitude: 22.5726,
    longitude: 88.3639,
    timezoneId: 'Asia/Kolkata',
    population: 4496694,
  },
  {
    name: 'Kathmandu',
    searchName: 'kathmandu',
    countryCode: 'NP',
    latitude: 27.7172,
    longitude: 85.324,
    timezoneId: 'Asia/Kathmandu',
    population: 845767,
  },
  {
    name: 'Dubai',
    searchName: 'dubai',
    countryCode: 'AE',
    latitude: 25.2048,
    longitude: 55.2708,
    timezoneId: 'Asia/Dubai',
    population: 3331420,
  },
  {
    name: 'Singapore',
    searchName: 'singapore',
    countryCode: 'SG',
    latitude: 1.3521,
    longitude: 103.8198,
    timezoneId: 'Asia/Singapore',
    population: 5453600,
  },
  {
    name: 'Tokyo',
    searchName: 'tokyo',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    timezoneId: 'Asia/Tokyo',
    population: 13960000,
  },
  {
    name: 'Sydney',
    searchName: 'sydney',
    admin1: 'New South Wales',
    countryCode: 'AU',
    latitude: -33.8688,
    longitude: 151.2093,
    timezoneId: 'Australia/Sydney',
    population: 5312163,
  },
  {
    name: 'São Paulo',
    searchName: 'sao paulo',
    countryCode: 'BR',
    latitude: -23.5505,
    longitude: -46.6333,
    timezoneId: 'America/Sao_Paulo',
    population: 12325232,
  },
];
