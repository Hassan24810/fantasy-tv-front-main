import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;
type Episode = Tables<"episodes">;
type Event = Tables<"events">;

interface SelectabilityContext {
  episodes: Episode[];
  events: Event[];
}

/**
 * Get the current visible episode number (highest episode where is_active=true 
 * or active_from_datetime <= now)
 */
export function getCurrentVisibleEpisodeNumber(episodes: Episode[]): number {
  const now = new Date();
  const visibleEpisodes = episodes.filter(ep => 
    ep.is_active || (ep.active_from_datetime && new Date(ep.active_from_datetime) <= now)
  );
  if (visibleEpisodes.length === 0) return 0;
  return Math.max(...visibleEpisodes.map(ep => ep.episode_number));
}

/**
 * Check if a participant is released (visible to B2C).
 * A participant is released if:
 * 1. available_from_episode is NULL (immediately available), or
 * 2. available_from_episode <= current visible episode number
 */
export function isParticipantReleased(
  participant: Participant,
  context: SelectabilityContext
): boolean {
  if (!participant.available_from_episode) return true;
  const currentEpisode = getCurrentVisibleEpisodeNumber(context.episodes);
  return participant.available_from_episode <= currentEpisode;
}

/**
 * Filter participants to only those that are released.
 */
export function getReleasedParticipants(
  participants: Participant[],
  context: SelectabilityContext
): Participant[] {
  return participants.filter(p => isParticipantReleased(p, context));
}

/**
 * Check if a participant is selectable for team selection/transfers.
 * 
 * A participant is NOT selectable if:
 * 1. They are manually set to inactive (status = 'inactive' and no elimination event)
 * 2. They have an elimination event that has been revealed (event offset has passed in live episode)
 * 
 * A participant IS selectable if:
 * 1. They are active with no elimination event
 * 2. They have an elimination event but the episode hasn't started yet
 * 3. They have an elimination event but the event offset hasn't passed yet (event not revealed)
 */
export function isParticipantSelectable(
  participant: Participant,
  context: SelectabilityContext
): boolean {
  const now = new Date();

  // Check if participant is released first
  if (!isParticipantReleased(participant, context)) {
    return false;
  }

  // If manually set to inactive (no elimination event), not selectable
  if (participant.status === "inactive" && !participant.eliminated_by_event_id) {
    return false;
  }

  // Customized status = selectable (same as active)
  if (participant.status === "customized") {
    return true;
  }

  // If no elimination event, check base status
  if (!participant.eliminated_by_event_id) {
    return participant.status === "active" || participant.status === "customized";
  }

  // Has elimination event - check if it's been revealed yet
  const eliminationEvent = context.events.find(
    (e) => e.id === participant.eliminated_by_event_id
  );

  if (!eliminationEvent) {
    // Event not found, fall back to status
    return participant.status === "active";
  }

  // Get the episode for this event
  const episode = context.episodes.find(
    (ep) => ep.episode_number === eliminationEvent.episode_number
  );

  if (!episode) {
    // Episode not found, fall back to status
    return participant.status === "active";
  }

  // Episode not yet live (active_from_datetime in future) -> selectable
  if (!episode.active_from_datetime || new Date(episode.active_from_datetime) > now) {
    return true;
  }

  // Calculate when the elimination event is revealed
  const episodeStart = new Date(episode.active_from_datetime);
  const eventOffsetMs = (eliminationEvent.event_offset_minutes || 0) * 60 * 1000;
  const eventRevealTime = new Date(episodeStart.getTime() + eventOffsetMs);

  // If event not yet revealed -> selectable
  if (now < eventRevealTime) {
    return true;
  }

  // Event has been revealed -> not selectable
  return false;
}

/**
 * Filter a list of participants to only those that are selectable.
 */
export function getSelectableParticipants(
  participants: Participant[],
  context: SelectabilityContext
): Participant[] {
  return participants.filter((p) => isParticipantSelectable(p, context));
}

/**
 * Check if a participant is manually inactive (not via elimination event).
 */
export function isParticipantInactive(participant: Participant): boolean {
  return participant.status === "inactive" && !participant.eliminated_by_event_id;
}

/**
 * Check if a participant should be shown as "out" (for display purposes).
 * This includes:
 * 1. Manually set to inactive (status = 'inactive' without elimination event)
 * 2. Has an elimination event that has been revealed
 */
export function isParticipantEliminated(
  participant: Participant,
  context: SelectabilityContext
): boolean {
  // Manually set to inactive (not via event)
  if (participant.status === "inactive" && !participant.eliminated_by_event_id) {
    return true;
  }

  // No elimination event
  if (!participant.eliminated_by_event_id) {
    return false;
  }

  const eliminationEvent = context.events.find(
    (e) => e.id === participant.eliminated_by_event_id
  );

  if (!eliminationEvent) {
    return false;
  }

  const episode = context.episodes.find(
    (ep) => ep.episode_number === eliminationEvent.episode_number
  );

  if (!episode || !episode.active_from_datetime) {
    return false;
  }

  const now = new Date();
  const episodeStart = new Date(episode.active_from_datetime);

  // Episode hasn't started
  if (episodeStart > now) {
    return false;
  }

  const eventOffsetMs = (eliminationEvent.event_offset_minutes || 0) * 60 * 1000;
  const eventRevealTime = new Date(episodeStart.getTime() + eventOffsetMs);

  return now >= eventRevealTime;
}
