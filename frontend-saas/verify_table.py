import psycopg2

conn = psycopg2.connect(
    "postgres://postgres.csuziaogycciwgxxmahm:A3649ob%235002@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
)
cur = conn.cursor()

# Check if table exists
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    ORDER BY ordinal_position
""")

columns = cur.fetchall()

print("user_profiles table columns:")
print("-" * 50)
for col in columns:
    print(f"{col[0]}: {col[1]}")

print("\n" + "=" * 50)
print(f"Total columns: {len(columns)}")

cur.close()
conn.close()
