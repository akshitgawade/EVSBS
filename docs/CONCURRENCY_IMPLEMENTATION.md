# Mongo concurrency + transaction implementation recipe

This is the critical FR08/FR09/FR11 design. Fixed 60-minute bookings starting exactly at station-local HH:00 mean all valid overlapping bookings for the same charger have the identical UTC start; this allows a unique partial index for the active reservation. Verify timezone conversion produces canonical exact UTC instants, not platform-dependent parsed local timestamps.

## Mandatory indexes
```js
await bookings.createIndex({slotId:1,startTime:1},{unique:true,partialFilterExpression:{status:'CONFIRMED'},name:'uniq_confirmed_slot_start'});
await payments.createIndex({bookingId:1},{unique:true});
await payments.createIndex({transactionReference:1},{unique:true});
await users.createIndex({emailNormalized:1},{unique:true});
await users.createIndex({phoneNormalized:1},{unique:true});
await slots.createIndex({stationId:1,slotNumber:1},{unique:true});
```
Also normal nonunique lookup indexes in DATABASE_CONTRACT.md. Do not put user-controlled `$` keys or raw Mongo operators into filters. Validate status enum and wall-clock inputs server-side.

## Create booking transaction pseudocode
1. Authenticate active customer outside transaction; identity from verified server session.
2. Validate `slotId`, parse station-local hour string; lookup station/slot inside the same Mongo transaction/session when practical; require ACTIVE station+slot and proper operating hour.
3. Generate booking `_id`, payment `_id`, secure unique mock transaction reference. Price snapshot from slot integer paise.
4. `await client.withSession(async session => session.withTransaction(async () => { ... }, {readConcern:{level:'snapshot'},writeConcern:{w:'majority'}}))` or equivalent driver-validated transaction options.
5. Within transaction `insertOne({slotId, userId, startTime: UTC Date, endTime: Date+3600000, status:'CONFIRMED', ratePerHourPaise,...},{session})`, then `insertOne({bookingId, amountPaise,... status:'PAID'},{session})`.
6. If either insert fails transaction rolls back; mapping from index `uniq_confirmed_slot_start` duplicate-key to HTTP 409 `SLOT_UNAVAILABLE`. Never return 201 until commit acknowledged. Catch other failures as safe 5xx. Never retry duplicate-key blindly. Driver may automatically retry transient transaction errors; ensure no externally visible side effect inside retried callback (no email/external gateway; mock reference generation safe).
7. On simultaneous writes, unique index should yield one success and one 409 (or transient conflict retried then 409). **A unique index alone does not serialize edits to station/slot status.** Document and test the current-state policy; for strict concurrent status-change correctness, ensure admin changes and booking participate in a common per-slot write guard/transaction conflict or check after commit. Do not claim this property without testing.

## Cancellation
Inside one transaction conditional-update booking `{_id,userId,status:'CONFIRMED',startTime:{$gt:new Date()}}` => `CANCELLED`; confirm `matchedCount==1`, then update payment `{bookingId,status:'PAID'}` => `REFUNDED`, assert 1 matched, else throw and rollback. If booking already cancelled or started => 409. The partial unique confirmed index relinquishes occupancy as soon as cancellation transaction commits. A subsequent request for same future time succeeds.

## Completion
Atomic `updateMany({status:'CONFIRMED',endTime:{$lte: now}},{$set:{status:'COMPLETED',updatedAt:now}})` executed on a bounded startup/read/update path; never mutate CANCELLED. Completed historical rows remain for reporting. Race between cancellation and completion resolved by status preconditions. Business rules forbid new bookings in past, so completed exclusion from index cannot enable valid overlapping future booking.

## Test minimum with real Atlas *test* database
- Two simultaneous different authenticated customers, same slot/start: one 201/one 409; exactly one confirmed booking AND one linked payment; neither 500.
- Booking insert succeeds, payment insert deliberately fails: transaction leaves neither record.
- Cancel before start => booking CANCELLED, payment REFUNDED, occupancy free; rebook different customer works.
- Second cancellation => 409; cancellation after start => 409; adjacent hours => both accepted.
- Admin deactivates charger/station => later booking rejected; blocked customer => reject even with old session.
- Index existence and transaction capability inspected at startup/integration preflight. If Atlas transaction operations are unsupported, stop and report blocker, do NOT degrade to nontransactional writes.
