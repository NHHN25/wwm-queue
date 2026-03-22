# Guild War Teams Design

## 1. Architecture & Database
- Add a new `team` column to the `queue_players` SQLite table to store the selected team (`jungler`, `offense`, `defense`). It will be nullable for non-guild war queues.
- Add a database migration script to handle the schema update.
- Update the `QueuePlayer` interface and `Queue` model methods to accept and persist the new `team` property.

## 2. Components & UI
- Modify `queueButtons.ts` to render a single **"Join Guild War"** button for `guild_war` queues instead of the usual Tank/Healer/DPS buttons.
- When clicked, the bot replies with an ephemeral message containing:
  - A Select Menu for **Team** (Rừng / Công / Thủ)
  - A Select Menu for **Role** (Tank / Healer / DPS)
  - A **Confirm** button.
- Use a similar pattern to the existing `registrationSelectMenus.ts` to handle these interactions in-memory until the "Confirm" button is pressed.
- Modify `embeds.ts` to display the players grouped by their Team in the Guild War queue embed.

## 3. Data Flow
1. User clicks "Join Guild War".
2. Ephemeral message with dropdowns appears.
3. User selects Team and Role, then clicks "Confirm".
4. The interaction handler reads the selections and calls `queue.addPlayer(...)`.
5. The queue embed updates to show the user under their chosen Team and Role.

## 4. Error Handling
- Verification that the queue hasn't filled up or closed while the user was in the selection menu.
- Expire or clean up the temporary selection state after a period of time to prevent memory leaks.

## 5. Localization
- The feature requires support for both English and Vietnamese localizations using the `getGuildTranslations` function.
- Guild War Team names:
  - Jungler = Rừng
  - Offense = Công
  - Defense = Thủ
- Proper localized labels for Select Menus, confirmation messages, and Queue Embed team headers must be provided. Wait for user input when unsure.

## 6. Verification / Testing
- Manually test by creating a Guild War panel, generating a queue, and going through the Join flow with multiple users/roles.
- Verify the SQLite database correctly stores the `team`.
