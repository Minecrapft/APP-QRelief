-- QRelief AI Role Configuration Script
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Ensure the 'role' column exists in profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'beneficiary';
    END IF;
END $$;

-- 2. Create the role type if it doesn't exist (Optional, but good for data integrity)
-- CREATE TYPE user_role AS ENUM ('admin', 'staff', 'beneficiary');
-- ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- 3. Standardize your Admin Account (Fixes the manually added account)
-- Replace 'mcabahug1@ssct.edu.ph' with your actual admin email if different
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'mcabahug1@ssct.edu.ph'
);

-- 4. Enable Service Role to read profiles (Required for Edge Functions)
-- Usually, the service_role has full access, but we ensure RLS doesn't block it
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. Standard Profile Visibility (Admins can see everything, others see only theirs)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 6. Verify Configuration
-- Run this to check your setup:
-- SELECT p.id, u.email, p.role 
-- FROM profiles p 
-- JOIN auth.users u ON p.id = u.id 
-- ORDER BY p.role;
