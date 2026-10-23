# FR01–FR15 definitive acceptance contract

This matrix is distilled from the owner's supplied full functional requirements, not copied from old Java code. EVERY row mandatory. Every backend rule enforced server side. `tests/` contains corresponding cases; test statuses must be truthfully reported.

| FR | Module | Required acceptance evidence |
|---|---|---|
| FR01 | auth | Register first/last/email/phone/password; reject duplicate normalized email **and** phone via DB uniqueness; required field validation. |
| FR02 | auth | Email+password login works; salted password hash stored (never plaintext); blocked user cannot login and protected sessions invalidated/denied. |
| FR03 | auth/core | CUSTOMER and ADMIN roles; customer cannot read others' bookings/payments or access admin endpoints; unauthenticated/unauthorized return 401/403. |
| FR04 | stations | Search active stations by city/name; zero criteria lists all **active** only. |
| FR05 | stations | Station address/hours/status, all charging slots (including nonactive display) show connector, kW, hourly rate, status. |
| FR06 | stations/bookings contract | For selected future date/time, available slots exclude overlapping **noncancelled** bookings; adjacent consecutive slots allowed. |
| FR07 | bookings | Exactly one hour, on hour, future, account active, station+slot active, entire hour inside station hours; failure messages specific. |
| FR08 | bookings | Two concurrent requests same slot and hour: precisely one confirmed with payment; other 409; no duplicate active bookings. |
| FR09 | bookings | Unique mock payment transaction reference, booking and payment atomic; injected failure rolls back both. |
| FR10 | bookings | Own booking history latest first: station, slot, connector, start/end, booking status, amount, payment status; another user's data forbidden. |
| FR11 | bookings | Cancel only confirmed before start; booking CANCELLED and payment REFUNDED atomically, opens occupancy; rebook succeeds; past-start cancel fails. |
| FR12 | bookings | Ended confirmed bookings transition to COMPLETED; cancelled stay cancelled, repeated transitions safe. |
| FR13 | admin | Admin create/edit stations; deactivate/reactivate/maintenance; booking prohibited when nonactive. |
| FR14 | admin | Admin create/edit slot, deactivate/reactivate/maintenance; unique station slot number; nonactive not bookable. |
| FR15 | admin | Admin viewing all bookings and payments, station usage and revenue; tests on gross/refund/net totals and access restriction. |

## Crucial cross-cutting negative paths
Malformed ObjectId, missing station/slot, invalid time zone, station-hours boundary, overlap and adjacent end/start, status flip during booking, duplicate user email/phone concurrently, double cancellation, blocked user with old cookie, report with zero payments, DB unavailable. UI errors must be intelligible; API must not expose stack traces or secrets.

## Acceptance flow
Seed into safe test DB; register new customer -> login -> list/search stations -> inspect station/slots -> date/hour availability -> book -> payment -> history -> cancel -> refund -> rebook -> admin login -> status toggles/slot creation -> confirm booking rejection for inactive -> admin booking/payment views and reports -> completion transition. Assert API and database state at important points.
