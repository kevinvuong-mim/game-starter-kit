# Local features (no game-api)

Các module dưới đây chạy **offline trên client**. Chúng không gọi `game-api` — API chỉ phục vụ guest / results / leaderboard / devices.

## Shop

- Catalog: `src/platform/modules/shop/catalog.json` (skins, boosts, remove-ads IAP).
- **Skins**: mua bằng coins → `equipSkin()`; demo player đọc màu qua `getEquippedPlayerColor()` từ `@platform/ui` (game layer không import `@platform/modules`).
- **Boost** `boost_double`: `activateBoost()` ghi `expiresAt` trên inventory; `coin:add` nhân `getActiveCoinMultiplier()` (2× trong thời hạn).
- **Remove ads**: IAP entitlement — client-authoritative trong starter kit (xem README IAP warning).

## Daily reward

- 7-day cycle; Preferences key `daily-reward-v2`.
- Anti-tamper: `timeManipulated` chặn claim khi đồng hồ bị kéo lùi.
- **Recovery**: `init()` / `refreshSessionTimestamp()` **clear** flag khi clock lại nhất quán với `lastSessionTimestamp` / `lastClaimWallClock` (không còn khoá vĩnh viễn).

## Missions

- Definitions: `missions.json`; progress trong Zustand + `game-save`.
- `resetPolicy`: chỉ `'daily'` | `'never'` được implement.
- Demo: mission `WATCH_AD` (xem rewarded ads).

## Related

- API-backed modules: [guest-identity](./guest-identity.md), [game-result-sync](./game-result-sync.md), [leaderboard](./leaderboard.md), [notifications](./notifications.md)
