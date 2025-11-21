import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

/**
 * Geocode an address using Google Maps Geocoding API
 * Falls back to OpenCage if Google Maps fails
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  postcode?: string
): Promise<GeocodingResult | null> {
  // Build full address string
  const addressParts = [address, city, state, postcode, 'Malaysia'].filter(
    Boolean
  );
  const fullAddress = addressParts.join(', ');

  console.log(`Geocoding address: ${fullAddress}`);

  // Try Google Maps first
  const googleResult = await geocodeWithGoogle(fullAddress);
  if (googleResult) {
    return googleResult;
  }

  // Fallback to OpenCage (free tier)
  const openCageResult = await geocodeWithOpenCage(fullAddress);
  if (openCageResult) {
    return openCageResult;
  }

  console.error('All geocoding services failed');
  return null;
}

/**
 * Geocode using Google Maps Geocoding API
 */
async function geocodeWithGoogle(
  address: string
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: apiKey,
        },
        timeout: 5000,
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      const formattedAddress = response.data.results[0].formatted_address;

      console.log('Google Maps geocoding successful');
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress,
      };
    }

    console.warn(`Google Maps geocoding failed: ${response.data.status}`);
    return null;
  } catch (error: any) {
    console.error('Google Maps geocoding error:', error.message);
    return null;
  }
}

/**
 * Geocode using OpenCage Geocoding API (free tier: 2,500 requests/day)
 */
async function geocodeWithOpenCage(
  address: string
): Promise<GeocodingResult | null> {
  const apiKey = process.env.OPENCAGE_API_KEY;

  if (!apiKey) {
    console.warn('OpenCage API key not configured');
    return null;
  }

  try {
    const response = await axios.get(
      'https://api.opencagedata.com/geocode/v1/json',
      {
        params: {
          q: address,
          key: apiKey,
          limit: 1,
          countrycode: 'my', // Restrict to Malaysia
        },
        timeout: 5000,
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const { lat, lng } = result.geometry;
      const formattedAddress = result.formatted;

      console.log('OpenCage geocoding successful');
      return {
        latitude: lat,
        longitude: lng,
        formattedAddress,
      };
    }

    console.warn('OpenCage geocoding returned no results');
    return null;
  } catch (error: any) {
    console.error('OpenCage geocoding error:', error.message);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Batch geocode job locations (can be run as a background job)
 */
export async function batchGeocodeJobs(prisma: any) {
  console.log('Starting batch geocoding of jobs...');

  const jobsWithoutCoordinates = await prisma.job.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      postcode: true,
    },
  });

  console.log(`Found ${jobsWithoutCoordinates.length} jobs to geocode`);

  let successCount = 0;
  let failCount = 0;

  for (const job of jobsWithoutCoordinates) {
    try {
      const result = await geocodeAddress(
        job.address || '',
        job.city,
        job.state,
        job.postcode || undefined
      );

      if (result) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
        });
        successCount++;
        console.log(`✓ Geocoded job ${job.id}`);
      } else {
        failCount++;
        console.log(`✗ Failed to geocode job ${job.id}`);
      }

      // Rate limiting: wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      failCount++;
      console.error(`Error geocoding job ${job.id}:`, error);
    }
  }

  console.log(
    `Batch geocoding complete: ${successCount} success, ${failCount} failed`
  );
  return { successCount, failCount };
}
