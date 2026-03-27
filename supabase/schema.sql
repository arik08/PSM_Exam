create table if not exists public.anonymous_sessions (
  session_id text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  session_id text primary key references public.anonymous_sessions(session_id) on delete cascade,
  answer_reveal_mode text not null default 'manual',
  explanation_reveal_mode text not null default 'manual',
  last_mode text not null default 'all',
  last_question_id text null,
  updated_at timestamptz not null default now(),
  constraint user_preferences_answer_reveal_mode_check
    check (answer_reveal_mode in ('manual', 'auto-after-submit')),
  constraint user_preferences_explanation_reveal_mode_check
    check (explanation_reveal_mode in ('manual', 'auto-after-submit')),
  constraint user_preferences_last_mode_check
    check (last_mode in ('all', 'past', 'review'))
);

create table if not exists public.question_attempts (
  id bigint generated always as identity primary key,
  session_id text not null references public.anonymous_sessions(session_id) on delete cascade,
  question_id text not null,
  selected_choice text not null,
  is_correct boolean not null,
  attempted_at timestamptz not null default now(),
  mode text not null,
  constraint question_attempts_mode_check
    check (mode in ('all', 'past', 'review'))
);

create index if not exists question_attempts_session_attempted_at_idx
  on public.question_attempts(session_id, attempted_at desc);

create index if not exists question_attempts_session_question_idx
  on public.question_attempts(session_id, question_id);

create table if not exists public.review_items (
  session_id text not null references public.anonymous_sessions(session_id) on delete cascade,
  question_id text not null,
  status text not null default 'active',
  last_wrong_at timestamptz not null default now(),
  wrong_count integer not null default 1,
  is_past_exam boolean not null default false,
  primary key (session_id, question_id),
  constraint review_items_status_check
    check (status in ('active', 'resolved')),
  constraint review_items_wrong_count_check
    check (wrong_count >= 0)
);

create index if not exists review_items_session_status_idx
  on public.review_items(session_id, status, last_wrong_at desc);

create index if not exists review_items_session_past_exam_idx
  on public.review_items(session_id, is_past_exam, last_wrong_at desc);

create or replace function public.touch_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.touch_user_preferences_updated_at();
