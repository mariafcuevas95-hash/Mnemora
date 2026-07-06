-- Add premium tier to plan enum
alter type plan_type add value if not exists 'premium';

-- Atomic usage increment to avoid race conditions
create or replace function increment_usage(
  p_user_id   uuid,
  p_year_month char(7),
  p_field      text,
  p_by         int default 1
) returns void
language plpgsql security definer as $$
begin
  insert into usage_monthly (user_id, year_month)
  values (p_user_id, p_year_month)
  on conflict (user_id, year_month) do nothing;

  if p_field = 'flashcards_count' then
    update usage_monthly set flashcards_count = flashcards_count + p_by
    where user_id = p_user_id and year_month = p_year_month;
  elsif p_field = 'summaries_count' then
    update usage_monthly set summaries_count = summaries_count + p_by
    where user_id = p_user_id and year_month = p_year_month;
  elsif p_field = 'tutor_messages_count' then
    update usage_monthly set tutor_messages_count = tutor_messages_count + p_by
    where user_id = p_user_id and year_month = p_year_month;
  elsif p_field = 'syllabuses_count' then
    update usage_monthly set syllabuses_count = syllabuses_count + p_by
    where user_id = p_user_id and year_month = p_year_month;
  end if;
end;
$$;
