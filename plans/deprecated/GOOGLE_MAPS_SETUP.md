# Google Maps Location Suggestions Setup

QRelief now includes a Google Maps-backed location suggestion list for the admin event form.

## What it does

- As you type in the event `Location` field, the app can show Google Maps place suggestions.
- The mobile app calls a Supabase Edge Function.
- The Edge Function calls Google Places Autocomplete.
- Your Google API key stays in Supabase secrets instead of the mobile app bundle.

## 1. Enable Google Places API

In Google Cloud Console:

1. Create or select your Google Cloud project.
2. Enable `Places API (New)`.
3. Make sure billing is enabled for the project.
4. Create an API key.

Official reference:
- https://developers.google.com/maps/documentation/places/web-service/place-autocomplete

## 2. Add the secret to Supabase

In Supabase, add this Edge Function secret:

```text
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Dashboard path:
- `Edge Functions` -> `Secrets`

Or with CLI:

```bash
supabase secrets set GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 3. Deploy the Edge Function

This repo now includes:

- `supabase/functions/google-places-autocomplete/index.ts`

Deploy it with the Supabase CLI:

```bash
supabase functions deploy google-places-autocomplete
```

## 4. Security model

- The function requires a signed-in QRelief user.
- It only serves users whose `profiles.role` is `admin` or `staff`.
- The Google key is never exposed to the Expo client.

## 5. Current UX in QRelief

- Typing at least 3 characters in the `Location` field triggers suggestions.
- `Use current location` biases suggestions near the current GPS position.
- Tapping a suggestion fills the event location field.
- `Open Google Maps` still works for manual preview/validation.

## 6. Important note

The current implementation stores the selected location as formatted text only.
If you want the next step, we can add:

- `latitude`
- `longitude`
- `google_place_id`

to the `events` table so event locations become fully map-aware.
