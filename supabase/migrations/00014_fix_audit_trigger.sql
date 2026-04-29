-- Fix audit trigger to include actor_type (required NOT NULL field)
-- The original trigger in 00007 omits actor_type, causing inserts to fail

CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    old_data,
    new_data,
    user_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    COALESCE(current_setting('app.actor_type', true), 'system'),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
