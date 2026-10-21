-- Sav pristup sadržaju ide kroz Server Actions (service role). Klijent s anon ključem
-- ne smije čitati ni odobreni sadržaj ni raspored (npr. sutrašnja pitanja ili URL-ove fotografija).
drop policy if exists "content_select_approved" on content;
drop policy if exists "schedule_select" on daily_schedule;
