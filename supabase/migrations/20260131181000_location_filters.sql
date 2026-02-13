-- Migration: Add location, remote preference, languages, and hard filters
-- Supports enhanced matching with geographic and preference-based scoring

-- ============================================
-- PROFILES TABLE UPDATES
-- ============================================

-- Spoken languages (ISO codes: en, de, es, fr, etc.)
alter table public.profiles 
add column if not exists languages text[] default null;

-- Remote preference: 0 = fully on-site, 100 = fully remote
alter table public.profiles 
add column if not exists remote_preference integer default null 
check (remote_preference is null or (remote_preference >= 0 and remote_preference <= 100));

-- Location coordinates for distance-based matching
-- Note: location (text) field is kept for human-readable display
alter table public.profiles 
add column if not exists location_lat double precision default null;

alter table public.profiles 
add column if not exists location_lng double precision default null;

-- Hard filters for match scoring
alter table public.profiles 
add column if not exists hard_filters jsonb default null;

-- Comments for new profile columns
comment on column public.profiles.languages is 'Spoken languages as ISO 639-1 codes (e.g., en, de, es)';
comment on column public.profiles.remote_preference is 'Remote work preference: 0 = fully on-site, 100 = fully remote';
comment on column public.profiles.location_lat is 'Latitude coordinate for distance-based matching';
comment on column public.profiles.location_lng is 'Longitude coordinate for distance-based matching';
comment on column public.profiles.hard_filters is 'Hard filter preferences: {max_distance_km, min_hours, max_hours, languages}';

-- ============================================
-- PROJECTS TABLE UPDATES
-- ============================================

-- Hard filters for scoring applications
alter table public.projects 
add column if not exists hard_filters jsonb default null;

