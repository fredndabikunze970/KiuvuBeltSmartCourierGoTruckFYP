import { sql } from '@/lib/database';
import { database } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export async function GET() {
  let databaseError = null;
  let firebaseError = null;

  try {
    console.log('Starting dashboard stats API call...');

    // Get total packages count and status distribution
    let packageStats;
    try {
      console.log('Fetching package stats from PostgreSQL...');
      packageStats = await sql`
        SELECT 
          COUNT(*) as total_packages,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
          COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
          COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery
        FROM packages
      `;
      console.log('Package stats query successful:', packageStats[0]);
    } catch (pkgError) {
      databaseError = `Package stats error: ${pkgError}`;
      console.error('Package stats query failed:', pkgError);
      packageStats = [{
        total_packages: 0,
        delivered: 0,
        in_transit: 0,
        registered: 0,
        out_for_delivery: 0
      }];
    }

    // Get payment statistics
    let paymentStats;
    try {
      console.log('Fetching payment stats from PostgreSQL...');
      paymentStats = await sql`
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount)::numeric, 0) as total_amount,
          COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) as confirmed_payments,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments
        FROM payments
      `;
      console.log('Payment stats query successful:', paymentStats[0]);
    } catch (payError) {
      databaseError = databaseError ? `${databaseError}; Payment stats error: ${payError}` : `Payment stats error: ${payError}`;
      console.error('Payment stats query failed:', payError);
      paymentStats = [{
        total_payments: 0,
        total_amount: 0,
        confirmed_payments: 0,
        pending_payments: 0
      }];
    }

    // Get recent packages with tracking and payment info
    let recentPackagesResult;
    let recentPackages = [];
    try {
      console.log('Fetching recent packages from PostgreSQL...');
      recentPackagesResult = await sql`
        SELECT 
          p.package_id,
          p.sender_name,
          p.receiver_name,
          p.status,
          p.created_at,
          t.status as current_status, 
          t.location_name as current_location,
          pay.payment_status
        FROM packages p
        LEFT JOIN (
          SELECT DISTINCT ON (package_id) package_id, status, location_name
          FROM tracking
          ORDER BY package_id, created_at DESC
        ) t ON p.package_id = t.package_id
        LEFT JOIN payments pay ON p.package_id = pay.package_id
        ORDER BY p.created_at DESC
        LIMIT 6
      `;
      console.log('Recent packages query successful, found:', recentPackagesResult?.length || 0, 'packages');

      // Format recent packages to match the expected interface
      recentPackages = (recentPackagesResult || []).map((pkg: any) => ({
        package_id: pkg.tracking_number || pkg.package_id,
        sender_name: pkg.sender_name,
        receiver_name: pkg.receiver_name,
        status: pkg.current_status || pkg.status,
        current_location: pkg.current_location || 'Location not available',
        payment_status: pkg.payment_status || 'pending',
        created_at: pkg.created_at ? new Date(pkg.created_at).toISOString() : new Date().toISOString()
      }));
    } catch (recentError) {
      databaseError = databaseError ? `${databaseError}; Recent packages error: ${recentError}` : `Recent packages error: ${recentError}`;
      console.error('Recent packages query failed:', recentError);
      recentPackages = [];
    }

    // Get fleet statistics from Firebase
    let fleetStats = {
      total_vehicles: 0,
      active_vehicles: 0,
      available_vehicles: 0,
      maintenance_vehicles: 0
    };

    try {
      console.log('Fetching fleet stats from Firebase...');
      const vehiclesRef = database.ref('vehicles');
      const snapshot = await vehiclesRef.once('value');
      const vehicles = snapshot.val();

      if (vehicles) {
        const vehiclesArray = Object.values(vehicles) as any[];
        console.log(`Found ${vehiclesArray.length} vehicles in Firebase`);
        
        fleetStats = {
          total_vehicles: vehiclesArray.length,
          active_vehicles: vehiclesArray.filter(vehicle => 
            vehicle.status === 'in_transit' || vehicle.status === 'out_for_delivery'
          ).length,
          available_vehicles: vehiclesArray.filter(vehicle => 
            vehicle.status === 'available'
          ).length,
          maintenance_vehicles: vehiclesArray.filter(vehicle => 
            vehicle.status === 'maintenance'
          ).length
        };
        console.log('Firebase fleet stats successful:', fleetStats);
      } else {
        console.log('No vehicles found in Firebase');
        firebaseError = 'No vehicles data found in Firebase';
        // Use sample data for development
        fleetStats = {
          total_vehicles: 2,
          active_vehicles: 1,
          available_vehicles: 1,
          maintenance_vehicles: 0
        };
      }
    } catch (firebaseErr) {
      firebaseError = `Firebase vehicles error: ${firebaseErr}`;
      console.error('Firebase vehicles error:', firebaseErr);
      // Use sample data for development
      fleetStats = {
        total_vehicles: 2,
        active_vehicles: 1,
        available_vehicles: 1,
        maintenance_vehicles: 0
      };
    }

    // Prepare the response data with debug information
    const responseData = {
      // Real data from databases
      packageStats: packageStats?.[0] || {
        total_packages: 0,
        delivered: 0,
        in_transit: 0,
        registered: 0,
        out_for_delivery: 0
      },
      paymentStats: paymentStats?.[0] || {
        total_payments: 0,
        total_amount: 0,
        confirmed_payments: 0,
        pending_payments: 0
      },
      recentPackages,
      fleetStats,
      
      // Debug information
      debug: {
        databaseConnected: !databaseError,
        firebaseConnected: !firebaseError,
        databaseError: databaseError || null,
        firebaseError: firebaseError || null,
        recentPackagesCount: recentPackages.length,
        timestamp: new Date().toISOString(),
        dataSource: 'REAL_DATABASE'
      },
      
      timestamp: new Date().toISOString()
    };

    console.log('API response prepared with real data:', {
      packageCount: responseData.packageStats.total_packages,
      paymentCount: responseData.paymentStats.total_payments,
      recentPackagesCount: responseData.recentPackages.length,
      fleetCount: responseData.fleetStats.total_vehicles,
      errors: {
        database: databaseError,
        firebase: firebaseError
      }
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Dashboard stats API complete failure:', error);
    
    // Return error information with minimal mock data
    const errorResponse = {
      // Minimal mock data as fallback
      packageStats: {
        total_packages: 0,
        delivered: 0,
        in_transit: 0,
        registered: 0,
        out_for_delivery: 0
      },
      paymentStats: {
        total_payments: 0,
        total_amount: 0,
        confirmed_payments: 0,
        pending_payments: 0
      },
      recentPackages: [],
      fleetStats: {
        total_vehicles: 0,
        active_vehicles: 0,
        available_vehicles: 0,
        maintenance_vehicles: 0
      },
      
      // Detailed error information
      debug: {
        databaseConnected: false,
        firebaseConnected: false,
        databaseError: `API Error: ${error}`,
        firebaseError: 'API failed completely',
        recentPackagesCount: 0,
        timestamp: new Date().toISOString(),
        dataSource: 'ERROR_FALLBACK'
      },
      
      timestamp: new Date().toISOString(),
      error: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}