// src/teamBuilder.js

import { DOMElements, showNotification } from './domUtils.js';
import { renderUserCards } from './cardRenderer.js';
import { supabaseClient } from './supabaseClient.js';

/**
 * Builds the best team based on required skills and team size.
 */
export async function buildBestTeam() {
  const skillInputRaw = DOMElements.teamBuilderSkillsInput.value;
  const teamSize = parseInt(DOMElements.teamSizeInput.value, 10);

  const skillInput = skillInputRaw
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean); // remove empty strings

  if (!skillInput.length || isNaN(teamSize) || teamSize < 1) {
    showNotification('Please enter required skills and a valid team size (1 or more).', 'warning');
    DOMElements.bestTeamContainer.innerHTML = '';
    return;
  }

  try {
    const { data: users, error } = await supabaseClient
      .from('skills')
      .select('*');

    if (error || !users) throw error;

    const scoredUsers = users
      .map(user => {
        const userSkillsRaw = user.skills
          .split(',')
          .map(s => s.replace(/\(.*?\)/, '').trim().toLowerCase());

        const matchingSkills = skillInput.filter(requiredSkill =>
          userSkillsRaw.includes(requiredSkill)
        );

        return matchingSkills.length
          ? {
              ...user,
              matchingSkills,
              matchCount: matchingSkills.length
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) =>
        b.matchCount - a.matchCount ||
        (b.endorsements?.length || 0) - (a.endorsements?.length || 0)
      )
      .slice(0, teamSize);

    const scoredUsersCleaned = scoredUsers.map(user => ({
      ...user,
      avatar_url: user.avatar_url || 'https://via.placeholder.com/150',
      bio: user.bio || 'No bio provided.'
    }));

    renderUserCards(scoredUsersCleaned, DOMElements.bestTeamContainer);

    if (scoredUsers.length > 0) {
      showNotification(`Built a team of ${scoredUsers.length} member(s).`, 'success');
    } else {
      showNotification('No team members matched the required skills.', 'info');
    }
  } catch (error) {
    console.error('Error building team:', error);
    showNotification('Error loading users for team building. Please try again.', 'error');
    DOMElements.bestTeamContainer.innerHTML = '<span style="color:white;">Error loading users.</span>';
  }
}
