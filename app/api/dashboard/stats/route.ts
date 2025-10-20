import { sql } from '@/lib/database';
import { database } from '@/lib/firebase';
import { getAuthUser } from '@/lib/auth-middleware';
import { NextRequest, NextResponse } from 'next/server';

// Ensure this API is always dynamic and never cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  let databaseError = null;
  let firebaseError = null;

  try {
    console.log('Starting dashboard stats API call...');

    // Get authenticated user
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total packages count and status distribution
    let packageStats;
    try {
      console.log('Fetching package stats from PostgreSQL...');

      if (user.role === 'admin') {
        packageStats = await sql`
          SELECT
            COUNT(*) as total_packages,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
            COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
            COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
            COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery
          FROM packages
        `;
      } else if (user.role === 'agent') {
        packageStats = await sql`
          SELECT
            COUNT(*) as total_packages,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
            COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
            COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
            COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery
          FROM packages
          WHERE origin_branch_id = ${user.branch_id} OR destination_branch_id = ${user.branch_id}
        `;
      } else {
        // For other roles, return empty stats
        packageStats = [{
          total_packages: 0,
          delivered: 0,
          in_transit: 0,
          registered: 0,
          out_for_delivery: 0
        }];
      }
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

      if (user.role === 'admin') {
        paymentStats = await sql`
          SELECT
            COUNT(*) as total_payments,
            COALESCE(SUM(amount)::numeric, 0) as total_amount,
            COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) as confirmed_payments,
            COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments
          FROM payments
        `;
      } else if (user.role === 'agent') {
        paymentStats = await sql`
          SELECT
            COUNT(p.*) as total_payments,
            COALESCE(SUM(p.amount)::numeric, 0) as total_amount,
            COUNT(CASE WHEN p.payment_status = 'confirmed' THEN 1 END) as confirmed_payments,
            COUNT(CASE WHEN p.payment_status = 'pending' THEN 1 END) as pending_payments
          FROM payments p
          INNER JOIN packages pkg ON p.package_id = pkg.package_id
          WHERE pkg.origin_branch_id = ${user.branch_id} OR pkg.destination_branch_id = ${user.branch_id}
        `;
      } else {
        paymentStats = [{
          total_payments: 0,
          total_amount: 0,
          confirmed_payments: 0,
          pending_payments: 0
        }];
      }
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
    let recentPackagesResult: any[];
    let recentPackages: Array<{
      package_id: string;
      sender_name: string;
      receiver_name: string;
      status: string;
      current_location: string;
      payment_status: string;
      created_at: string;
      package_type: string;
    }> = [];
    try {
      console.log('Fetching recent packages from PostgreSQL...');

      if (user.role === 'admin') {
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
      } else if (user.role === 'agent') {
        recentPackagesResult = await sql`
          SELECT
            p.package_id,
            p.sender_name,
            p.receiver_name,
            p.status,
            p.created_at,
            t.status as current_status,
            t.location_name as current_location,
            pay.payment_status,
            CASE
              WHEN p.origin_branch_id = ${user.branch_id} THEN 'outgoing'
              WHEN p.destination_branch_id = ${user.branch_id} THEN 'incoming'
              ELSE 'other'
            END as package_type
          FROM packages p
          LEFT JOIN (
            SELECT DISTINCT ON (package_id) package_id, status, location_name
            FROM tracking
            ORDER BY package_id, created_at DESC
          ) t ON p.package_id = t.package_id
          LEFT JOIN payments pay ON p.package_id = pay.package_id
          WHERE p.origin_branch_id = ${user.branch_id} OR p.destination_branch_id = ${user.branch_id}
          ORDER BY p.created_at DESC
          LIMIT 6
        `;
      } else {
        recentPackagesResult = [];
      }
      console.log('Recent packages query successful, found:', recentPackagesResult?.length || 0, 'packages');

      // Format recent packages to match the expected interface
      recentPackages = (recentPackagesResult || []).map((pkg: any) => ({
        package_id: pkg.tracking_number || pkg.package_id,
        sender_name: pkg.sender_name,
        receiver_name: pkg.receiver_name,
        status: pkg.current_status || pkg.status,
        current_location: pkg.current_location || 'Location not available',
        payment_status: pkg.payment_status || 'pending',
        created_at: pkg.created_at ? new Date(pkg.created_at).toISOString() : new Date().toISOString(),
        package_type: pkg.package_type || 'other'
      }));
    } catch (recentError) {
      databaseError = databaseError ? `${databaseError}; Recent packages error: ${recentError}` : `Recent packages error: ${recentError}`;
      console.error('Recent packages query failed:', recentError);
      recentPackages = [] as Array<{
        package_id: string;
        sender_name: string;
        receiver_name: string;
        status: string;
        current_location: string;
        payment_status: string;
        created_at: string;
        package_type: string;
      }>;
    }

    // Get fleet statistics from Firebase with enhanced data
    let fleetStats = {
      total_vehicles: 0,
      active_vehicles: 0,
      available_vehicles: 0,
      maintenance_vehicles: 0,
      vehicles: []
    };

    try {
      console.log('Fetching fleet stats from Firebase...');
      const vehiclesRef = database.ref('vehicles');
      const snapshot = await vehiclesRef.once('value');
      const vehicles = snapshot.val();

      if (vehicles) {
        const vehiclesArray = Object.entries(vehicles).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        
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
          ).length,
          vehicles: vehiclesArray
        };
        console.log('Firebase fleet stats successful:', fleetStats);
      } else {
        console.log('No vehicles found in Firebase');
        firebaseError = 'No vehicles data found in Firebase';
      }
    } catch (firebaseErr) {
      firebaseError = `Firebase vehicles error: ${firebaseErr}`;
      console.error('Firebase vehicles error:', firebaseErr);
    }

    // Get location history for vehicles
    let locationHistory = {};
    try {
      console.log('Fetching location history from Firebase...');
      const locationHistoryRef = database.ref('location_history');
      const locationSnapshot = await locationHistoryRef.once('value');
      const historyData = locationSnapshot.val();
      
      if (historyData) {
        locationHistory = historyData;
        console.log('Location history fetched successfully');
      }
    } catch (historyError) {
      console.error('Error fetching location history:', historyError);
    }

    // Prepare the response data with enhanced fleet information
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
      locationHistory,
      
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
      locationHistoryCount: Object.keys(responseData.locationHistory).length,
      errors: {
        database: databaseError,
        firebase: firebaseError
      }
    });

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'no-store' }
    });

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
      recentPackages: [] as Array<{
        package_id: string;
        sender_name: string;
        receiver_name: string;
        status: string;
        current_location: string;
        payment_status: string;
        created_at: string;
        package_type: string;
      }>,
      fleetStats: {
        total_vehicles: 0,
        active_vehicles: 0,
        available_vehicles: 0,
        maintenance_vehicles: 0,
        vehicles: []
      },
      locationHistory: {},
      
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

    return NextResponse.json(errorResponse, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
