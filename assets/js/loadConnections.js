// loadConnections.js
import { supabaseClient } from './supabaseClient.js';
import { generateUserCardHTML, attachEndorseButtons } from './cardRenderer.js';
import { DOMElements } from './globals.js';

export async function searchBySkills(requiredSkills) {
  try {
    const { data, error } = await supabaseClient
      .from('community')
      .select('*')
      .contains('skills', requiredSkills);

    if (error) throw error;

    DOMElements.cardContainer.innerHTML = '';
    for (const user of data) {
      const cardHTML = await generateUserCardHTML(user);
      DOMElements.cardContainer.insertAdjacentHTML('beforeend', cardHTML);
    }
    attachEndorseButtons();
  } catch (err) {
    console.error('[SearchBySkills]', err);
    DOMElements.cardContainer.innerHTML = '<p>Error loading users.</p>';
  }
}

export async function searchByName(name) {
  try {
    const { data, error } = await supabaseClient
      .from('community')
      .select('*')
      .ilike('name', `%${name}%`);

    if (error) throw error;

    DOMElements.cardContainer.innerHTML = '';
    for (const user of data) {
      const cardHTML = await generateUserCardHTML(user);
      DOMElements.cardContainer.insertAdjacentHTML('beforeend', cardHTML);
    }
    attachEndorseButtons();
  } catch (err) {
    console.error('[SearchByName]', err);
    DOMElements.cardContainer.innerHTML = '<p>Error loading users.</p>';
  }
}
