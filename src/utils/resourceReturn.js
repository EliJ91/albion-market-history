export const GENERAL_HIDEOUT_BONUSES = [0, 6, 11, 15, 18, 20, 22, 24, 26];

const SPECIALIZED_POWER_BONUSES = [0, 9.75, 18.5, 26.25, 33, 38.75, 44.5, 50.25, 56];

export const LOCATION_PRESETS = {
  custom: { label: 'Custom production bonus', bonus: 0 },
  royalCity: { label: 'Royal city', bonus: 18 },
  royalCitySpecialized: { label: 'Royal city with local bonus', bonus: 33 },
  royalIsland: { label: 'Royal island', bonus: 0 },
  royalIslandSpecialized: { label: 'Royal island with local bonus', bonus: 15 },
  outlandsRest: { label: 'Outlands rest', bonus: 15 },
  roadsHideout: { label: 'Roads hideout refining', bonus: 10 },
  hideoutGeneral: { label: 'Hideout general crafting', hideoutGeneral: true },
  hideoutSpecialized: { label: 'Hideout specialized crafting', hideoutSpecialized: true },
};

export function getBaseProductionBonus({ location, customBonus, powerLevel, zoneQuality }) {
  const preset = LOCATION_PRESETS[location] || LOCATION_PRESETS.custom;
  const powerIndex = Math.max(1, Math.min(9, Number(powerLevel) || 1)) - 1;
  const quality = Math.max(1, Math.min(6, Number(zoneQuality) || 1));

  if (preset.hideoutGeneral) return GENERAL_HIDEOUT_BONUSES[powerIndex];
  if (preset.hideoutSpecialized) return 1 + ((quality - 1) * 5) + SPECIALIZED_POWER_BONUSES[powerIndex];
  if (location === 'custom') return Math.max(0, Number(customBonus) || 0);
  return preset.bonus;
}

export function calculateResourceReturnRate(productionBonus) {
  const bonus = Math.max(0, Number(productionBonus) || 0);
  return (1 - (1 / (1 + (bonus / 100)))) * 100;
}

export function calculateScenario(scenario) {
  const baseBonus = getBaseProductionBonus(scenario);
  const totalBonus = baseBonus
    + (scenario.focus ? 59 : 0)
    + (Number(scenario.dailyBonus) || 0)
    + (Number(scenario.extraBonus) || 0);

  return {
    baseBonus,
    totalBonus,
    rrr: calculateResourceReturnRate(totalBonus),
  };
}
