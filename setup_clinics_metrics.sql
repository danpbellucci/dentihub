
-- RPC para buscar métricas por clínica no God Mode
CREATE OR REPLACE FUNCTION public.get_clinics_metrics(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
    clinic_id UUID,
    clinic_name TEXT,
    dentists_count BIGINT,
    patients_count BIGINT,
    appointments_count BIGINT,
    transactions_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as clinic_id,
        c.name as clinic_name,
        (SELECT count(*) FROM dentists d WHERE d.clinic_id = c.id) as dentists_count,
        (SELECT count(*) FROM clients cl WHERE cl.clinic_id = c.id) as patients_count,
        (SELECT count(*) FROM appointments app WHERE app.clinic_id = c.id AND app.created_at BETWEEN p_start_date AND p_end_date) as appointments_count,
        (SELECT count(*) FROM transactions tr WHERE tr.clinic_id = c.id AND tr.date BETWEEN p_start_date AND p_end_date) as transactions_count
    FROM clinics c
    ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clinics_metrics TO authenticated;
