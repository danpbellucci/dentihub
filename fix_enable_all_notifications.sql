
-- Forçar a ativação de todas as notificações para todos os perfis existentes
DO $$
DECLARE
    r record;
    t text;
    types text[] := ARRAY['new_request_alert', 'agenda_daily', 'finance_daily', 'stock_low', 'system_campaigns'];
    std_roles text[] := ARRAY['administrator', 'dentist', 'employee'];
    role_name text;
BEGIN
    -- 1. Garantir que papéis padrão em todas as clínicas tenham notificações habilitadas
    FOR r IN SELECT id FROM public.clinics LOOP
        FOREACH t IN ARRAY types LOOP
            FOREACH role_name IN ARRAY std_roles LOOP
                INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
                VALUES (r.id, role_name, t, true)
                ON CONFLICT (clinic_id, role, notification_type) 
                DO UPDATE SET is_enabled = true;
            END LOOP;
        END LOOP;
    END LOOP;

    -- 2. Garantir que papéis personalizados existentes tenham notificações habilitadas
    FOR r IN SELECT clinic_id, name FROM public.clinic_roles LOOP
        FOREACH t IN ARRAY types LOOP
            INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
            VALUES (r.clinic_id, r.name, t, true)
            ON CONFLICT (clinic_id, role, notification_type)
            DO UPDATE SET is_enabled = true;
        END LOOP;
    END LOOP;
END $$;
