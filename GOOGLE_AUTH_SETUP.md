# Google Auth Setup

QRelief now supports `Continue with Google` on the sign-in screen for mobile users.

## 1. Enable Google in Supabase

1. Open your Supabase project.
2. Go to `Authentication` -> `Providers` -> `Google`.
3. Enable the provider.
4. Paste your Google OAuth client ID and secret.

## 2. Create the Google OAuth app

1. Open Google Cloud Console.
2. Create or choose a project.
3. Configure the OAuth consent screen.
4. Create an OAuth client of type `Web application`.
5. Add the Supabase callback URL shown in the Google provider setup screen.

Typical callback format:

```text
https://<your-project-ref>.supabase.co/auth/v1/callback
```

## 3. Allow the mobile redirect in Supabase

Open `Authentication` -> `URL Configuration` in Supabase and add this redirect URL:

```text
qrelief://**
```

You can use the more exact callback path below in production if you prefer:

```text
qrelief://auth/callback
```

## 4. Important behavior in QRelief

- Existing users can sign in with Google when the Google email matches their QRelief email.
- New Google users are treated as `beneficiary` by default.
- If they do not yet have a beneficiary intake record, the app now sends them to `Complete intake` before the pending approval screen.

## 5. Optional next step

If you want logged-in users to attach Google to an existing email/password account explicitly, the next enhancement is identity linking.
