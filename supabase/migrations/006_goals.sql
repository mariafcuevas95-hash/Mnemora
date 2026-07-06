-- Academic goals per subject
alter table subjects
  add column if not exists goal_type  text check (goal_type in ('pass','grade','exam','scholarship','hours')) default null,
  add column if not exists goal_value text default null; -- numeric string: target grade or weekly hours
