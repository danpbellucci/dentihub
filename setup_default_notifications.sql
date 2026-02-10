
-- ============================================================================
-- AUTOMAÇÃO: HABILITAR NOTIFICAÇÕES POR PADRÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_notifications_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    t text;
    -- Lista de todos os tipos de notificação do sistema
    types text[] := ARRAY['new_request_alert', 'agenda_daily', 'finance_daily', 'stock_low', 'system_campaigns'];
    role_name text;
BEGIN
    -- CENÁRIO 1: Nova Clínica criada
    -- Habilita tudo para os papéis padrão do sistema
    IF TG_TABLE_NAME = 'clinics' THEN
        FOREACH t IN ARRAY types LOOP
            -- Administrador
            INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled) 
            VALUES (NEW.id, 'administrator', t, true) ON CONFLICT DO NOTHING;
            
            -- Dentista
            INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled) 
            VALUES (NEW.id, 'dentist', t, true) ON CONFLICT DO NOTHING;
            
            -- Funcionário
            INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled) 
            VALUES (NEW.id, 'employee', t, true) ON CONFLICT DO NOTHING;
        END LOOP;

    -- CENÁRIO 2: Novo Papel Personalizado (Clinic Role) criado
    -- Habilita tudo para o novo papel criado
    ELSIF TG_TABLE_NAME = 'clinic_roles' THEN
        FOREACH t IN ARRAY types LOOP
            INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
            VALUES (NEW.clinic_id, NEW.name, t, true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger para Clínicas (Ao cadastrar, configura os defaults)
DROP TRIGGER IF EXISTS trigger_init_notif_clinic ON public.clinics;
CREATE TRIGGER trigger_init_notif_clinic
AFTER INSERT ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.initialize_notifications_defaults();

-- Trigger para Perfis Personalizados (Ao criar novo perfil, configura os defaults)
DROP TRIGGER IF EXISTS trigger_init_notif_role ON public.clinic_roles;
CREATE TRIGGER trigger_init_notif_role
AFTER INSERT ON public.clinic_roles
FOR EACH ROW EXECUTE FUNCTION public.initialize_notifications_defaults();

-- BACKFILL: Atualizar clínicas existentes que possam não ter configurações
-- (Garante que todo mundo tenha tudo habilitado se o registro não existir)
DO $$
DECLARE
    r record;
    t text;
    types text[] := ARRAY['new_request_alert', 'agenda_daily', 'finance_daily', 'stock_low', 'system_campaigns'];
    std_roles text[] := ARRAY['administrator', 'dentist', 'employee'];
BEGIN
    -- 1. Para papéis padrão em todas as clínicas
    FOR r IN SELECT id FROM public.clinics LOOP
        FOREACH t IN ARRAY types LOOP
            FOREACH role_name IN ARRAY std_roles LOOP
                INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
                VALUES (r.id, role_name, t, true)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    -- 2. Para papéis personalizados existentes
    FOR r IN SELECT clinic_id, name FROM public.clinic_roles LOOP
        FOREACH t IN ARRAY types LOOP
            INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
            VALUES (r.clinic_id, r.name, t, true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
