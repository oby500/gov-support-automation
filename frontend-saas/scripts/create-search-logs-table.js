/**
 * Search Logs 테이블 생성 스크립트
 *
 * 실행 방법:
 * node scripts/create-search-logs-table.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local 로드
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSearchLogsTable() {
  console.log('🔧 Creating search_logs table...\n');

  try {
    // SQL 파일 읽기
    const sqlPath = join(__dirname, '../sql/create_search_logs_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // SQL 실행 (Supabase JS 클라이언트는 DDL 직접 실행 불가능)
    // 대신 REST API 사용
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Supabase JS 클라이언트로 테이블 확인
      const { data, error } = await supabase
        .from('search_logs')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.error('❌ Table does not exist. Please run the SQL manually in Supabase Dashboard:');
        console.error('   1. Go to https://app.supabase.com');
        console.error('   2. Select your project');
        console.error('   3. Go to SQL Editor');
        console.error('   4. Run the SQL from: frontend-saas/sql/create_search_logs_table.sql\n');
        process.exit(1);
      } else if (!error) {
        console.log('✅ search_logs table already exists!');
        return;
      }
    }

    console.log('✅ search_logs table created successfully!\n');

    // 테이블 확인
    const { data: tables, error: tablesError } = await supabase
      .from('search_logs')
      .select('*')
      .limit(1);

    if (tablesError) {
      console.warn('⚠️  Warning: Could not verify table creation:', tablesError.message);
    } else {
      console.log('✅ Table verification successful!');
    }

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    console.error('\n📝 Manual setup required:');
    console.error('   1. Go to https://app.supabase.com');
    console.error('   2. Select your project');
    console.error('   3. Go to SQL Editor');
    console.error('   4. Run the SQL from: frontend-saas/sql/create_search_logs_table.sql\n');
    process.exit(1);
  }
}

// 실행
createSearchLogsTable()
  .then(() => {
    console.log('\n🎉 Setup complete!');
    console.log('   Search logging is now ready to use.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
