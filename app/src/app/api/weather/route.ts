import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { ok, badRequest, upstreamError } from '@/lib/api-result';
import { geocodeAddress, lookupWeatherData, buildStateFallback } from '@/domains/weather/ashrae-client';

/**
 * GET /api/weather?lat=33.63&lng=-84.44
 * GET /api/weather?city=Atlanta&state=GA&zip=30309&address=1240+Peachtree+St
 *
 * Accepts either lat/lng directly, or address fields (geocoded via Nominatim).
 * Returns: { station, designConditions, allStations } ready to store on a project.
 */

export const GET = withAuth(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  let lat = parseFloat(searchParams.get('lat') || '');
  let lng = parseFloat(searchParams.get('lng') || '');
  const state = searchParams.get('state') || '';
  const city = searchParams.get('city') || '';
  const zip = searchParams.get('zip') || '';
  const address = searchParams.get('address') || '';

  if (isNaN(lat) || isNaN(lng)) {
    if (!city && !zip) {
      return badRequest('Provide lat/lng or city/state/zip');
    }
    try {
      const coords = await geocodeAddress(address, city, state, zip);
      lat = coords.lat;
      lng = coords.lng;
    } catch (geoErr) {
      return badRequest(geoErr instanceof Error ? geoErr.message : 'Geocoding failed');
    }
  }

  try {
    const result = await lookupWeatherData(lat, lng);
    return ok(result);
  } catch (err) {
    console.error('ASHRAE API error:', err);

    const errorMessage = err instanceof Error ? err.message : 'ASHRAE API unavailable';
    const fallback = buildStateFallback(state, lat, lng, errorMessage);
    if (fallback) return ok(fallback);

    return upstreamError('Failed to fetch weather data and no fallback available for this state');
  }
});
