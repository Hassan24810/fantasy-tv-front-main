/**
 * Utility functions for formatting event display text with inline points
 */

export interface EventParticipantData {
  name: string;
  points: number;
  position: number;
}

/**
 * Formats an event template with participant names and inline points
 * @param template - The rule template with placeholders like {P1}, {P2}
 * @param participants - Array of participant data with name, points, position
 * @returns Formatted string like "Kristine (5) eliminated Frederik (-3)"
 */
export function formatEventDisplayText(
  template: string | null | undefined,
  participants: EventParticipantData[]
): string {
  // If no participants, return empty string
  if (!participants || participants.length === 0) {
    return template || "";
  }

  // Fallback if no template: "Name1 (X), Name2 (Y)"
  if (!template) {
    return participants
      .sort((a, b) => a.position - b.position)
      .map((p) => `${p.name} (${p.points})`)
      .join(", ");
  }

  let result = template;

  // Sort by position to ensure correct replacement order
  const sortedParticipants = [...participants].sort((a, b) => a.position - b.position);

  sortedParticipants.forEach((p) => {
    // Replace {P1}, {P2}, etc. with "Name (points)"
    const placeholder = `{P${p.position}}`;
    const replacement = `${p.name} (${p.points})`;
    result = result.replace(placeholder, replacement);
  });

  return result;
}

/**
 * Generates a preview of the event display text using placeholder names
 * Used in B2B admin for live preview before saving
 * @param template - The rule template with placeholders
 * @param pointsPerPosition - Array of points for each position [10, -5]
 * @param participantCount - Number of participants
 * @returns Preview string like "Participant 1 (10) eliminated Participant 2 (-5)"
 */
export function generateTemplatePreview(
  template: string | null | undefined,
  pointsPerPosition: number[],
  participantCount: number
): string {
  if (!template) {
    return pointsPerPosition
      .slice(0, participantCount)
      .map((points, idx) => `Participant ${idx + 1} (${points})`)
      .join(", ");
  }

  let result = template;

  for (let i = 0; i < participantCount; i++) {
    const placeholder = `{P${i + 1}}`;
    // Use the points for this position, or the last value for variable mode
    const points = i < pointsPerPosition.length 
      ? pointsPerPosition[i] 
      : pointsPerPosition[pointsPerPosition.length - 1] || 0;
    const replacement = `Participant ${i + 1} (${points})`;
    result = result.replace(placeholder, replacement);
  }

  return result;
}

/**
 * Validates that a template has the correct number of placeholders
 * @param template - The rule template
 * @param participantCount - Expected number of participants
 * @param mode - 'exact' or 'variable'
 * @returns Object with valid flag and error message
 */
export function validateTemplatePlaceholders(
  template: string | null | undefined,
  participantCount: number,
  mode: "exact" | "variable"
): { valid: boolean; error: string | null } {
  if (!template) {
    return { valid: true, error: null };
  }

  // Find all placeholders like {P1}, {P2}, etc.
  const placeholderPattern = /\{P(\d+)\}/g;
  const matches = [...template.matchAll(placeholderPattern)];
  const positions = matches.map((m) => parseInt(m[1], 10));

  if (positions.length === 0) {
    return { valid: true, error: null }; // No placeholders is OK
  }

  const uniquePositions = [...new Set(positions)].sort((a, b) => a - b);
  const maxPosition = Math.max(...uniquePositions);

  if (mode === "exact") {
    // For exact mode, placeholders should match participant count
    if (maxPosition > participantCount) {
      return {
        valid: false,
        error: `Template uses {P${maxPosition}} but only ${participantCount} participant(s) configured`,
      };
    }
  }

  // Check for gaps in positions
  for (let i = 1; i <= maxPosition; i++) {
    if (!uniquePositions.includes(i)) {
      return {
        valid: false,
        error: `Template is missing {P${i}} placeholder`,
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Parses points_per_position from JSON to number array
 */
export function parsePointsPerPosition(
  pointsPerPosition: unknown
): number[] {
  if (!pointsPerPosition) return [];
  
  if (Array.isArray(pointsPerPosition)) {
    return pointsPerPosition.map((p) => Number(p) || 0);
  }
  
  // Handle JSON string
  if (typeof pointsPerPosition === "string") {
    try {
      const parsed = JSON.parse(pointsPerPosition);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => Number(p) || 0);
      }
    } catch {
      return [];
    }
  }
  
  return [];
}
