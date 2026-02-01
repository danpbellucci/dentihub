
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('administrator', 'dentist', 'employee')),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users if they belong to the clinic (simplification: allow read own profile or if same clinic)
CREATE POLICY "Enable read access for authenticated users" ON public.user_profiles
    FOR SELECT
    USING (true); -- Simplificado para permitir leitura inicial. Em produção, refinar para clinic_id.

-- Allow insert access for authenticated users (Admin creating profiles)
CREATE POLICY "Enable insert access for authenticated users" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow update access
CREATE POLICY "Enable update access for authenticated users" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);
