-- Deadlines, follow-ups and reminders used to be plain dates, stored as
-- midnight UTC. Now that they carry an hour, those rows would read as "04:00"
-- in Baku, which looks like a bug to anyone using the app. Move them to 09:00
-- local time, which is what a date with no time on it always meant.
--
-- Only rows sitting exactly on midnight are touched: anything with a real
-- time on it was set deliberately and is left alone.
UPDATE "StaffTask"
   SET "dueAt" = "dueAt" + interval '5 hours'
 WHERE "dueAt" IS NOT NULL
   AND "dueAt" = date_trunc('day', "dueAt");

UPDATE "Lead"
   SET "nextFollowUpAt" = "nextFollowUpAt" + interval '5 hours'
 WHERE "nextFollowUpAt" IS NOT NULL
   AND "nextFollowUpAt" = date_trunc('day', "nextFollowUpAt");

UPDATE "Reminder"
   SET "dueAt" = "dueAt" + interval '5 hours'
 WHERE "dueAt" = date_trunc('day', "dueAt");
