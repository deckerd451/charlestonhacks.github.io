// src/cardRenderer.js

import { DOMElements, appState, showNotification } from './globals.js';

export function generateUserCardHTML(user) {
  const cleanAvailability = (value) => {
    if (value === null || value === undefined) return 'Unavailable';
    if (typeof value !== 'string') return 'Unavailable';
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return 'Unavailable';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const skillBadges = user.skills.split(',').map(skill => {
    const match = skill.match(/(.*?)\((.*?)\)/);
    const label = match ? match[1] : skill;
    const prof = match ? match[2] : "Intermediate";
    return `<span class="skill-tag">${label} <span style="font-size:0.8em;opacity:.7;">[${prof}]</span></span>`;
  }).join(' ');

  let endorsements = {};
  try {
    endorsements = user.endorsements ? JSON.parse(user.endorsements) : {};
  } catch (e) {
    console.warn(`Error parsing endorsements for user ${user.email}:`, e);
    endorsements = {};
  }

  const endorsementDisplay = Object.keys(endorsements).length ?
    Object.entries(endorsements).map(([skill, count]) =>
      `<span style="color:var(--primary-color);">${skill}: <span class="endorsements">${count} <i class="fa fa-thumbs-up" aria-hidden="true"></i></span>`
    ).join(' | ') :
    '<span style="color:#888;">No endorsements yet</span>';

  const isCurrentUser = user.email === appState.currentUserEmail;

  return `
    <div class="team-member-card" role="listitem">
      ${user.image_url ? `<img src="${user.image_url}" alt="${user.first_name} ${user.last_name}" loading="lazy" />` : ''}
      <div class="member-name">${user.first_name} ${user.last_name}</div>
      <div class="member-email" style="color:##FFC107; font-size:0.9em; margin:3px 0;">${user.email}</div>
      ${user.Bio ? `<div style="color:var(--primary-color);font-size:.96em;margin:3px 0;">${user.Bio}</div>` : ''}
      <div class="user-status">Status: ${cleanAvailability(user.Availability)}</div>
      <div class="profile-section skill-tags">${skillBadges}</div>
      <div class="profile-section">${endorsementDisplay}</div>
      <button class="endorse-btn" data-email="${user.email}" ${isCurrentUser ? 'disabled' : ''} aria-label="Endorse ${user.first_name} ${user.last_name}">
        + Endorse
      </button>
    </div>
  `;
}
