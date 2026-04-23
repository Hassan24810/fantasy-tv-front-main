

# Set Participant Prices Modal — When Budget Mode Is Enabled

## Overview

When a B2B admin enables budget mode in Settings and saves, a modal appears listing all participants that are missing a price. The admin must set a price for each one before budget mode can be fully activated. If all participants already have prices, no modal is needed.

## Changes

### 1. New component: `src/components/settings/SetParticipantPricesModal.tsx`

A dialog/modal that:
- Receives `showId`, `open`, `onOpenChange`, and `onSaved` callback as props
- On open, fetches all participants for the show from Supabase (`participants` table where `show_id = showId`)
- Displays a scrollable list with each participant's name, photo, and a price input field
- Pre-populates existing prices, highlights missing ones
- "Save All" button that batch-updates all participant prices via Supabase
- Validates that every participant has a price > 0 before allowing save
- Calls `onSaved` callback on success

### 2. `src/components/settings/RosterConstraintsSection.tsx`

- Add `showId: string` to props interface
- Add state: `showPriceModal` (boolean)
- When `handleSave` is called and `budget_mode_enabled` is true:
  - Fetch participants for `showId` and check if any have `price IS NULL`
  - If participants are missing prices, open the modal instead of (or after) saving settings
  - If all have prices, save normally
- Render `<SetParticipantPricesModal>` at the bottom of the component

### 3. `src/pages/Settings.tsx`

- Pass `showId={showId}` to `<RosterConstraintsSection>`

## Flow

1. Admin toggles budget mode ON, sets budget amount, clicks Save
2. Settings are saved to `game_settings`
3. System checks if any participants lack a price
4. If yes → modal opens with all participants listed, requiring prices
5. Admin fills in prices, clicks "Save All"
6. Prices are batch-updated in `participants` table
7. Modal closes, toast confirms success

## No database changes needed

The `participants.price` column already exists.

