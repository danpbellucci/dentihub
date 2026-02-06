
-- 1. Inserir a configuração 'new_request_alert' para todos os administradores existentes
--    Isso garante que quem já usa o sistema comece a receber os emails automaticamente.

INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
SELECT 
    id as clinic_id,
    'administrator' as role,
    'new_request_alert' as notification_type,
    true as is_enabled
FROM public.clinics
ON CONFLICT (clinic_id, role, notification_type) 
DO UPDATE SET is_enabled = true;

-- Opcional: Se quiser ativar para dentistas também por padrão, descomente abaixo:
/*
INSERT INTO public.role_notifications (clinic_id, role, notification_type, is_enabled)
SELECT 
    id as clinic_id,
    'dentist' as role,
    'new_request_alert' as notification_type,
    true as is_enabled
FROM public.clinics
ON CONFLICT (clinic_id, role, notification_type) DO NOTHING;
*/
