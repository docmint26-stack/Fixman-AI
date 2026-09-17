"""Owner read policies; all application writes go through authenticated FastAPI.

No anon/authenticated INSERT/UPDATE/DELETE grants on server-owned application tables.
The backend PostgreSQL role must own these tables or hold BYPASSRLS.
"""
from alembic import op

revision = "20260917_rls"
down_revision = "76d47059c7bc"
branch_labels = None
depends_on = None

OWNED = ["cases", "case_evidence", "diagnosis_runs", "fix_attempts", "outcomes", "contributions", "reward_ledger", "reputation_events", "wallet_links", "notifications", "user_settings", "account_deletion_requests"]
PRIVATE = ["case_fix_recommendations", "knowledge_attributions", "audit_events", "fixes"]


def upgrade():
    if op.get_bind().dialect.name != "postgresql":
        return
    # Works on both standalone PostgreSQL and Supabase. Only Supabase has these roles/auth.uid().
    for table in ["profiles", *OWNED, *PRIVATE]:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
    for table in ["profiles", *OWNED]:
        column = "auth_user_id" if table == "profiles" else "user_id"
        op.execute(f"""DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') AND to_regprocedure('auth.uid()') IS NOT NULL THEN
          EXECUTE 'REVOKE ALL ON {table} FROM anon, authenticated';
          EXECUTE 'GRANT SELECT ON {table} TO authenticated';
          EXECUTE 'CREATE POLICY owner_read ON {table} FOR SELECT TO authenticated USING ({column} = auth.uid())';
        END IF; END $$;""")
    for table in PRIVATE:
        op.execute(f"""DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        EXECUTE 'REVOKE ALL ON {table} FROM anon, authenticated'; END IF; END $$;""")
    op.execute("""DO $$ BEGIN IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('puvexa-evidence', 'puvexa-evidence', false, 15728640)
    ON CONFLICT (id) DO UPDATE SET public=false;
    END IF; END $$;""")


def downgrade():
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in ["profiles", *OWNED]:
        op.execute(f'DROP POLICY IF EXISTS owner_read ON "{table}"')
    # Keep RLS enabled and the bucket private on downgrade; fail closed.
