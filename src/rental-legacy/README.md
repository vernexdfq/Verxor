# Verxor Rental Line — migration source

This directory preserves the Rental Line implementation sourced from `vernexdfq/vernex-boost-hub` before UI/product edits.

Source repository: `vernexdfq/vernex-boost-hub`
Source branch: `main`

Preserved areas include:
- Calls screen and dial pad
- Call source selection
- Country selection and search sheet
- Number catalog and rental plan selection
- Active/rented number list
- Messages screen
- Rental credit screen
- Rental navigation and route structure

The source is intentionally isolated from the current Vite app because the original implementation depends on TanStack Start/Router, React Query, Supabase server functions, and provider adapters. It must be adapted into Verxor’s current architecture rather than being blindly imported and breaking the existing build.

Backend/provider source still belongs to the original repository and will be migrated with its dependencies when the Rental Line is wired into the current Verxor application.