-- Comment for new project column
comment on column public.projects.hard_filters is 'Hard filter preferences for applicants: {max_distance_km, min_hours, max_hours, languages}';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Haversine distance calculation in kilometers
-- Returns distance between two lat/lng points on Earth
create or replace function haversine_distance(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language plpgsql
immutable
as $$
declare
  earth_radius_km constant double precision := 6371.0;
  lat1_rad double precision;
  lat2_rad double precision;
  delta_lat double precision;
  delta_lng double precision;
  a double precision;
  c double precision;
begin
  -- Handle null inputs
  if lat1 is null or lng1 is null or lat2 is null or lng2 is null then
    return null;
  end if;
  
  -- Convert to radians
  lat1_rad := radians(lat1);
  lat2_rad := radians(lat2);
  delta_lat := radians(lat2 - lat1);
  delta_lng := radians(lng2 - lng1);
  
  -- Haversine formula
  a := sin(delta_lat / 2) * sin(delta_lat / 2) +
       cos(lat1_rad) * cos(lat2_rad) *
       sin(delta_lng / 2) * sin(delta_lng / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  return earth_radius_km * c;
end;
$$;

comment on function haversine_distance is 'Calculate distance in km between two lat/lng coordinates using Haversine formula';

-- ============================================
-- UPDATED MATCH BREAKDOWN FUNCTION
-- ============================================

-- Drop and recreate to update return structure
create or replace function compute_match_breakdown(
  profile_user_id uuid,
  target_project_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  profile_rec record;
  project_rec record;
  creator_rec record;
  
  -- Individual scores
  skills_score float;
  experience_score float;
  commitment_score float;
  semantic_score float;
  location_score float;
  filter_score float;
  
  -- Filter sub-scores
  distance_filter_score float;
  hours_filter_score float;
  language_filter_score float;
  
  -- Calculated values
  distance_km double precision;
  remote_factor float;
  effective_distance float;
  matching_languages int;
  required_languages int;
begin
  -- Fetch profile record
  select * into profile_rec 
  from public.profiles 
  where user_id = profile_user_id;
  
  -- Fetch project record
  select * into project_rec 
  from public.projects 
  where id = target_project_id;
  
  -- Fetch project creator's profile for location/remote preferences
  select * into creator_rec
  from public.profiles
  where user_id = project_rec.creator_id;
  
  -- Validate records exist
  if profile_rec is null then
    raise exception 'Profile not found for user_id: %', profile_user_id;
  end if;
  
  if project_rec is null then
    raise exception 'Project not found for project_id: %', target_project_id;
  end if;
  
  -- ============================================
  -- SKILLS OVERLAP SCORE
  -- ============================================
  select case
    when profile_rec.skills is null or project_rec.required_skills is null then 1.0
    when array_length(project_rec.required_skills, 1) is null or array_length(project_rec.required_skills, 1) = 0 then 1.0
    else (
      select coalesce(
        array_length(
          array(
            select unnest(profile_rec.skills)
            intersect
            select unnest(project_rec.required_skills)
          ),
          1
        )::float / array_length(project_rec.required_skills, 1)::float,
        0.0
      )
    )
  end into skills_score;
  
  -- ============================================
  -- EXPERIENCE MATCH SCORE
  -- ============================================
  select case
    when profile_rec.experience_level is null or project_rec.experience_level is null then 1.0
    when profile_rec.experience_level = project_rec.experience_level then 1.0
    when project_rec.experience_level = 'any' then 1.0
    else 1.0 - least(
      abs(
        experience_to_ordinal(profile_rec.experience_level) - 
        experience_to_ordinal(project_rec.experience_level)
      )::float / 5.0,
      1.0
    )
  end into experience_score;
  
  -- ============================================
  -- COMMITMENT MATCH SCORE
  -- ============================================
  select case
    when profile_rec.availability_hours is null or project_rec.commitment_hours is null then 1.0
    when profile_rec.availability_hours = 0 and project_rec.commitment_hours = 0 then 1.0
    else 1.0 - least(
      abs(profile_rec.availability_hours - project_rec.commitment_hours)::float / 
      greatest(profile_rec.availability_hours, project_rec.commitment_hours, 1)::float,
      1.0
    )
  end into commitment_score;
  
  -- ============================================
  -- SEMANTIC SCORE
  -- ============================================
  select case
    when profile_rec.embedding is null or project_rec.embedding is null then 0.0
    else 1 - (profile_rec.embedding <=> project_rec.embedding)
  end into semantic_score;
  
  -- ============================================
  -- LOCATION MATCH SCORE
  -- ============================================
  -- Calculate distance if both parties have coordinates
  if profile_rec.location_lat is not null and profile_rec.location_lng is not null and
     creator_rec.location_lat is not null and creator_rec.location_lng is not null then
    
    distance_km := haversine_distance(
      profile_rec.location_lat, profile_rec.location_lng,
      creator_rec.location_lat, creator_rec.location_lng
    );
    
    -- Calculate remote factor (higher = distance matters less)
    -- Average of both parties' remote preferences, defaulting to 50 if not set
    remote_factor := (
      coalesce(profile_rec.remote_preference, 50) + 
      coalesce(creator_rec.remote_preference, 50)
    ) / 200.0;
    
    -- Effective distance reduces as remote preference increases
    effective_distance := distance_km * (1.0 - remote_factor);
    
    -- Score based on effective distance (5000km as reference max)
    location_score := greatest(0.0, 1.0 - effective_distance / 5000.0);
  else
    -- No location data = no penalty
    location_score := 1.0;
  end if;
  
  -- ============================================
  -- FILTER MATCH SCORE
  -- ============================================
  -- Initialize sub-scores to 1.0 (no penalty if filter not set)
  distance_filter_score := 1.0;
  hours_filter_score := 1.0;
  language_filter_score := 1.0;
  
  -- Apply profile's hard filters against project
  if profile_rec.hard_filters is not null then
    
    -- Distance filter (profile wants projects within X km)
    if (profile_rec.hard_filters->>'max_distance_km') is not null and distance_km is not null then
      if distance_km > (profile_rec.hard_filters->>'max_distance_km')::float then
        -- Penalize based on how much it exceeds the limit
        distance_filter_score := greatest(0.0, 
          1.0 - (distance_km - (profile_rec.hard_filters->>'max_distance_km')::float) / 
                (profile_rec.hard_filters->>'max_distance_km')::float
        );
      end if;
    end if;
    
    -- Hours filter (profile wants projects with X-Y hours)
    if project_rec.commitment_hours is not null then
      -- Min hours check
      if (profile_rec.hard_filters->>'min_hours') is not null then
        if project_rec.commitment_hours < (profile_rec.hard_filters->>'min_hours')::int then
          hours_filter_score := least(hours_filter_score,
            project_rec.commitment_hours::float / (profile_rec.hard_filters->>'min_hours')::float
          );
        end if;
      end if;
      -- Max hours check
      if (profile_rec.hard_filters->>'max_hours') is not null then
        if project_rec.commitment_hours > (profile_rec.hard_filters->>'max_hours')::int then
          hours_filter_score := least(hours_filter_score,
            (profile_rec.hard_filters->>'max_hours')::float / project_rec.commitment_hours::float
          );
        end if;
      end if;
    end if;
    
    -- Language filter (profile wants projects where creator speaks these languages)
    if profile_rec.hard_filters->'languages' is not null and 
       jsonb_array_length(profile_rec.hard_filters->'languages') > 0 and
       creator_rec.languages is not null then
      
      select count(*) into matching_languages
      from (
        select jsonb_array_elements_text(profile_rec.hard_filters->'languages')
        intersect
        select unnest(creator_rec.languages)
      ) as matched;
      
      required_languages := jsonb_array_length(profile_rec.hard_filters->'languages');
      
      if required_languages > 0 then
        language_filter_score := matching_languages::float / required_languages::float;
      end if;
    end if;
  end if;
  
  -- Apply project's hard filters against profile (for project owner filtering)
  if project_rec.hard_filters is not null then
    
    -- Distance filter (project wants applicants within X km)
    if (project_rec.hard_filters->>'max_distance_km') is not null and distance_km is not null then
      if distance_km > (project_rec.hard_filters->>'max_distance_km')::float then
        distance_filter_score := least(distance_filter_score, greatest(0.0,
          1.0 - (distance_km - (project_rec.hard_filters->>'max_distance_km')::float) / 
                (project_rec.hard_filters->>'max_distance_km')::float
        ));
      end if;
    end if;
    
    -- Hours filter (project wants applicants available X-Y hours)
    if profile_rec.availability_hours is not null then
      -- Min hours check
      if (project_rec.hard_filters->>'min_hours') is not null then
        if profile_rec.availability_hours < (project_rec.hard_filters->>'min_hours')::int then
          hours_filter_score := least(hours_filter_score,
            profile_rec.availability_hours::float / (project_rec.hard_filters->>'min_hours')::float
          );
        end if;
      end if;
      -- Max hours check
      if (project_rec.hard_filters->>'max_hours') is not null then
        if profile_rec.availability_hours > (project_rec.hard_filters->>'max_hours')::int then
          hours_filter_score := least(hours_filter_score,
            (project_rec.hard_filters->>'max_hours')::float / profile_rec.availability_hours::float
          );
        end if;
      end if;
    end if;
    
    -- Language filter (project wants applicants who speak these languages)
    if project_rec.hard_filters->'languages' is not null and 
       jsonb_array_length(project_rec.hard_filters->'languages') > 0 and
       profile_rec.languages is not null then
      
      select count(*) into matching_languages
      from (
        select jsonb_array_elements_text(project_rec.hard_filters->'languages')
        intersect
        select unnest(profile_rec.languages)
      ) as matched;
      
      required_languages := jsonb_array_length(project_rec.hard_filters->'languages');
      
      if required_languages > 0 then
        language_filter_score := least(language_filter_score,
          matching_languages::float / required_languages::float
        );
      end if;
    end if;
  end if;
  
  -- Combine filter scores multiplicatively
  filter_score := distance_filter_score * hours_filter_score * language_filter_score;
  
  -- ============================================
  -- RETURN BREAKDOWN
  -- ============================================
  return jsonb_build_object(
    'semantic', coalesce(semantic_score, 0.0),
    'skills_overlap', coalesce(skills_score, 1.0),
    'experience_match', coalesce(experience_score, 1.0),
    'commitment_match', coalesce(commitment_score, 1.0),
    'location_match', coalesce(location_score, 1.0),
    'filter_match', coalesce(filter_score, 1.0)
  );
end;
$$;

comment on function compute_match_breakdown is 'Computes per-dimension compatibility scores between a profile and project, including location and hard filter scoring';
