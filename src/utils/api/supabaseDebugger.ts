import { supabase } from '../../lib/supabase';

export interface DatabaseDiagnostics {
  connectionStatus: 'connected' | 'error' | 'unknown';
  subscriptionPricesStatus: {
    tableExists: boolean;
    recordCount: number;
    sampleData: any[];
    error?: string;
  };
  batteryPricesStatus: {
    tableExists: boolean;
    recordCount: number;
    sampleData: any[];
    error?: string;
  };
  subsidiesStatus: {
    tableExists: boolean;
    recordCount: number;
    sampleData: any[];
    error?: string;
  };
  lastChecked: Date;
}

export async function runDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
  const diagnostics: DatabaseDiagnostics = {
    connectionStatus: 'unknown',
    subscriptionPricesStatus: {
      tableExists: false,
      recordCount: 0,
      sampleData: []
    },
    batteryPricesStatus: {
      tableExists: false,
      recordCount: 0,
      sampleData: []
    },
    subsidiesStatus: {
      tableExists: false,
      recordCount: 0,
      sampleData: []
    },
    lastChecked: new Date()
  };

  try {
    // Test basic connection
    console.log('🔍 Testing Supabase connection...');
    const { error: connectionError } = await supabase
      .from('subscription_prices')
      .select('count')
      .limit(0);
    
    if (connectionError) {
      diagnostics.connectionStatus = 'error';
      console.error('❌ Supabase connection failed:', connectionError);
    } else {
      diagnostics.connectionStatus = 'connected';
      console.log('✅ Supabase connection successful');
    }

    // Test subscription_prices table
    try {
      console.log('🔍 Testing subscription_prices table...');
      const { data: subscriptionData, count, error: subscriptionError } = await supabase
        .from('subscription_prices')
        .select('*', { count: 'exact' })
        .limit(5);

      if (subscriptionError) {
        diagnostics.subscriptionPricesStatus.error = subscriptionError.message;
        console.error('❌ subscription_prices query failed:', subscriptionError);
      } else {
        diagnostics.subscriptionPricesStatus.tableExists = true;
        diagnostics.subscriptionPricesStatus.recordCount = count || 0;
        diagnostics.subscriptionPricesStatus.sampleData = subscriptionData || [];
        console.log(`✅ subscription_prices: ${count} records found`);
      }
    } catch (err) {
      diagnostics.subscriptionPricesStatus.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ subscription_prices table error:', err);
    }

    // Test battery_prices_purchase table
    try {
      console.log('🔍 Testing battery_prices_purchase table...');
      const { data: batteryData, count, error: batteryError } = await supabase
        .from('battery_prices_purchase')
        .select('*', { count: 'exact' })
        .limit(5);

      if (batteryError) {
        diagnostics.batteryPricesStatus.error = batteryError.message;
        console.error('❌ battery_prices_purchase query failed:', batteryError);
      } else {
        diagnostics.batteryPricesStatus.tableExists = true;
        diagnostics.batteryPricesStatus.recordCount = count || 0;
        diagnostics.batteryPricesStatus.sampleData = batteryData || [];
        console.log(`✅ battery_prices_purchase: ${count} records found`);
      }
    } catch (err) {
      diagnostics.batteryPricesStatus.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ battery_prices_purchase table error:', err);
    }

    // Test subsidies table
    try {
      console.log('🔍 Testing subsidies table...');
      const { data: subsidiesData, count, error: subsidiesError } = await supabase
        .from('subsidies')
        .select('*', { count: 'exact' })
        .order('power_range');

      if (subsidiesError) {
        diagnostics.subsidiesStatus.error = subsidiesError.message;
        console.error('❌ subsidies query failed:', subsidiesError);
      } else {
        diagnostics.subsidiesStatus.tableExists = true;
        diagnostics.subsidiesStatus.recordCount = count || 0;
        diagnostics.subsidiesStatus.sampleData = subsidiesData || [];
        console.log(`✅ subsidies: ${count} records found`);
      }
    } catch (err) {
      diagnostics.subsidiesStatus.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ subsidies table error:', err);
    }

  } catch (globalError) {
    diagnostics.connectionStatus = 'error';
    console.error('❌ Global database diagnostic error:', globalError);
  }

  return diagnostics;
}

export function logDatabaseDiagnostics(diagnostics: DatabaseDiagnostics): void {
  console.group('📊 Database Diagnostics Report');
  console.log('🕐 Last checked:', diagnostics.lastChecked.toLocaleString());
  console.log('🔗 Connection status:', diagnostics.connectionStatus);
  
  console.group('📋 Subscription Prices Table');
  console.log('Table exists:', diagnostics.subscriptionPricesStatus.tableExists);
  console.log('Record count:', diagnostics.subscriptionPricesStatus.recordCount);
  if (diagnostics.subscriptionPricesStatus.error) {
    console.error('Error:', diagnostics.subscriptionPricesStatus.error);
  }
  if (diagnostics.subscriptionPricesStatus.sampleData.length > 0) {
    console.log('Sample data:', diagnostics.subscriptionPricesStatus.sampleData);
  }
  console.groupEnd();
  
  console.group('🔋 Battery Prices Table');
  console.log('Table exists:', diagnostics.batteryPricesStatus.tableExists);
  console.log('Record count:', diagnostics.batteryPricesStatus.recordCount);
  if (diagnostics.batteryPricesStatus.error) {
    console.error('Error:', diagnostics.batteryPricesStatus.error);
  }
  if (diagnostics.batteryPricesStatus.sampleData.length > 0) {
    console.log('Sample data:', diagnostics.batteryPricesStatus.sampleData);
  }
  console.groupEnd();

  console.group('💰 Subsidies Table');
  console.log('Table exists:', diagnostics.subsidiesStatus.tableExists);
  console.log('Record count:', diagnostics.subsidiesStatus.recordCount);
  if (diagnostics.subsidiesStatus.error) {
    console.error('Error:', diagnostics.subsidiesStatus.error);
  }
  if (diagnostics.subsidiesStatus.sampleData.length > 0) {
    console.log('Sample data:', diagnostics.subsidiesStatus.sampleData);
  }
  console.groupEnd();
  
  console.groupEnd();
}