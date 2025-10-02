// utils/geocoding-service.ts
interface GeocodingResult {
  address: string;
  fullAddress: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
}

class GeocodingService {
  private cache = new Map<string, GeocodingResult>();
  private lastRequestTime = 0;
  private readonly MIN_INTERVAL = 1200; // 1.2 seconds between requests
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Try multiple geocoding services in sequence
  private async tryGeocodingServices(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    const services = [
      this.tryLocationIQ.bind(this),
      this.tryGoogleGeocoding.bind(this),
      this.tryOpenStreetMap.bind(this)
    ];

    for (const service of services) {
      try {
        const result = await service(latitude, longitude);
        if (result && result.address !== 'Coordinate location') {
          return result;
        }
      } catch (error) {
        console.warn(`Geocoding service failed:`, error);
        continue;
      }
      // Wait between service attempts
      await this.delay(300);
    }
    return null;
  }

  private async tryLocationIQ(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    const API_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;
    
    if (!API_KEY) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${API_KEY}&lat=${latitude}&lon=${longitude}&format=json&zoom=16&addressdetails=1`,
        {
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('LocationIQ rate limit exceeded');
        }
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.display_name) {
        return this.formatLocationIQResult(data);
      }
    } catch (error) {
      console.warn('LocationIQ geocoding failed:', error);
      throw error;
    }

    return null;
  }

  private async tryGoogleGeocoding(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    
    if (!API_KEY) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`,
        {
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return this.formatGoogleResult(data.results[0]);
      }
    } catch (error) {
      console.warn('Google geocoding failed:', error);
      throw error;
    }

    return null;
  }

  private async tryOpenStreetMap(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DeliveryDashboard/1.0',
            'Accept-Language': 'en',
            'Referer': 'http://localhost:3000'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('OpenStreetMap rate limit exceeded');
        }
        throw new Error(`OSM API error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.display_name) {
        return this.formatOpenStreetMapResult(data);
      }
    } catch (error) {
      console.warn('OpenStreetMap geocoding failed:', error);
      throw error;
    }

    return null;
  }

  private formatLocationIQResult(data: any): GeocodingResult {
    const address = data.address || {};
    
    const addressParts = [];
    if (address.road) addressParts.push(address.road);
    if (address.neighbourhood) addressParts.push(address.neighbourhood);
    if (address.suburb) addressParts.push(address.suburb);
    if (address.city) addressParts.push(address.city);
    if (address.county) addressParts.push(address.county);
    if (address.state) addressParts.push(address.state);
    if (address.country) addressParts.push(address.country);

    const fullAddress = data.display_name;

    return {
      address: this.getShortAddress(addressParts),
      fullAddress: fullAddress,
      district: address.state_district || address.county,
      sector: address.suburb || address.neighbourhood,
      cell: address.city_district,
      village: address.village
    };
  }

  private formatGoogleResult(result: any): GeocodingResult {
    const addressComponents = result.address_components || [];
    
    let road = '';
    let neighbourhood = '';
    let suburb = '';
    let city = '';
    let district = '';
    let state = '';
    let country = '';

    addressComponents.forEach((component: any) => {
      const types = component.types;
      if (types.includes('route')) road = component.long_name;
      if (types.includes('neighborhood')) neighbourhood = component.long_name;
      if (types.includes('sublocality')) suburb = component.long_name;
      if (types.includes('locality')) city = component.long_name;
      if (types.includes('administrative_area_level_2')) district = component.long_name;
      if (types.includes('administrative_area_level_1')) state = component.long_name;
      if (types.includes('country')) country = component.long_name;
    });

    const addressParts = [];
    if (road) addressParts.push(road);
    if (neighbourhood) addressParts.push(neighbourhood);
    if (suburb) addressParts.push(suburb);
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);
    if (country) addressParts.push(country);

    return {
      address: this.getShortAddress(addressParts),
      fullAddress: result.formatted_address,
      district: district,
      sector: suburb || neighbourhood,
      cell: city,
      village: neighbourhood
    };
  }

  private formatOpenStreetMapResult(data: any): GeocodingResult {
    const address = data.address || {};
    
    const addressParts = [];
    if (address.road) addressParts.push(address.road);
    if (address.neighbourhood) addressParts.push(address.neighbourhood);
    if (address.suburb) addressParts.push(address.suburb);
    if (address.city) addressParts.push(address.city);
    if (address.county) addressParts.push(address.county);
    if (address.state) addressParts.push(address.state);
    if (address.country) addressParts.push(address.country);

    const fullAddress = data.display_name;

    return {
      address: this.getShortAddress(addressParts),
      fullAddress: fullAddress,
      district: address.state_district || address.county,
      sector: address.suburb || address.neighbourhood,
      cell: address.city_district,
      village: address.village
    };
  }

  private getShortAddress(parts: string[]): string {
    if (parts.length === 0) return 'Coordinate location';
    return parts.slice(0, Math.min(2, parts.length)).join(', ');
  }

  private generateCoordinateAddress(latitude: number, longitude: number): GeocodingResult {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    const latAbs = Math.abs(latitude).toFixed(6);
    const lonAbs = Math.abs(longitude).toFixed(6);
    
    const coordinateAddress = `${latAbs}°${latDir}, ${lonAbs}°${lonDir}`;
    
    return {
      address: `Location at ${coordinateAddress}`,
      fullAddress: `GPS Coordinates: ${coordinateAddress}`,
      district: 'GPS Location',
      sector: 'Coordinate-based'
    };
  }

  private async makeGeocodingRequest(latitude: number, longitude: number): Promise<GeocodingResult> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_INTERVAL) {
      await this.delay(this.MIN_INTERVAL - timeSinceLastRequest);
    }

    try {
      this.lastRequestTime = Date.now();
      
      console.log(`🔍 Geocoding coordinates: ${latitude}, ${longitude}`);
      
      const result = await this.tryGeocodingServices(latitude, longitude);
      
      if (result) {
        console.log(`✅ Geocoding successful: ${result.address}`);
        return result;
      }
      
      console.log('⚠️ All geocoding services failed, using coordinate address');
      return this.generateCoordinateAddress(latitude, longitude);
      
    } catch (error) {
      console.error('❌ Geocoding completely failed:', error);
      return this.generateCoordinateAddress(latitude, longitude);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        await this.delay(this.MIN_INTERVAL);
      }
    }
    
    this.isProcessing = false;
  }

  async geocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    return new Promise((resolve) => {
      const request = async () => {
        try {
          const result = await this.makeGeocodingRequest(latitude, longitude);
          this.cache.set(cacheKey, result);
          setTimeout(() => this.cache.delete(cacheKey), this.CACHE_DURATION);
          resolve(result);
        } catch (error) {
          const fallbackResult = this.generateCoordinateAddress(latitude, longitude);
          this.cache.set(cacheKey, fallbackResult);
          resolve(fallbackResult);
        }
      };

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  getCoordinatesDisplay(latitude: number, longitude: number): string {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    const latAbs = Math.abs(latitude).toFixed(6);
    const lonAbs = Math.abs(longitude).toFixed(6);
    return `${latAbs}°${latDir}, ${lonAbs}°${lonDir}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const geocodingService = new GeocodingService();