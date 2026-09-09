/**
 * `all-the-cities` ships no types, and the shape matters enough to state.
 *
 * `loc.coordinates` is GeoJSON order — [longitude, latitude] — which is the
 * reverse of how every astrology source writes it, and is exactly the kind of
 * transposition that silently produces a chart for the wrong hemisphere.
 */
declare module 'all-the-cities' {
  interface City {
    readonly cityId: number;
    readonly name: string;
    readonly altName: string;
    readonly country: string;
    readonly featureCode: string;
    /** US rows carry the two-letter state code; elsewhere an admin1 code. */
    readonly adminCode?: string;
    readonly population: number;
    readonly loc: { readonly type: 'Point'; readonly coordinates: [number, number] };
  }
  const cities: readonly City[];
  export default cities;
}

declare module 'tz-lookup' {
  /** The IANA zone governing a coordinate. Throws for an invalid one. */
  export default function tzlookup(latitude: number, longitude: number): string;
}
